// backend/src/controllers/facturaController.js
const Factura = require('../models/Factura');
const DetalleFactura = require('../models/DetalleFactura');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');
const twilio = require('twilio');
const { numeroALetras } = require('../helpers/numeroALetras');
const {TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_WHATSAPP_NUMBER} =require('../config/config')
const EmailHelper = require('../helpers/emailHelper');
const MHAuthHelper = require('../helpers/mhAuthHelper');
const DTEJsonBuilder = require('../helpers/dteJsonBuilder');
const DTEFirmaHelper = require('../helpers/dteFirmaHelper');
const { generarUUID } = require('../helpers/uuidHelper');
const InventoryMovement = require('../models/InventoryMovement');
const axios = require('axios');
const QRCode = require('qrcode');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { verificarLimite, incrementarConsumo } = require('../helpers/consumoHelper');

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function calcularTotalesFactura(detalles, descuentoGlobal = 0, intereses = 0, retencion = 0, percepcion = 0) {
    let subtotalSumas = 0;
    let iva13 = 0;
    let iva0 = 0;
    let ivaNoSujeto = 0;

    for (const d of detalles) {
        const cant = parseFloat(d.cantidad) || 0;
        const precio = parseFloat(d.precio_unitario) || 0;
        const subtotal = cant * precio;
        const descItem = parseFloat(d.descuento_item) || 0;
        const subtotalConDescuento = subtotal - descItem;

        if (d.tipo_venta === 'Gravado') {
            iva13 += subtotalConDescuento * 0.13;
            d.iva = subtotalConDescuento * 0.13;
        } else if (d.tipo_venta === 'Exento') {
            iva0 += subtotalConDescuento;
            d.iva = 0;
        } else if (d.tipo_venta === 'No_Sujeto') {
            ivaNoSujeto += subtotalConDescuento;
            d.iva = 0;
        }
        subtotalSumas += subtotalConDescuento;
        d.subtotal = subtotalConDescuento;
    }

    const total = subtotalSumas - (descuentoGlobal || 0) + iva13 + (intereses || 0) - (retencion || 0) + (percepcion || 0);
    return {
        subtotal_sumas: subtotalSumas,
        iva_13: iva13,
        iva_0: iva0,
        iva_no_sujeto: ivaNoSujeto,
        total_pagar: total,
    };
}

function formatearNumeroWhatsApp(numero) {
    if (!numero) return null;
    const limpio = numero.replace(/\s|-|\./g, '');
    if (limpio.startsWith('+')) return limpio;
    if (/^\d{8}$/.test(limpio)) return `+503${limpio}`;
    if (/^503\d{8}$/.test(limpio)) return `+${limpio}`;
    if (/^503\d{7}$/.test(limpio)) return `+${limpio}`;
    if (/^\d{10}$/.test(limpio) && limpio.startsWith('503')) return `+${limpio}`;
    return `+${limpio}`;
}

// ============================================================
// 1. OBTENER FACTURAS
// ============================================================
exports.obtenerFacturas = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const { search, mes, anio, cliente_id, estado, tipo_documento, condicion_operacion, solo_con_vencimiento, solo_pendientes, page = 1, limit = 10 } = req.query;

        const filters = {};
        if (search) filters.search = search;
        if (mes) filters.mes = parseInt(mes);
        if (anio) filters.anio = parseInt(anio);
        if (cliente_id) filters.cliente_id = parseInt(cliente_id);
        if (estado) filters.estado = estado;
        if (tipo_documento) filters.tipo_documento = tipo_documento;
        if (condicion_operacion) filters.condicion_operacion = condicion_operacion;
        if (solo_con_vencimiento === 'true') filters.solo_con_vencimiento = true;
        if (solo_pendientes === 'true') filters.solo_pendientes = true;

        const result = await Factura.findAll(organizacion_id, filters, page, limit);
        res.json(result);
    } catch (error) {
        console.error('❌ Error al obtener facturas:', error);
        res.status(500).json({ message: 'Error al obtener facturas', error: error.message });
    }
};

// ============================================================
// 2. OBTENER FACTURA POR ID
// ============================================================
exports.obtenerFacturaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const organizacion_id = req.organizacion_id;
        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) return res.status(404).json({ message: 'Factura no encontrada' });
        const detalles = await DetalleFactura.findByFacturaId(id);
        // Agregar nombre del usuario desde la factura
        const [usuario] = await pool.query(
            'SELECT nombre FROM usuarios WHERE id = ?',
            [factura.usuario_id]
        );
        res.json({ 
            ...factura, 
            detalles,
            usuario_nombre: usuario.length > 0 ? usuario[0].nombre : 'N/A'
        });
    } catch (error) {
        console.error('❌ Error al obtener factura:', error);
        res.status(500).json({ message: 'Error al obtener factura', error: error.message });
    }
};

// ============================================================
// 3. CREAR FACTURA (CORREGIDO)
// ============================================================
exports.crearFactura = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const organizacion_id = req.organizacion_id;
    
    // Obtener usuario_id
    let usuario_id = req.usuario_id;
    if (!usuario_id) {
      const [admin] = await connection.query(
        'SELECT id FROM usuarios WHERE organizacion_id = ? AND rol = "Admin" LIMIT 1',
        [organizacion_id]
      );
      usuario_id = admin.length > 0 ? admin[0].id : (await connection.query('SELECT id FROM usuarios WHERE organizacion_id = ? LIMIT 1', [organizacion_id]))[0]?.id || 1;
    }

    const { detalles, ...facturaData } = req.body;

    if (!facturaData.cliente_id) {
      await connection.rollback();
      return res.status(400).json({ message: 'El cliente es obligatorio' });
    }
    if (!detalles || detalles.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Debe agregar al menos un producto' });
    }

    // ============================================================
    // VERIFICAR LÍMITE DE FACTURAS DEL PLAN
    // ============================================================
    const limiteCheck = await verificarLimite(organizacion_id, 'factura');
    if (!limiteCheck.allowed) {
      await connection.rollback();
      return res.status(400).json({ message: limiteCheck.message });
    }

    // ============================================================
    // PASO 1: VALIDAR STOCK Y OBTENER DATOS DE PRODUCTOS
    // ============================================================
    const productosData = [];
    for (const d of detalles) {
      const [producto] = await connection.query(
        'SELECT id, nombre, stock_actual, es_kit FROM productos WHERE id = ? AND organizacion_id = ?',
        [d.producto_id, organizacion_id]
      );
      if (producto.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: `Producto ID ${d.producto_id} no encontrado` });
      }
      if (producto[0].stock_actual < d.cantidad) {
        await connection.rollback();
        return res.status(400).json({
          message: `Stock insuficiente para "${producto[0].nombre}". Disponible: ${producto[0].stock_actual}, solicitado: ${d.cantidad}`
        });
      }
      productosData.push({
        id: d.producto_id,
        nombre: producto[0].nombre,
        stock_actual: producto[0].stock_actual,
        es_kit: producto[0].es_kit,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario || 0,
        descuento_item: d.descuento_item || 0,
        tipo_venta: d.tipo_venta || 'Gravado',
        producto_detalle: d,
      });
    }

    // ============================================================
    // PASO 2: VALIDAR STOCK DE COMPONENTES DE KITS
    // ============================================================
    for (const pData of productosData) {
      if (pData.es_kit === 1) {
        const componentes = await Producto.getComponentes(pData.id, organizacion_id);
        for (const comp of componentes) {
          const [compStock] = await connection.query(
            'SELECT stock_actual, nombre FROM productos WHERE id = ? AND organizacion_id = ?',
            [comp.producto_componente_id, organizacion_id]
          );
          const cantidadNecesaria = pData.cantidad * comp.cantidad;
          if (compStock.length === 0 || compStock[0].stock_actual < cantidadNecesaria) {
            await connection.rollback();
            return res.status(400).json({
              message: `Stock insuficiente para componente "${compStock[0]?.nombre || comp.componente_nombre}". Disponible: ${compStock[0]?.stock_actual || 0}, necesarios: ${cantidadNecesaria}`
            });
          }
          if (!pData.componentes) pData.componentes = [];
          pData.componentes.push({
            componente_id: comp.producto_componente_id,
            cantidad_necesaria: cantidadNecesaria,
            nombre: compStock[0]?.nombre || comp.componente_nombre,
            stock_actual: compStock[0]?.stock_actual || 0,
            cantidad_por_kit: comp.cantidad,
          });
        }
      }
    }

    // ============================================================
    // PASO 3: OBTENER DATOS DEL CLIENTE
    // ============================================================
    const cliente = await Cliente.findById(facturaData.cliente_id, organizacion_id);
    if (!cliente) {
      await connection.rollback();
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    let medioPago = facturaData.medio_pago;
    if (typeof medioPago === 'string') {
      try { medioPago = JSON.parse(medioPago); } catch { medioPago = [medioPago]; }
    }
    if (!Array.isArray(medioPago)) medioPago = [];

    // ============================================================
    // PASO 4: CALCULAR TOTALES
    // ============================================================
    const { subtotal_sumas, iva_13, iva_0, iva_no_sujeto, total_pagar } = calcularTotalesFactura(
      detalles,
      facturaData.descuento || 0,
      facturaData.intereses_mora || 0,
      facturaData.retencion_1 || 0,
      facturaData.percepcion_1 || 0
    );

    // ============================================================
    // PASO 5: GENERAR NÚMERO CORRELATIVO
    // ============================================================
    const [count] = await connection.query(
      'SELECT COUNT(*) AS total FROM facturas WHERE organizacion_id = ?',
      [organizacion_id]
    );
    const numero = `FAC-${String(count[0].total + 1).padStart(6, '0')}`;

    // ============================================================
    // PASO 6: INSERTAR FACTURA
    // ============================================================
    const nuevaFactura = {
      organizacion_id,
      bodega_id: facturaData.bodega_id || null,
      usuario_id,
      cliente_id: facturaData.cliente_id,
      tipo_documento: facturaData.tipo_documento || 'FAF',
      numero_correlativo: numero,
      subtotal_sumas,
      descuento: facturaData.descuento || 0,
      iva_13,
      iva_0,
      iva_no_sujeto,
      retencion_1: facturaData.retencion_1 || 0,
      percepcion_1: facturaData.percepcion_1 || 0,
      intereses_mora: facturaData.intereses_mora || 0,
      total_pagar,
      estado: facturaData.estado || 'Emitida',
      condicion_operacion: facturaData.condicion_operacion || 'Contado',
      plazo_credito: facturaData.plazo_credito || null,
      fecha_vencimiento: facturaData.fecha_vencimiento || null,
      medio_pago: medioPago,
      observaciones: facturaData.observaciones || null,
      uuid_dte: facturaData.uuid_dte || null,
      numero_control: facturaData.numero_control || null,
      cliente_nit: cliente.nit,
      cliente_dui: cliente.dui,
      cliente_nombre: cliente.nombre,
    };

    const facturaId = await Factura.create(nuevaFactura, connection);

    // ============================================================
    // PASO 7: INSERTAR DETALLES Y ACTUALIZAR STOCK (CON MOVIMIENTOS)
    // ============================================================
    if (detalles && detalles.length > 0) {
      // Insertar detalles
      await DetalleFactura.createMany(facturaId, detalles, connection);

      // Si la factura NO es borrador, descontar stock y registrar movimientos
      if (facturaData.estado !== 'Borrador') {
        // 7.1: Descontar productos principales
        for (const pData of productosData) {
          const stockAnterior = pData.stock_actual;
          const nuevaCantidad = stockAnterior - pData.cantidad;

          await connection.query(
            'UPDATE productos SET stock_actual = ? WHERE id = ? AND organizacion_id = ?',
            [nuevaCantidad, pData.id, organizacion_id]
          );

          // Registrar movimiento de inventario (Salida)
          await InventoryMovement.create({
            organizacion_id,
            producto_id: pData.id,
            bodega_id: facturaData.bodega_id || null,
            tipo_movimiento: 'Salida',
            cantidad: pData.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: nuevaCantidad,
            referencia_tipo: 'Factura',
            referencia_id: facturaId,
            costo_unitario: pData.precio_unitario || 0,
            observacion: `Factura #${numero}`,
            usuario_id: usuario_id,
          }, connection);

          // 7.2: Descontar componentes si es kit
          if (pData.es_kit === 1 && pData.componentes) {
            for (const comp of pData.componentes) {
              const compStockAnterior = comp.stock_actual;
              const compNuevaCantidad = compStockAnterior - comp.cantidad_necesaria;

              await connection.query(
                'UPDATE productos SET stock_actual = ? WHERE id = ? AND organizacion_id = ?',
                [compNuevaCantidad, comp.componente_id, organizacion_id]
              );

              await InventoryMovement.create({
                organizacion_id,
                producto_id: comp.componente_id,
                bodega_id: facturaData.bodega_id || null,
                tipo_movimiento: 'Salida',
                cantidad: comp.cantidad_necesaria,
                stock_anterior: compStockAnterior,
                stock_nuevo: compNuevaCantidad,
                referencia_tipo: 'Factura_Kit',
                referencia_id: facturaId,
                costo_unitario: 0,
                observacion: `Componente de kit para factura #${numero} (Producto: ${pData.nombre})`,
                usuario_id: usuario_id,
              }, connection);
            }
          }
        }
      }
    }

    // ============================================================
    // PASO 8: INCREMENTAR CONSUMO DE FACTURAS
    // ============================================================
    await incrementarConsumo(organizacion_id, 'factura');

    await connection.commit();
    res.status(201).json({ message: 'Factura creada exitosamente', id: facturaId, numero });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al crear factura:', error);
    res.status(500).json({ message: 'Error al crear factura', error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// 4. ACTUALIZAR FACTURA
// ============================================================
exports.editarFactura = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const usuario_id = req.user?.id || 1;
    const { detalles, ...facturaData } = req.body;

    const facturaActual = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!facturaActual) {
      await connection.rollback();
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    if (facturaActual.estado === 'Pagada' || facturaActual.estado === 'Anulada') {
      await connection.rollback();
      return res.status(400).json({ message: 'No se puede editar una factura pagada o anulada' });
    }

    // Recalcular totales
    const { subtotal_sumas, iva_13, iva_0, iva_no_sujeto, total_pagar } = calcularTotalesFactura(
      detalles || [],
      facturaData.descuento || 0,
      facturaData.intereses_mora || 0,
      facturaData.retencion_1 || 0,
      facturaData.percepcion_1 || 0
    );

    await Factura.update(id, organizacion_id, {
      ...facturaData,
      subtotal_sumas,
      iva_13,
      iva_0,
      iva_no_sujeto,
      total_pagar,
    });

    // Revertir stock y movimientos anteriores (si no era borrador)
    const oldDetalles = await DetalleFactura.findByFacturaId(id);
    if (facturaActual.estado !== 'Borrador' && facturaActual.estado !== 'Anulada') {
      for (const d of oldDetalles) {
        // Revertir stock (incrementar)
        await Producto.incrementStock(d.producto_id, organizacion_id, d.cantidad);
        // Eliminar movimientos antiguos de esta factura
        await connection.query(
          'DELETE FROM movimientos_inventario WHERE referencia_tipo = "Factura" AND referencia_id = ? AND producto_id = ?',
          [id, d.producto_id]
        );
        // Revertir componentes si es kit
        const [producto] = await connection.query(
          'SELECT es_kit FROM productos WHERE id = ? AND organizacion_id = ?',
          [d.producto_id, organizacion_id]
        );
        if (producto.length > 0 && producto[0].es_kit === 1) {
          const componentes = await Producto.getComponentes(d.producto_id, organizacion_id);
          for (const comp of componentes) {
            await Producto.incrementStock(comp.producto_componente_id, organizacion_id, d.cantidad * comp.cantidad);
            await connection.query(
              'DELETE FROM movimientos_inventario WHERE referencia_tipo = "FacturaKit" AND referencia_id = ? AND producto_id = ?',
              [id, comp.producto_componente_id]
            );
          }
        }
      }
    }

    // Eliminar detalles viejos
    await DetalleFactura.deleteByFacturaId(id, connection);

    // Insertar nuevos detalles y descontar nuevo stock
    if (detalles && detalles.length > 0) {
      await DetalleFactura.createMany(id, detalles, connection);
      if (facturaData.estado !== 'Borrador') {
        for (const d of detalles) {
          const producto = await Producto.findById(d.producto_id, organizacion_id);
          const stockAnterior = producto ? producto.stock_actual : 0;
          await Producto.decrementStock(d.producto_id, organizacion_id, d.cantidad);
          await InventoryMovement.create({
            organizacion_id,
            producto_id: d.producto_id,
            bodega_id: facturaData.bodega_id || null,
            tipo_movimiento: 'Salida',
            cantidad: d.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockAnterior - parseFloat(d.cantidad),
            referencia_tipo: 'Factura',
            referencia_id: id,
            costo_unitario: d.precio_unitario || 0,
            observacion: `Factura #${facturaActual.numero_correlativo}`,
            usuario_id: usuario_id,
          });

          const [productoInfo] = await connection.query(
            'SELECT es_kit FROM productos WHERE id = ? AND organizacion_id = ?',
            [d.producto_id, organizacion_id]
          );
          if (productoInfo.length > 0 && productoInfo[0].es_kit === 1) {
            const componentes = await Producto.getComponentes(d.producto_id, organizacion_id);
            for (const comp of componentes) {
              const compProducto = await Producto.findById(comp.producto_componente_id, organizacion_id);
              const compStockAnterior = compProducto ? compProducto.stock_actual : 0;
              const cantidadComp = d.cantidad * comp.cantidad;
              await Producto.decrementStock(comp.producto_componente_id, organizacion_id, cantidadComp);
              await InventoryMovement.create({
                organizacion_id,
                producto_id: comp.producto_componente_id,
                bodega_id: facturaData.bodega_id || null,
                tipo_movimiento: 'Salida',
                cantidad: cantidadComp,
                stock_anterior: compStockAnterior,
                stock_nuevo: compStockAnterior - cantidadComp,
                referencia_tipo: 'FacturaKit',
                referencia_id: id,
                costo_unitario: comp.precio_unitario || 0,
                observacion: `Kit #${facturaActual.numero_correlativo} - Componente ${comp.componente_nombre}`,
                usuario_id: usuario_id,
              });
            }
          }
        }
      }
    }

    await connection.commit();
    res.json({ message: 'Factura actualizada exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al editar factura:', error);
    res.status(500).json({ message: 'Error al editar factura', error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// 5. CAMBIAR ESTADO
// ============================================================
exports.cambiarEstadoFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const organizacion_id = req.organizacion_id;

        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) return res.status(404).json({ message: 'Factura no encontrada' });

        if (factura.estado === 'Anulada') {
            return res.status(400).json({ message: 'Factura ya está anulada' });
        }
        if (estado === 'Pagada' && factura.estado === 'Pagada') {
            return res.status(400).json({ message: 'Factura ya está pagada' });
        }

        await Factura.changeStatus(id, organizacion_id, estado);
        res.json({ message: `Estado cambiado a ${estado}` });
    } catch (error) {
        console.error('❌ Error al cambiar estado:', error);
        res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
    }
};

// ============================================================
// 6. ANULAR FACTURA
// ============================================================
exports.anularFactura = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      await connection.rollback();
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    if (factura.estado === 'Anulada') {
      await connection.rollback();
      return res.status(400).json({ message: 'Factura ya está anulada' });
    }
    if (factura.estado === 'Pagada') {
      await connection.rollback();
      return res.status(400).json({ message: 'No se puede anular una factura pagada' });
    }

    if (factura.estado !== 'Borrador') {
      const detalles = await DetalleFactura.findByFacturaId(id);
      for (const d of detalles) {
        // Revertir stock (incrementar)
        await Producto.incrementStock(d.producto_id, organizacion_id, d.cantidad);
        // Eliminar movimientos de esta factura
        await connection.query(
          'DELETE FROM movimientos_inventario WHERE referencia_tipo = "Factura" AND referencia_id = ? AND producto_id = ?',
          [id, d.producto_id]
        );
        // Revertir componentes si es kit
        const [producto] = await connection.query(
          'SELECT es_kit FROM productos WHERE id = ? AND organizacion_id = ?',
          [d.producto_id, organizacion_id]
        );
        if (producto.length > 0 && producto[0].es_kit === 1) {
          const componentes = await Producto.getComponentes(d.producto_id, organizacion_id);
          for (const comp of componentes) {
            await Producto.incrementStock(comp.producto_componente_id, organizacion_id, d.cantidad * comp.cantidad);
            await connection.query(
              'DELETE FROM movimientos_inventario WHERE referencia_tipo = "FacturaKit" AND referencia_id = ? AND producto_id = ?',
              [id, comp.producto_componente_id]
            );
          }
        }
      }
    }

    await Factura.softDelete(id, organizacion_id);
    await connection.commit();
    res.json({ message: 'Factura anulada exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al anular factura:', error);
    res.status(500).json({ message: 'Error al anular factura', error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// 7. DASHBOARD
// ============================================================
exports.obtenerDashboardFacturacion = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const { mes, anio } = req.query;
        const mesActual = mes ? parseInt(mes) : new Date().getMonth() + 1;
        const anioActual = anio ? parseInt(anio) : new Date().getFullYear();

        const kpis = await Factura.getKPIs(organizacion_id, mesActual, anioActual);
        const evolucion = await Factura.getEvolucionVentas(organizacion_id, anioActual);
        const comparacionPagos = await Factura.getComparacionPagos(organizacion_id, anioActual);
        const alertas = await Factura.getAlertasVencimiento(organizacion_id);
        const topClientes = await Factura.getTopClientes(organizacion_id, anioActual);
        const distribucion = await Factura.getDistribucionTipoDocumento(organizacion_id, mesActual, anioActual);

        res.json({
            kpis,
            evolucion,
            comparacionPagos,
            alertas,
            topClientes,
            distribucion,
            periodo: { mes: mesActual, anio: anioActual },
        });
    } catch (error) {
        console.error('❌ Error al obtener dashboard:', error);
        res.status(500).json({ message: 'Error al obtener dashboard', error: error.message });
    }
};

// ============================================================
// 8. EXPORTAR FACTURAS FILTRADAS
// ============================================================
exports.exportarFacturasFiltradas = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const { search, mes, anio, cliente_id, estado, tipo_documento, condicion_operacion } = req.query;

        const filters = {};
        if (search) filters.search = search;
        if (mes) filters.mes = parseInt(mes);
        if (anio) filters.anio = parseInt(anio);
        if (cliente_id) filters.cliente_id = parseInt(cliente_id);
        if (estado) filters.estado = estado;
        if (tipo_documento) filters.tipo_documento = tipo_documento;
        if (condicion_operacion) filters.condicion_operacion = condicion_operacion;

        const result = await Factura.findAll(organizacion_id, filters, 1, 99999);
        const facturas = result.facturas || [];

        if (facturas.length === 0) {
            return res.status(404).json({ message: 'No hay facturas con los filtros aplicados' });
        }

        const data = facturas.map(f => ({
            'N° Correlativo': f.numero_correlativo,
            'Cliente': f.cliente_nombre,
            'NIT': f.cliente_nit,
            'Tipo Doc.': f.tipo_documento,
            'Subtotal': parseFloat(f.subtotal_sumas).toFixed(2),
            'IVA 13%': parseFloat(f.iva_13).toFixed(2),
            'Total': parseFloat(f.total_pagar).toFixed(2),
            'Estado': f.estado,
            'Condición': f.condicion_operacion,
            'Fecha': f.creado_en,
            'Vencimiento': f.fecha_vencimiento || '',
        }));

        const headers = Object.keys(data[0]);
        let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
        for (const row of data) {
            csv += headers.map(h => {
                let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
                val = String(val);
                if (val.includes(';') || val.includes('\n') || val.includes('"')) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(';') + '\n';
        }

        const filename = `facturas_filtradas_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Error al exportar facturas:', error);
        res.status(500).json({ message: 'Error al exportar', error: error.message });
    }
};

// ============================================================
// 9. EXPORTAR TODAS LAS FACTURAS DE UN AÑO (NUEVO)
// ============================================================
exports.exportarTodasFacturas = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const { anio, mes } = req.query;
        if (!anio) return res.status(400).json({ message: 'El año es requerido' });

        const filters = { anio: parseInt(anio) };
        if (mes) filters.mes = parseInt(mes);

        const result = await Factura.findAll(organizacion_id, filters, 1, 99999);
        const facturas = result.facturas || [];

        if (facturas.length === 0) {
            return res.status(404).json({ message: 'No hay facturas para el año seleccionado' });
        }

        const data = facturas.map(f => ({
            'N° Correlativo': f.numero_correlativo,
            'Cliente': f.cliente_nombre,
            'NIT': f.cliente_nit || '',
            'Tipo Doc.': f.tipo_documento,
            'Subtotal': parseFloat(f.subtotal_sumas).toFixed(2),
            'IVA 13%': parseFloat(f.iva_13).toFixed(2),
            'Total': parseFloat(f.total_pagar).toFixed(2),
            'Estado': f.estado,
            'Condición': f.condicion_operacion || 'Contado',
            'Fecha': f.creado_en ? new Date(f.creado_en).toLocaleDateString('es-SV') : '',
            'Vencimiento': f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString('es-SV') : '',
        }));

        const headers = Object.keys(data[0]);
        let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
        for (const row of data) {
            csv += headers.map(h => {
                let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
                val = String(val);
                if (val.includes(';') || val.includes('\n') || val.includes('"')) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(';') + '\n';
        }

        const filename = mes 
            ? `facturas_${mes}_${anio}.csv` 
            : `facturas_todas_${anio}.csv`;
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Error al exportar todas las facturas:', error);
        res.status(500).json({ message: 'Error al exportar', error: error.message });
    }
};

// ============================================================
// 10. GENERAR PDF
// ============================================================
exports.generarPDFFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const organizacion_id = req.organizacion_id;

        // Obtener factura, detalles, organización y usuario
        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) return res.status(404).json({ message: 'Factura no encontrada' });
        const detalles = await DetalleFactura.findByFacturaId(id);

        // Obtener datos de la organización
        const [orgRows] = await pool.query(
            `SELECT nombre_empresa, nombre_comercial, nit, nrc, direccion, telefono, correo_contacto
             FROM organizaciones WHERE id = ?`,
            [organizacion_id]
        );
        const organizacion = orgRows[0] || {};

        // Obtener nombre del usuario que atendió
        const [userRows] = await pool.query(
            'SELECT nombre FROM usuarios WHERE id = ?',
            [factura.usuario_id]
        );
        const usuarioNombre = userRows.length > 0 ? userRows[0].nombre : 'N/A';

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=factura_${factura.numero_correlativo}.pdf`);
            res.send(pdfData);
        });

        const primaryColor = '#1a1a2e';
        const textColor = '#333333';
        const lightGray = '#f5f5f5';
        
        // ===== LOGO DE LA ORGANIZACIÓN (A LA IZQUIERDA) =====
        const [orgLogo] = await pool.query('SELECT logo_url FROM organizaciones WHERE id = ?', [organizacion_id]);
        const logoUrl = orgLogo[0]?.logo_url;
        
        let alturaLogo = 40; 

        if (logoUrl) {
          // Ajustamos la ruta para salir de 'src/controllers' hacia la raíz de 'backend'
          const logoPath = path.join(__dirname, '../..', logoUrl);
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 40, { fit: [120, 60] });
            alturaLogo = 105; 
          }
        }

        // Encabezado
        doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor);
        doc.text('FACTURA', 350, 40, { width: 205, align: 'right' });
        doc.fontSize(10).fillColor('#666666');
        doc.text(`N° ${factura.numero_correlativo}`, 350, 65, { width: 205, align: 'right' });
        const fechaFormateada = new Date(factura.creado_en).toLocaleDateString('es-SV');
        doc.text(`Fecha: ${fechaFormateada}`, 350, 80, { width: 205, align: 'right' });

        // ===== DATOS DEL EMISOR (Dinámicos) =====
        doc.moveDown(2);
        const emisorTop = Math.max(doc.y + 25, alturaLogo, 115);
        doc.y = emisorTop;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
        doc.text('EMISOR', 40, emisorTop);
        doc.font('Helvetica').fontSize(9).fillColor('#555555');
        doc.text(organizacion.nombre_empresa || 'Empresa', 40, doc.y);
        if (organizacion.nit) doc.text(`NIT: ${organizacion.nit}`, 40, doc.y);
        if (organizacion.nrc) doc.text(`NRC: ${organizacion.nrc}`, 40, doc.y);
        if (organizacion.direccion) doc.text(organizacion.direccion, 40, doc.y);
        if (organizacion.telefono) doc.text(`Tel: ${organizacion.telefono}`, 40, doc.y);
        if (organizacion.correo_contacto) doc.text(`Email: ${organizacion.correo_contacto}`, 40, doc.y);

        // "Atendido por" debajo del emisor
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
        doc.text('Atendido por:', 40, doc.y + 5);
        doc.font('Helvetica').fillColor('#555555');
        doc.text(usuarioNombre, 120, doc.y - 2);

        const emisorBottom = doc.y + 5;

        // ===== DATOS DEL CLIENTE =====
        doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
        doc.text('CLIENTE', 300, emisorTop);
        doc.font('Helvetica').fontSize(9).fillColor('#555555');
        doc.text(factura.cliente_nombre || 'Cliente', 300, doc.y);
        if (factura.cliente_nit) doc.text(`NIT: ${factura.cliente_nit}`, 300, doc.y);
        if (factura.cliente_dui) doc.text(`DUI: ${factura.cliente_dui}`, 300, doc.y);
        if (factura.cliente_nrc) doc.text(`NRC: ${factura.cliente_nrc}`, 300, doc.y);
        if (factura.cliente_direccion) doc.text(factura.cliente_direccion, 300, doc.y);
        const clienteBottom = doc.y;

        // ===== INFORMACIÓN ADICIONAL =====
        const infoY = Math.max(emisorBottom, clienteBottom) + 20;
        doc.y = infoY;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
        doc.text('Tipo Documento:', 40, infoY);
        doc.font('Helvetica').text(factura.tipo_documento, 145, infoY);
        doc.font('Helvetica-Bold').text('Condición:', 300, infoY);
        doc.font('Helvetica').text(factura.condicion_operacion || 'Contado', 360, infoY);
        if (factura.fecha_vencimiento) {
            doc.font('Helvetica-Bold').text('Vencimiento:', 300, infoY + 15);
            doc.font('Helvetica').text(new Date(factura.fecha_vencimiento).toLocaleDateString('es-SV'), 360, infoY + 15);
        }
        if (factura.uuid_dte) {
            doc.font('Helvetica-Bold').text('UUID:', 40, infoY + 15);
            doc.font('Helvetica').text(factura.uuid_dte, 145, infoY + 15);
        }

        // ===== TABLA DE PRODUCTOS =====
        const tableTop = doc.y + (factura.uuid_dte ? 25 : 20);
        const colX = [40, 80, 270, 340, 415, 470];
        const colWidths = [40, 190, 70, 75, 55, 85];

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
        doc.rect(40, tableTop, 515, 20).fill(primaryColor);
        doc.fillColor('#ffffff');
        doc.text('CANT.', colX[0] + 5, tableTop + 5);
        doc.text('PRODUCTO', colX[1] + 10, tableTop + 5);
        doc.text('PRECIO UNIT.', colX[2], tableTop + 5, { width: colWidths[2], align: 'right' });
        doc.text('SUBTOTAL', colX[3], tableTop + 5, { width: colWidths[3], align: 'right' });
        doc.text('IVA', colX[4], tableTop + 5, { width: colWidths[4], align: 'right' });
        doc.text('TOTAL', colX[5], tableTop + 5, { width: colWidths[5], align: 'right' });

        let rowY = tableTop + 25;
        let subtotalTotal = 0;
        let ivaTotal = 0;

        detalles.forEach((d, index) => {
            const cantidad = parseFloat(d.cantidad) || 0;
            const precio = parseFloat(d.precio_unitario) || 0;
            const subtotal = cantidad * precio - (parseFloat(d.descuento_item) || 0);
            const iva = parseFloat(d.iva) || 0;
            const totalItem = subtotal + iva;

            subtotalTotal += subtotal;
            ivaTotal += iva;

            if (index % 2 === 0) doc.rect(40, rowY - 3, 515, 18).fill(lightGray);
            doc.fillColor('#333333').font('Helvetica').fontSize(8.5);
            doc.text(cantidad.toString(), colX[0] + 5, rowY);
            doc.text(d.producto_nombre || 'Producto', colX[1] + 10, rowY, { width: colWidths[1], truncate: true });
            doc.text(`$${precio.toFixed(2)}`, colX[2], rowY, { width: colWidths[2], align: 'right' });
            doc.text(`$${subtotal.toFixed(2)}`, colX[3], rowY, { width: colWidths[3], align: 'right' });
            doc.text(`$${iva.toFixed(2)}`, colX[4], rowY, { width: colWidths[4], align: 'right' });
            doc.text(`$${totalItem.toFixed(2)}`, colX[5], rowY, { width: colWidths[5], align: 'right' });
            rowY += 20;
        });

        // ===== TOTALES =====
        const totalsY = rowY + 15;
        let currentTotalY = totalsY;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
        doc.text('Subtotal:', 370, currentTotalY, { width: 90, align: 'right' });
        doc.text(`$${subtotalTotal.toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
        currentTotalY += 15;

        if (factura.tipo_documento === 'CCF' || factura.tipo_documento === 'FAF') {
            doc.text('IVA 13%:', 370, currentTotalY, { width: 90, align: 'right' });
            doc.text(`$${ivaTotal.toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
            currentTotalY += 15;
        }

        if (parseFloat(factura.retencion_1) > 0) {
            doc.text('Retención 1%:', 370, currentTotalY, { width: 90, align: 'right' });
            doc.text(`-$${parseFloat(factura.retencion_1).toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
            currentTotalY += 15;
        }
        if (parseFloat(factura.percepcion_1) > 0) {
            doc.text('Percepción 1%:', 370, currentTotalY, { width: 90, align: 'right' });
            doc.text(`+$${parseFloat(factura.percepcion_1).toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
            currentTotalY += 15;
        }

        // ===== CÓDIGO QR (si está procesado) =====
        if (factura.codigo_generacion && factura.sello_recepcion) {
            const ambiente = factura.ambiente || '00';
            const qrUrl = `https://admin.factura.gob.sv/consultaPublica?ambiente=${ambiente}&codGen=${factura.codigo_generacion}&fechaEmi=${factura.creado_en.toISOString().split('T')[0]}`;
            const qrBuffer = await QRCode.toBuffer(qrUrl, {
                width: 100,
                margin: 2,
                errorCorrectionLevel: 'H',
            });
            doc.image(qrBuffer, 450, 650, { width: 80 });
            doc.fontSize(6).fillColor('#666666');
            doc.text('Código de verificación', 450, 735, { width: 80, align: 'center' });
            doc.text(factura.codigo_generacion, 450, 745, { width: 80, align: 'center' });
        }

        // ===== BLOQUE TOTAL =====
        doc.rect(365, currentTotalY + 5, 190, 25).fill(primaryColor);
        doc.fillColor('#ffffff');
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('TOTAL', 380, currentTotalY + 13);
        doc.text(`$${parseFloat(factura.total_pagar).toFixed(2)}`, 470, currentTotalY + 13, { width: 85, align: 'right' });

        // ===== LETRAS =====
        doc.fillColor('#333333');
        doc.font('Helvetica').fontSize(8.5);
        const totalLetras = numeroALetras(parseFloat(factura.total_pagar));
        doc.text(`SON: ${totalLetras} DÓLARES`, 40, currentTotalY + 40);

        // ===== PIE DE PÁGINA =====
        const footerY = 750;
        doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
        doc.fillColor('#9ca3af').fontSize(8);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-SV')} | Comprobante electrónico`, 40, footerY + 10);
        if (factura.uuid_dte) doc.text(`UUID: ${factura.uuid_dte}`, 40, footerY + 22);

        doc.end();
    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        res.status(500).json({ message: 'Error al generar PDF', error: error.message });
    }
};

// ============================================================
// 11. ENVIAR POR WHATSAPP
// ============================================================
exports.enviarFacturaWhatsApp = async (req, res) => {
    try {
        const { id } = req.params;
        const organizacion_id = req.organizacion_id;

        // 1. Obtener factura
        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        // 2. Obtener cliente
        const cliente = await Cliente.findById(factura.cliente_id, organizacion_id);
        if (!cliente || !cliente.telefono_whatsapp) {
            return res.status(400).json({ message: 'El cliente no tiene número de WhatsApp registrado' });
        }

        // 3. Obtener datos de la organización (para mostrar en el mensaje)
        const [orgRow] = await pool.query(
            'SELECT nombre_empresa, telefono_whatsapp FROM organizaciones WHERE id = ?',
            [organizacion_id]
        );
        const nombreEmpresa = orgRow[0]?.nombre_empresa || 'Nuestra empresa';
        const telefonoOrg = orgRow[0]?.telefono_whatsapp || 'No configurado';

        // 4. Formatear número del cliente
        const numeroCliente = formatearNumeroWhatsApp(cliente.telefono_whatsapp);
        if (!numeroCliente) {
            return res.status(400).json({ message: 'Número de teléfono inválido' });
        }

        // 5. Configurar Twilio
        const accountSid = TWILIO_ACCOUNT_SID;
        const authToken = TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = TWILIO_WHATSAPP_NUMBER; // Número del Sandbox

        if (!accountSid || !authToken || !twilioPhoneNumber) {
            return res.status(500).json({ message: 'Twilio no está configurado correctamente' });
        }

        // 6. Construir mensaje CON NOMBRE DE LA EMPRESA
        const pdfUrl = `${req.protocol}://${req.get('host')}/api/organization/facturas/${id}/pdf`;
        const mensaje = `Hola ${cliente.nombre}, tu factura de ${nombreEmpresa} N° ${factura.numero_correlativo} está lista.\nMonto: $${parseFloat(factura.total_pagar).toFixed(2)}\nDescárgala aquí: ${pdfUrl}`;

        // 7. Enviar usando Twilio
        const client = twilio(accountSid, authToken);
        const message = await client.messages.create({
            from: `whatsapp:${twilioPhoneNumber}`,  // ✅ Número del Sandbox (SIEMPRE el mismo)
            to: `whatsapp:${numeroCliente}`,        // Número del cliente
            body: mensaje,
        });

        // 8. Responder con éxito (incluyendo el número de la organización para el frontend)
        res.json({ 
            message: 'Factura enviada por WhatsApp', 
            sid: message.sid,
            desde: telefonoOrg,  // Para mostrar en el frontend
            para: numeroCliente
        });
    } catch (error) {
        console.error('❌ Error al enviar WhatsApp:', error);
        res.status(500).json({ message: 'Error al enviar mensaje', error: error.message });
    }
};

// ============================================================
// 12. OBTENER AÑOS DISPONIBLES
// ============================================================
exports.getAniosDisponibles = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const [rows] = await pool.query(
            'SELECT DISTINCT YEAR(creado_en) AS anio FROM facturas WHERE organizacion_id = ? ORDER BY anio DESC',
            [organizacion_id]
        );
        const anios = rows.map(r => r.anio);
        if (anios.length === 0) anios.push(new Date().getFullYear());
        res.json(anios);
    } catch (error) {
        console.error('❌ Error al obtener años disponibles:', error);
        res.status(500).json({ message: 'Error al obtener años', error: error.message });
    }
};

// ============================================================
// EXPORTAR EVOLUCIÓN DE VENTAS
// ============================================================
exports.exportarEvolucionVentas = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const { anio } = req.query;
        const anioActual = anio || new Date().getFullYear();
        const data = await Factura.getEvolucionVentas(organizacion_id, anioActual);
        const headers = ['Mes', 'Total Ventas', 'Contado', 'Crédito', 'Pagadas'];
        let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
        for (const row of data) {
            const nombreMes = new Date(2024, row.mes - 1).toLocaleString('es', { month: 'long' });
            csv += `${nombreMes};${row.total_ventas.toFixed(2)};${row.ventas_contado.toFixed(2)};${row.ventas_credito.toFixed(2)};${row.ventas_pagadas.toFixed(2)}\n`;
        }
        const filename = `evolucion_ventas_${anioActual}.csv`;
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Error al exportar evolución de ventas:', error);
        res.status(500).json({ message: 'Error al exportar', error: error.message });
    }
};

// ============================================================
// EXPORTAR COMPARACIÓN PAGOS
// ============================================================
exports.exportarComparacionPagos = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const { anio } = req.query;
        const anioActual = anio || new Date().getFullYear();
        const data = await Factura.getComparacionPagos(organizacion_id, anioActual);
        const headers = ['Mes', 'Pagadas', 'Pendientes'];
        let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
        for (const row of data) {
            const nombreMes = new Date(2024, row.mes - 1).toLocaleString('es', { month: 'long' });
            csv += `${nombreMes};${row.pagadas.toFixed(2)};${row.pendientes.toFixed(2)}\n`;
        }
        const filename = `comparacion_pagos_${anioActual}.csv`;
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Error al exportar comparación de pagos:', error);
        res.status(500).json({ message: 'Error al exportar', error: error.message });
    }
};

// ============================================================
// EXPORTAR DISTRIBUCIÓN POR TIPO DOCUMENTO
// ============================================================
exports.exportarDistribucionTipoDocumento = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const { mes, anio } = req.query;
        const mesActual = mes ? parseInt(mes) : new Date().getMonth() + 1;
        const anioActual = anio ? parseInt(anio) : new Date().getFullYear();
        const data = await Factura.getDistribucionTipoDocumento(organizacion_id, mesActual, anioActual);
        const headers = ['Tipo Documento', 'Total'];
        let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
        for (const row of data) {
            csv += `${row.tipo_documento};${parseFloat(row.total).toFixed(2)}\n`;
        }
        const filename = `distribucion_tipo_documento_${mesActual}_${anioActual}.csv`;
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Error al exportar distribución:', error);
        res.status(500).json({ message: 'Error al exportar', error: error.message });
    }
};

// ============================================================
// EXPORTAR TOP 5 CLIENTES
// ============================================================
exports.exportarTopClientes = async (req, res) => {
    try {
        const organizacion_id = req.organizacion_id;
        const { anio, limit = 5 } = req.query;
        const anioActual = anio || new Date().getFullYear();
        const data = await Factura.getTopClientes(organizacion_id, anioActual);
        const headers = ['Cliente', 'NIT', 'Total Compras'];
        let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
        for (const row of data) {
            csv += `${row.cliente_nombre};${row.cliente_nit || ''};${parseFloat(row.total_compras).toFixed(2)}\n`;
        }
        const filename = `top_clientes_${anioActual}.csv`;
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Error al exportar top clientes:', error);
        res.status(500).json({ message: 'Error al exportar', error: error.message });
    }
};

exports.generarTicketFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const organizacion_id = req.organizacion_id;

        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) return res.status(404).json({ message: 'Factura no encontrada' });
        const detalles = await DetalleFactura.findByFacturaId(id);

        // Obtener datos de organización y usuario
        const [orgRows] = await pool.query(
            `SELECT nombre_empresa, nit, direccion, telefono FROM organizaciones WHERE id = ?`,
            [organizacion_id]
        );
        const organizacion = orgRows[0] || {};

        const [userRows] = await pool.query(
            'SELECT nombre FROM usuarios WHERE id = ?',
            [factura.usuario_id]
        );
        const usuarioNombre = userRows.length > 0 ? userRows[0].nombre : 'N/A';

        // Ticket en formato PDF (ancho 80mm)
        const doc = new PDFDocument({ margin: 10, size: [180, 600], autoFirstPage: false });
        doc.addPage();

        const font = 'Helvetica';
        const bold = 'Helvetica-Bold';

        const centerText = (text, y) => {
            const width = doc.widthOfString(text);
            doc.text(text, (180 - width) / 2, y);
        };

        let y = 10;
        doc.font(bold).fontSize(10);
        centerText(organizacion.nombre_empresa || 'TIENDA', y);
        y += 14;
        doc.font(font).fontSize(8);
        if (organizacion.nit) centerText(`NIT: ${organizacion.nit}`, y);
        y += 10;
        if (organizacion.direccion) centerText(organizacion.direccion, y);
        y += 10;
        if (organizacion.telefono) centerText(`Tel: ${organizacion.telefono}`, y);
        y += 14;

        doc.text('--------------------------------', 10, y, { width: 160, align: 'center' });
        y += 12;

        // Datos de la factura
        doc.font(bold).fontSize(8);
        doc.text(`FACTURA: ${factura.numero_correlativo}`, 10, y);
        y += 10;
        doc.font(font);
        doc.text(`Fecha: ${new Date(factura.creado_en).toLocaleDateString('es-SV')}`, 10, y);
        y += 10;
        doc.text(`Cliente: ${factura.cliente_nombre || 'N/A'}`, 10, y);
        y += 10;
        doc.text(`NIT: ${factura.cliente_nit || 'N/A'}`, 10, y);
        y += 10;
        doc.text(`Condición: ${factura.condicion_operacion || 'Contado'}`, 10, y);
        y += 10;
        doc.text(`Atendido por: ${usuarioNombre}`, 10, y);
        y += 14;

        doc.text('--------------------------------', 10, y, { width: 160, align: 'center' });
        y += 12;

        // Productos
        doc.font(bold).fontSize(8);
        doc.text('Cant  Producto           Total', 10, y);
        y += 10;
        doc.font(font);

        for (const d of detalles) {
            const cantidad = parseFloat(d.cantidad) || 0;
            const precio = parseFloat(d.precio_unitario) || 0;
            const subtotal = cantidad * precio - (parseFloat(d.descuento_item) || 0);
            const iva = parseFloat(d.iva) || 0;
            const totalItem = subtotal + iva;
            const nombre = d.producto_nombre || 'Producto';
            const linea = `${cantidad}  ${nombre.slice(0, 20).padEnd(20)} $${totalItem.toFixed(2)}`;
            doc.text(linea, 10, y);
            y += 10;
        }

        y += 5;
        doc.text('--------------------------------', 10, y, { width: 160, align: 'center' });
        y += 12;

        // Totales
        const subtotalTotal = detalles.reduce((acc, d) => acc + (parseFloat(d.cantidad) * parseFloat(d.precio_unitario) - (parseFloat(d.descuento_item) || 0)), 0);
        const ivaTotal = detalles.reduce((acc, d) => acc + (parseFloat(d.iva) || 0), 0);
        const totalGeneral = subtotalTotal + ivaTotal;

        doc.font(bold);
        doc.text(`Subtotal: $${subtotalTotal.toFixed(2)}`, 10, y);
        y += 10;
        doc.text(`IVA: $${ivaTotal.toFixed(2)}`, 10, y);
        y += 10;
        doc.font(bold).fontSize(10);
        doc.text(`TOTAL: $${totalGeneral.toFixed(2)}`, 10, y);
        y += 14;

        doc.font(font).fontSize(8);
        const totalLetras = numeroALetras(totalGeneral);
        doc.text(`SON: ${totalLetras} DÓLARES`, 10, y);
        y += 14;

        doc.text('--------------------------------', 10, y, { width: 160, align: 'center' });
        y += 10;
        centerText('¡Gracias por su compra!', y);
        y += 10;
        centerText('Generado: ' + new Date().toLocaleDateString('es-SV'), y);
        y += 10;

        doc.end();

        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=ticket_${factura.numero_correlativo}.pdf`);
            res.send(pdfData);
        });

    } catch (error) {
        console.error('❌ Error al generar ticket:', error);
        res.status(500).json({ message: 'Error al generar ticket', error: error.message });
    }
};

// ============================================================
// ENVIAR FACTURA POR CORREO
// ============================================================
exports.enviarFacturaEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const organizacion_id = req.organizacion_id;
        const { email, mensaje } = req.body;

        // 1. Obtener factura
        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        // 2. Obtener cliente
        const cliente = await Cliente.findById(factura.cliente_id, organizacion_id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // 3. Obtener organización
        const [orgRows] = await pool.query(
            `SELECT id, nombre_empresa, nombre_comercial, nit, nrc, 
                    direccion, telefono, telefono_whatsapp, correo_contacto 
             FROM organizaciones WHERE id = ?`,
            [organizacion_id]
        );
        const organizacion = orgRows[0] || null;

        // 4. Determinar correo destino
        const emailDestino = email || cliente.correo;
        if (!emailDestino) {
            return res.status(400).json({ message: 'El cliente no tiene correo registrado y no se proporcionó uno' });
        }

        // 5. Generar PDF
        const pdfBlob = await generarPDFFacturaInterno(id, organizacion_id);
        
        // 6. Generar URL del PDF
        const pdfUrl = `${req.protocol}://${req.get('host')}/api/organization/facturas/${id}/pdf`;

        // 7. Generar HTML del correo
        const htmlContent = EmailHelper.generarHTMLFactura(
            factura,
            cliente,
            organizacion,
            pdfUrl,
            mensaje || ''
        );

        // 8. Enviar correo
        const result = await EmailHelper.sendFacturaEmail({
            toEmail: emailDestino,
            toName: cliente.nombre,
            subject: `Factura N° ${factura.numero_correlativo} - ${organizacion?.nombre_empresa || 'Facturación'}`,
            htmlContent,
            pdfBuffer: pdfBlob,
            pdfName: `factura_${factura.numero_correlativo}.pdf`,
            organization: organizacion,
        });

        if (result.success) {
            res.json({ 
                message: 'Factura enviada por correo exitosamente', 
                messageId: result.messageId,
                email: emailDestino 
            });
        } else {
            res.status(500).json({ 
                message: 'Error al enviar el correo', 
                error: result.error 
            });
        }

    } catch (error) {
        console.error('❌ Error al enviar factura por correo:', error);
        res.status(500).json({ message: 'Error al enviar correo', error: error.message });
    }
};

async function generarPDFFacturaInterno(id, organizacion_id) {
    return new Promise(async (resolve, reject) => {
        try {
            const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
            if (!factura) {
                return reject(new Error('Factura no encontrada'));
            }
            const detalles = await DetalleFactura.findByFacturaId(id);

            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            await generarContenidoPDF(doc, factura, detalles);
            
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// Función auxiliar para el contenido del PDF (extraída de generarPDFFactura)
async function generarContenidoPDF(doc, factura, detalles) {
    const primaryColor = '#1a1a2e';
    const textColor = '#333333';
    const lightGray = '#f5f5f5';
    
    // ===== LOGO DE LA ORGANIZACIÓN (A LA IZQUIERDA) =====
    const [orgLogo] = await pool.query('SELECT logo_url FROM organizaciones WHERE id = ?', [organizacion_id]);
    const logoUrl = orgLogo[0]?.logo_url;
    
    let alturaLogo = 40; 

    if (logoUrl) {
      // Ajustamos la ruta para salir de 'src/controllers' hacia la raíz de 'backend'
      const logoPath = path.join(__dirname, '../..', logoUrl);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 40, { fit: [120, 60] });
        alturaLogo = 105; 
      }
    }

    // Encabezado
    doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor);
        doc.text('FACTURA', 350, 40, { width: 205, align: 'right' });
        doc.fontSize(10).fillColor('#666666');
        doc.text(`N° ${factura.numero_correlativo}`, 350, 65, { width: 205, align: 'right' });
        const fechaFormateada = new Date(factura.creado_en).toLocaleDateString('es-SV');
        doc.text(`Fecha: ${fechaFormateada}`, 350, 80, { width: 205, align: 'right' });

    // Emisor
    doc.moveDown(2);
    const emisorTop = Math.max(doc.y + 25, alturaLogo, 115);
    doc.y = emisorTop;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
    doc.text('EMISOR', 40, emisorTop);
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    doc.text(organizacion.nombre_empresa || 'Empresa', 40, doc.y);
    if (organizacion.nit) doc.text(`NIT: ${organizacion.nit}`, 40, doc.y);
    if (organizacion.nrc) doc.text(`NRC: ${organizacion.nrc}`, 40, doc.y);
    if (organizacion.direccion) doc.text(organizacion.direccion, 40, doc.y);
    if (organizacion.telefono) doc.text(`Tel: ${organizacion.telefono}`, 40, doc.y);
    if (organizacion.correo_contacto) doc.text(`Email: ${organizacion.correo_contacto}`, 40, doc.y);

    // "Atendido por" debajo del emisor
    doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
    doc.text('Atendido por:', 40, doc.y + 5);
    doc.font('Helvetica').fillColor('#555555');
    doc.text(usuarioNombre, 120, doc.y - 2);

    const emisorBottom = doc.y + 5;

    // Cliente
    doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
    doc.text('CLIENTE', 300, emisorTop);
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    doc.text(factura.cliente_nombre || 'Cliente', 300, doc.y);
    if (factura.cliente_nit) doc.text(`NIT: ${factura.cliente_nit}`, 300, doc.y);
    if (factura.cliente_dui) doc.text(`DUI: ${factura.cliente_dui}`, 300, doc.y);
    if (factura.cliente_nrc) doc.text(`NRC: ${factura.cliente_nrc}`, 300, doc.y);
    if (factura.cliente_direccion) doc.text(factura.cliente_direccion, 300, doc.y);
    const clienteBottom = doc.y;

    // Info adicional
    const infoY = Math.max(emisorBottom, clienteBottom) + 20;
    doc.y = infoY;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
    doc.text('Tipo Documento:', 40, infoY);
    doc.font('Helvetica').text(factura.tipo_documento, 145, infoY);
    doc.font('Helvetica-Bold').text('Condición:', 300, infoY);
    doc.font('Helvetica').text(factura.condicion_operacion || 'Contado', 360, infoY);
    if (factura.fecha_vencimiento) {
        doc.font('Helvetica-Bold').text('Vencimiento:', 300, infoY + 15);
        doc.font('Helvetica').text(new Date(factura.fecha_vencimiento).toLocaleDateString('es-SV'), 360, infoY + 15);
    }

    // Tabla (copiar desde el método existente)
    const tableTop = doc.y + 20;
    const colX = [40, 80, 270, 340, 415, 470];
    const colWidths = [40, 190, 70, 75, 55, 85];

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    doc.rect(40, tableTop, 515, 20).fill(primaryColor);
    doc.fillColor('#ffffff');
    doc.text('CANT.', colX[0] + 5, tableTop + 5);
    doc.text('PRODUCTO', colX[1] + 10, tableTop + 5);
    doc.text('PRECIO UNIT.', colX[2], tableTop + 5, { width: colWidths[2], align: 'right' });
    doc.text('SUBTOTAL', colX[3], tableTop + 5, { width: colWidths[3], align: 'right' });
    doc.text('IVA', colX[4], tableTop + 5, { width: colWidths[4], align: 'right' });
    doc.text('TOTAL', colX[5], tableTop + 5, { width: colWidths[5], align: 'right' });

    let rowY = tableTop + 25;
    let subtotalTotal = 0;
    let ivaTotal = 0;

    detalles.forEach((d, index) => {
        const cantidad = parseFloat(d.cantidad) || 0;
        const precio = parseFloat(d.precio_unitario) || 0;
        const subtotal = cantidad * precio - (parseFloat(d.descuento_item) || 0);
        const iva = parseFloat(d.iva) || 0;
        const totalItem = subtotal + iva;

        subtotalTotal += subtotal;
        ivaTotal += iva;

        if (index % 2 === 0) doc.rect(40, rowY - 3, 515, 18).fill(lightGray);
        doc.fillColor('#333333').font('Helvetica').fontSize(8.5);
        doc.text(cantidad.toString(), colX[0] + 5, rowY);
        doc.text(d.producto_nombre || 'Producto', colX[1] + 10, rowY, { width: colWidths[1], truncate: true });
        doc.text(`$${precio.toFixed(2)}`, colX[2], rowY, { width: colWidths[2], align: 'right' });
        doc.text(`$${subtotal.toFixed(2)}`, colX[3], rowY, { width: colWidths[3], align: 'right' });
        doc.text(`$${iva.toFixed(2)}`, colX[4], rowY, { width: colWidths[4], align: 'right' });
        doc.text(`$${totalItem.toFixed(2)}`, colX[5], rowY, { width: colWidths[5], align: 'right' });
        rowY += 20;
    });

    // Totales
    const totalsY = rowY + 15;
    let currentTotalY = totalsY;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
    doc.text('Subtotal:', 370, currentTotalY, { width: 90, align: 'right' });
    doc.text(`$${subtotalTotal.toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
    currentTotalY += 15;

    if (factura.tipo_documento === 'CCF' || factura.tipo_documento === 'FAF') {
        doc.text('IVA 13%:', 370, currentTotalY, { width: 90, align: 'right' });
        doc.text(`$${ivaTotal.toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
        currentTotalY += 15;
    }

    doc.rect(365, currentTotalY + 5, 190, 25).fill(primaryColor);
    doc.fillColor('#ffffff');
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('TOTAL', 380, currentTotalY + 13);
    doc.text(`$${parseFloat(factura.total_pagar).toFixed(2)}`, 470, currentTotalY + 13, { width: 85, align: 'right' });

    // Letras
    doc.fillColor('#333333');
    doc.font('Helvetica').fontSize(8.5);
    const totalLetras = numeroALetras(parseFloat(factura.total_pagar));
    doc.text(`SON: ${totalLetras} DÓLARES`, 40, currentTotalY + 40);

    const footerY = 750;
    doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
    doc.fillColor('#9ca3af').fontSize(8);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-SV')} | Comprobante electrónico`, 40, footerY + 10);
    if (factura.uuid_dte) doc.text(`UUID: ${factura.uuid_dte}`, 40, footerY + 22);
}

// ============================================================
// ENVIAR FACTURA AL MINISTERIO DE HACIENDA
// ============================================================
exports.enviarFacturaMH = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    // 1. Obtener factura y datos relacionados
    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    // No enviar si ya está procesada
    if (factura.estado_dte === 'procesado') {
      return res.status(400).json({ message: 'Esta factura ya fue procesada por el MH' });
    }

    const detalles = await DetalleFactura.findByFacturaId(id);
    const cliente = await Cliente.findById(factura.cliente_id, organizacion_id);
    const [orgData] = await pool.query(
      'SELECT * FROM organizaciones WHERE id = ?',
      [organizacion_id]
    );
    const organizacion = orgData[0];

    if (!organizacion) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }

    // 2. Generar número de control
    const [count] = await pool.query(
      'SELECT COUNT(*) AS total FROM facturas WHERE organizacion_id = ? AND YEAR(creado_en) = YEAR(CURDATE())',
      [organizacion_id]
    );
    const secuencial = String(count[0].total + 1).padStart(15, '0');

    // Estructura del número de control: DTE-01-M001P001-000000000000001
    const numeroControl = `DTE-01-M001P001-${secuencial}`;

    // 3. Construir el JSON del DTE
    const jsonDTE = DTEJsonBuilder.build(
      factura,
      detalles,
      organizacion,
      cliente,
      numeroControl
    );

    // 4. Firmar el JSON
    const jsonFirmado = await DTEFirmaHelper.firmarDTE(jsonDTE, organizacion_id);

    // 5. Obtener token de autenticación
    const token = await MHAuthHelper.obtenerTokenMH(organizacion_id);
    const baseUrl = await MHAuthHelper.getBaseUrl(organizacion_id);

    // 6. Enviar al MH
    const payload = {
      ambiente: organizacion.ambiente || '00',
      idEnvio: generarUUID(),
      version: 2,
      tipoDte: jsonDTE.identificacion.tipoDte,
      documento: JSON.stringify(jsonFirmado),
      codigoGeneracion: jsonDTE.identificacion.codigoGeneracion,
    };

    const response = await axios({
      method: 'POST',
      url: `${baseUrl}/fesv/recepcion`,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'User-Agent': 'SaaS-Facturacion/1.0',
      },
      data: payload,
    });

    // 7. Procesar respuesta
    const respuestaMH = response.data;

    // Guardar JSON enviado y respuesta
    await pool.query(
      `UPDATE facturas SET 
        codigo_generacion = ?,
        numero_control = ?,
        json_enviado = ?,
        json_respuesta = ?,
        fecha_transmision = NOW()
       WHERE id = ?`,
      [
        jsonDTE.identificacion.codigoGeneracion,
        numeroControl,
        JSON.stringify(jsonFirmado),
        JSON.stringify(respuestaMH),
        id,
      ]
    );

    if (respuestaMH.estado === 'PROCESADO' || respuestaMH.estado === 'RECIBIDO') {
      // ✅ Éxito: actualizar estado y sello
      await pool.query(
        `UPDATE facturas SET 
          estado_dte = 'procesado',
          sello_recepcion = ?
         WHERE id = ?`,
        [respuestaMH.selloRecibido || 'RECIBIDO', id]
      );

      // 🔔 ENVÍO AUTOMÁTICO DE CORREO AL CLIENTE
      try {
        // Generar PDF del comprobante
        const pdfBuffer = await generarPDFFacturaBuffer(id, organizacion_id);
        const pdfUrl = `${req.protocol}://${req.get('host')}/api/organization/facturas/${id}/pdf`;

        // HTML del correo
        const htmlContent = EmailHelper.generarHTMLFactura(
          factura,
          cliente,
          organizacion,
          pdfUrl,
          `Su factura ha sido validada por el Ministerio de Hacienda. Código de generación: ${jsonDTE.identificacion.codigoGeneracion}`
        );

        // Enviar correo con adjuntos (PDF + JSON)
        const emailResult = await EmailHelper.sendFacturaEmail({
          toEmail: cliente.correo,
          toName: cliente.nombre,
          subject: `Factura N° ${factura.numero_correlativo} - ${organizacion.nombre_empresa}`,
          htmlContent,
          pdfBuffer,
          pdfName: `factura_${factura.numero_correlativo}.pdf`,
          organization: organizacion,
          extraAttachments: [
            {
              content: Buffer.from(JSON.stringify(jsonFirmado, null, 2)),
              name: `factura_${factura.numero_correlativo}.json`,
              contentType: 'application/json',
            }
          ],
        });

        if (emailResult.success) {
          console.log(`📧 Correo enviado a ${cliente.correo} para factura ${factura.numero_correlativo}`);
        } else {
          console.error(`❌ Error al enviar correo: ${emailResult.error}`);
        }
      } catch (emailError) {
        console.error('❌ Error en envío automático de correo:', emailError);
        // No detenemos el flujo, solo registramos el error
      }

      res.json({
        message: 'Factura enviada al MH exitosamente. Se ha notificado al cliente por correo.',
        codigoGeneracion: jsonDTE.identificacion.codigoGeneracion,
        selloRecepcion: respuestaMH.selloRecibido,
        respuestaMH,
      });

    } else {
      // ❌ Rechazado
      await pool.query(
        `UPDATE facturas SET estado_dte = 'rechazado' WHERE id = ?`,
        [id]
      );

      res.status(400).json({
        message: 'La factura fue rechazada por el MH',
        errores: respuestaMH.observaciones || respuestaMH.descripcionMsg,
        respuestaMH,
      });
    }

  } catch (error) {
    console.error('❌ Error al enviar factura al MH:', error.message);
    res.status(500).json({
      message: 'Error al enviar factura al MH',
      error: error.message,
      response: error.response?.data,
    });
  }
};

// ============================================================
// ENVIAR FACTURA POR CORREO CON PDF Y JSON
// ============================================================
exports.enviarFacturaConAdjuntos = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    // Obtener factura, detalles y datos relacionados
    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const detalles = await DetalleFactura.findByFacturaId(id);
    const cliente = await Cliente.findById(factura.cliente_id, organizacion_id);
    const [orgData] = await pool.query(
      'SELECT * FROM organizaciones WHERE id = ?',
      [organizacion_id]
    );
    const organizacion = orgData[0];

    const emailDestino = req.body.email || cliente.correo;
    if (!emailDestino) {
      return res.status(400).json({ message: 'El cliente no tiene correo registrado' });
    }

    // 1. Generar PDF
    const pdfBuffer = await generarPDFFacturaBuffer(id, organizacion_id);

    // 2. Obtener JSON de la factura (si ya fue enviada al MH)
    let jsonDTE = null;
    if (factura.json_enviado) {
      jsonDTE = factura.json_enviado;
    } else {
      // Si no está enviada al MH, generar el JSON pero sin firmar (solo para referencia)
      const [orgData2] = await pool.query(
        'SELECT * FROM organizaciones WHERE id = ?',
        [organizacion_id]
      );
      const jsonTemp = DTEJsonBuilder.build(
        factura,
        detalles,
        orgData2[0],
        cliente,
        factura.numero_correlativo
      );
      jsonDTE = jsonTemp;
    }

    // 3. Generar URL de descarga del PDF
    const pdfUrl = `${req.protocol}://${req.get('host')}/api/organization/facturas/${id}/pdf`;

    // 4. Enviar correo
    const htmlContent = EmailHelper.generarHTMLFactura(
      factura,
      cliente,
      organizacion,
      pdfUrl,
      req.body.mensaje || 'Adjunto encontrará su factura electrónica.'
    );

    const result = await EmailHelper.sendFacturaEmail({
      toEmail: emailDestino,
      toName: cliente.nombre,
      subject: `Factura N° ${factura.numero_correlativo} - ${organizacion.nombre_empresa}`,
      htmlContent,
      pdfBuffer,
      pdfName: `factura_${factura.numero_correlativo}.pdf`,
      organization: organizacion,
      // Adjuntar JSON como archivo adicional
      extraAttachments: jsonDTE ? [{
        content: Buffer.isBuffer(jsonDTE) ? jsonDTE : Buffer.from(JSON.stringify(jsonDTE, null, 2)),
        name: `factura_${factura.numero_correlativo}.json`,
        contentType: 'application/json',
      }] : [],
    });

    if (result.success) {
      res.json({
        message: 'Factura enviada por correo con adjuntos',
        email: emailDestino,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        message: 'Error al enviar el correo',
        error: result.error,
      });
    }

  } catch (error) {
    console.error('❌ Error al enviar factura por correo:', error);
    res.status(500).json({ message: 'Error al enviar correo', error: error.message });
  }
};

// Función auxiliar para generar PDF sin enviar respuesta HTTP
async function generarPDFFacturaBuffer(id, organizacion_id) {
    return new Promise(async (resolve, reject) => {
        try {
            const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
            if (!factura) return reject(new Error('Factura no encontrada'));
            const detalles = await DetalleFactura.findByFacturaId(id);

            // Obtener organización
            const [orgRows] = await pool.query(
                `SELECT nombre_empresa, nombre_comercial, nit, nrc, direccion, telefono, correo_contacto
                 FROM organizaciones WHERE id = ?`,
                [organizacion_id]
            );
            const organizacion = orgRows[0] || {};

            // Obtener usuario
            const [userRows] = await pool.query(
                'SELECT nombre FROM usuarios WHERE id = ?',
                [factura.usuario_id]
            );
            const usuarioNombre = userRows.length > 0 ? userRows[0].nombre : 'N/A';

            const PDFDocument = require('pdfkit');
            const QRCode = require('qrcode');
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // ============================================================
            // DISEÑO DEL PDF (CON DATOS DINÁMICOS DE ORGANIZACIÓN Y USUARIO)
            // ============================================================
            const primaryColor = '#1a1a2e';
            const textColor = '#333333';
            const lightGray = '#f5f5f5';
            
            const [orgLogo] = await pool.query('SELECT logo_url FROM organizaciones WHERE id = ?', [organizacion_id]);
        const logoUrl = orgLogo[0]?.logo_url;
        
            let alturaLogo = 40; 

            if (logoUrl) {
              // Ajustamos la ruta para salir de 'src/controllers' hacia la raíz de 'backend'
              const logoPath = path.join(__dirname, '../..', logoUrl);
              if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 40, 40, { fit: [120, 60] });
                alturaLogo = 105; 
              }
            }

            // Encabezado
            doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor);
            doc.text('FACTURA', 350, 40, { width: 205, align: 'right' });
            doc.fontSize(10).fillColor('#666666');
            doc.text(`N° ${factura.numero_correlativo}`, 350, 65, { width: 205, align: 'right' });
            const fechaFormateada = new Date(factura.creado_en).toLocaleDateString('es-SV');
            doc.text(`Fecha: ${fechaFormateada}`, 350, 80, { width: 205, align: 'right' });

            // ===== DATOS DEL EMISOR (Dinámicos) =====
            doc.moveDown(2);
        const emisorTop = Math.max(doc.y + 25, alturaLogo, 115);
        doc.y = emisorTop;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
        doc.text('EMISOR', 40, emisorTop);
        doc.font('Helvetica').fontSize(9).fillColor('#555555');
        doc.text(organizacion.nombre_empresa || 'Empresa', 40, doc.y);
        if (organizacion.nit) doc.text(`NIT: ${organizacion.nit}`, 40, doc.y);
        if (organizacion.nrc) doc.text(`NRC: ${organizacion.nrc}`, 40, doc.y);
        if (organizacion.direccion) doc.text(organizacion.direccion, 40, doc.y);
        if (organizacion.telefono) doc.text(`Tel: ${organizacion.telefono}`, 40, doc.y);
        if (organizacion.correo_contacto) doc.text(`Email: ${organizacion.correo_contacto}`, 40, doc.y);

            // "Atendido por" debajo del emisor
            doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
            doc.text('Atendido por:', 40, doc.y + 5);
            doc.font('Helvetica').fillColor('#555555');
            doc.text(usuarioNombre, 120, doc.y - 2);

            const emisorBottom = doc.y + 5;

            // ===== DATOS DEL CLIENTE =====
            doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
            doc.text('CLIENTE', 300, emisorTop);
            doc.font('Helvetica').fontSize(9).fillColor('#555555');
            doc.text(factura.cliente_nombre || 'Cliente', 300, doc.y);
            if (factura.cliente_nit) doc.text(`NIT: ${factura.cliente_nit}`, 300, doc.y);
            if (factura.cliente_dui) doc.text(`DUI: ${factura.cliente_dui}`, 300, doc.y);
            if (factura.cliente_nrc) doc.text(`NRC: ${factura.cliente_nrc}`, 300, doc.y);
            if (factura.cliente_direccion) doc.text(factura.cliente_direccion, 300, doc.y);
            const clienteBottom = doc.y;

            // ===== INFORMACIÓN ADICIONAL =====
            const infoY = Math.max(emisorBottom, clienteBottom) + 20;
            doc.y = infoY;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
            doc.text('Tipo Documento:', 40, infoY);
            doc.font('Helvetica').text(factura.tipo_documento, 145, infoY);
            doc.font('Helvetica-Bold').text('Condición:', 300, infoY);
            doc.font('Helvetica').text(factura.condicion_operacion || 'Contado', 360, infoY);
            if (factura.fecha_vencimiento) {
                doc.font('Helvetica-Bold').text('Vencimiento:', 300, infoY + 15);
                doc.font('Helvetica').text(new Date(factura.fecha_vencimiento).toLocaleDateString('es-SV'), 360, infoY + 15);
            }
            if (factura.uuid_dte) {
                doc.font('Helvetica-Bold').text('UUID:', 40, infoY + 15);
                doc.font('Helvetica').text(factura.uuid_dte, 145, infoY + 15);
            }

            // ===== TABLA DE PRODUCTOS =====
            const tableTop = doc.y + (factura.uuid_dte ? 25 : 20);
            const colX = [40, 80, 270, 340, 415, 470];
            const colWidths = [40, 190, 70, 75, 55, 85];

            doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
            doc.rect(40, tableTop, 515, 20).fill(primaryColor);
            doc.fillColor('#ffffff');
            doc.text('CANT.', colX[0] + 5, tableTop + 5);
            doc.text('PRODUCTO', colX[1] + 10, tableTop + 5);
            doc.text('PRECIO UNIT.', colX[2], tableTop + 5, { width: colWidths[2], align: 'right' });
            doc.text('SUBTOTAL', colX[3], tableTop + 5, { width: colWidths[3], align: 'right' });
            doc.text('IVA', colX[4], tableTop + 5, { width: colWidths[4], align: 'right' });
            doc.text('TOTAL', colX[5], tableTop + 5, { width: colWidths[5], align: 'right' });

            let rowY = tableTop + 25;
            let subtotalTotal = 0;
            let ivaTotal = 0;

            detalles.forEach((d, index) => {
                const cantidad = parseFloat(d.cantidad) || 0;
                const precio = parseFloat(d.precio_unitario) || 0;
                const subtotal = cantidad * precio - (parseFloat(d.descuento_item) || 0);
                const iva = parseFloat(d.iva) || 0;
                const totalItem = subtotal + iva;

                subtotalTotal += subtotal;
                ivaTotal += iva;

                if (index % 2 === 0) doc.rect(40, rowY - 3, 515, 18).fill(lightGray);
                doc.fillColor('#333333').font('Helvetica').fontSize(8.5);
                doc.text(cantidad.toString(), colX[0] + 5, rowY);
                doc.text(d.producto_nombre || 'Producto', colX[1] + 10, rowY, { width: colWidths[1], truncate: true });
                doc.text(`$${precio.toFixed(2)}`, colX[2], rowY, { width: colWidths[2], align: 'right' });
                doc.text(`$${subtotal.toFixed(2)}`, colX[3], rowY, { width: colWidths[3], align: 'right' });
                doc.text(`$${iva.toFixed(2)}`, colX[4], rowY, { width: colWidths[4], align: 'right' });
                doc.text(`$${totalItem.toFixed(2)}`, colX[5], rowY, { width: colWidths[5], align: 'right' });
                rowY += 20;
            });

            // ===== TOTALES =====
            const totalsY = rowY + 15;
            let currentTotalY = totalsY;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
            doc.text('Subtotal:', 370, currentTotalY, { width: 90, align: 'right' });
            doc.text(`$${subtotalTotal.toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
            currentTotalY += 15;

            if (factura.tipo_documento === 'CCF' || factura.tipo_documento === 'FAF') {
                doc.text('IVA 13%:', 370, currentTotalY, { width: 90, align: 'right' });
                doc.text(`$${ivaTotal.toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
                currentTotalY += 15;
            }

            if (parseFloat(factura.retencion_1) > 0) {
                doc.text('Retención 1%:', 370, currentTotalY, { width: 90, align: 'right' });
                doc.text(`-$${parseFloat(factura.retencion_1).toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
                currentTotalY += 15;
            }
            if (parseFloat(factura.percepcion_1) > 0) {
                doc.text('Percepción 1%:', 370, currentTotalY, { width: 90, align: 'right' });
                doc.text(`+$${parseFloat(factura.percepcion_1).toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
                currentTotalY += 15;
            }

            // ===== CÓDIGO QR (si está procesado) =====
            if (factura.codigo_generacion && factura.sello_recepcion) {
                const ambiente = factura.ambiente || '00';
                const qrUrl = `https://admin.factura.gob.sv/consultaPublica?ambiente=${ambiente}&codGen=${factura.codigo_generacion}&fechaEmi=${factura.creado_en.toISOString().split('T')[0]}`;
                const qrBuffer = await QRCode.toBuffer(qrUrl, {
                    width: 100,
                    margin: 2,
                    errorCorrectionLevel: 'H',
                });
                doc.image(qrBuffer, 450, 650, { width: 80 });
                doc.fontSize(6).fillColor('#666666');
                doc.text('Código de verificación', 450, 735, { width: 80, align: 'center' });
                doc.text(factura.codigo_generacion, 450, 745, { width: 80, align: 'center' });
            }

            // ===== BLOQUE TOTAL =====
            doc.rect(365, currentTotalY + 5, 190, 25).fill(primaryColor);
            doc.fillColor('#ffffff');
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('TOTAL', 380, currentTotalY + 13);
            doc.text(`$${parseFloat(factura.total_pagar).toFixed(2)}`, 470, currentTotalY + 13, { width: 85, align: 'right' });

            // ===== LETRAS =====
            doc.fillColor('#333333');
            doc.font('Helvetica').fontSize(8.5);
            const totalLetras = numeroALetras(parseFloat(factura.total_pagar));
            doc.text(`SON: ${totalLetras} DÓLARES`, 40, currentTotalY + 40);

            // ===== PIE DE PÁGINA =====
            const footerY = 750;
            doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
            doc.fillColor('#9ca3af').fontSize(8);
            doc.text(`Generado: ${new Date().toLocaleDateString('es-SV')} | Comprobante electrónico`, 40, footerY + 10);
            if (factura.uuid_dte) doc.text(`UUID: ${factura.uuid_dte}`, 40, footerY + 22);

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

exports.exportarCierreMes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { mes, anio } = req.query;

    if (!mes || !anio) {
      return res.status(400).json({ message: 'Mes y año son requeridos' });
    }

    const facturas = await Factura.findAllForExport(organizacion_id, parseInt(anio), parseInt(mes));

    if (facturas.length === 0) {
      return res.status(404).json({ message: 'No hay facturas para el mes seleccionado' });
    }

    const zip = new AdmZip();

    // 1. Agregar JSON firmados
    for (const fact of facturas) {
      if (fact.json_enviado) {
        try {
          const jsonData = JSON.parse(fact.json_enviado);
          const jsonStr = JSON.stringify(jsonData, null, 2);
          zip.addFile(`json/factura_${fact.numero_correlativo}.json`, Buffer.from(jsonStr, 'utf-8'));
        } catch (e) {
          console.warn(`No se pudo agregar JSON de factura ${fact.id}:`, e.message);
        }
      }
    }

    // 2. Generar CSV resumen
    const csvData = facturas.map(f => ({
      'N° Correlativo': f.numero_correlativo,
      'Cliente': f.cliente_nombre,
      'NIT': f.cliente_nit,
      'Total': parseFloat(f.total_pagar).toFixed(2),
      'Estado': f.estado,
      'Condición': f.condicion_operacion,
      'Fecha': f.creado_en ? new Date(f.creado_en).toLocaleDateString('es-SV') : '',
      'Código Generación': f.codigo_generacion || '',
      'Sello Recepción': f.sello_recepcion || '',
      'UUID DTE': f.uuid_dte || '',
      'Número Control': f.numero_control || '',
      'Atendido por': f.usuario_nombre || '',
    }));

    const headers = Object.keys(csvData[0]);
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of csvData) {
      csv += headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }

    zip.addFile(`resumen_${mes}_${anio}.csv`, Buffer.from(csv, 'utf-8'));

    const zipBuffer = zip.toBuffer();

    const filename = `cierre_mes_${mes}_${anio}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(zipBuffer);

  } catch (error) {
    console.error('❌ Error al exportar cierre de mes:', error);
    res.status(500).json({ message: 'Error al exportar cierre de mes', error: error.message });
  }
};

// ============================================================
// OBTENER RESUMEN DE ESTADO DTE
// ============================================================
exports.obtenerMonitorDTE = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { estado_dte, mes, anio, buscar } = req.query;

    let sql = `
      SELECT 
        f.id,
        f.numero_correlativo,
        f.cliente_nombre,
        f.total_pagar,
        f.estado,
        f.estado_dte,
        f.codigo_generacion,
        f.sello_recepcion,
        f.json_respuesta,
        f.fecha_transmision,
        f.creado_en,
        f.observaciones,
        u.nombre AS usuario_nombre
      FROM facturas f
      LEFT JOIN usuarios u ON f.usuario_id = u.id
      WHERE f.organizacion_id = ?
        AND f.eliminado_en IS NULL
    `;
    const params = [organizacion_id];

    if (estado_dte) {
      sql += ' AND f.estado_dte = ?';
      params.push(estado_dte);
    }
    if (mes) {
      sql += ' AND MONTH(f.creado_en) = ?';
      params.push(parseInt(mes));
    }
    if (anio) {
      sql += ' AND YEAR(f.creado_en) = ?';
      params.push(parseInt(anio));
    }
    if (buscar) {
      sql += ' AND (f.numero_correlativo LIKE ? OR f.cliente_nombre LIKE ?)';
      params.push(`%${buscar}%`, `%${buscar}%`);
    }

    sql += ' ORDER BY f.creado_en DESC';

    const [rows] = await pool.query(sql, params);

    // Procesar cada factura para extraer errores del json_respuesta
    const facturas = rows.map(f => {
      let errores = null;
      let respuestaMH = null;
      if (f.json_respuesta) {
        try {
          respuestaMH = JSON.parse(f.json_respuesta);
          if (respuestaMH.estado === 'RECHAZADO' || respuestaMH.estado === 'ERROR') {
            errores = respuestaMH.observaciones || respuestaMH.descripcionMsg || 'Error desconocido';
          }
        } catch (e) {
          // Si no se puede parsear, ignorar
        }
      }
      return {
        ...f,
        errores,
        respuestaMH,
      };
    });

    // Estadísticas
    const totalFacturas = facturas.length;
    const pendientes = facturas.filter(f => f.estado_dte === 'pendiente' || f.estado_dte === null).length;
    const firmados = facturas.filter(f => f.estado_dte === 'firmado').length;
    const enviados = facturas.filter(f => f.estado_dte === 'enviado').length;
    const procesados = facturas.filter(f => f.estado_dte === 'procesado').length;
    const rechazados = facturas.filter(f => f.estado_dte === 'rechazado').length;

    // Contar facturas con errores (rechazadas con errores)
    const conErrores = facturas.filter(f => f.estado_dte === 'rechazado' && f.errores).length;

    res.json({
      facturas,
      estadisticas: {
        total: totalFacturas,
        pendientes,
        firmados,
        enviados,
        procesados,
        rechazados,
        conErrores,
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener monitor DTE:', error);
    res.status(500).json({ message: 'Error al obtener monitor DTE', error: error.message });
  }
};
