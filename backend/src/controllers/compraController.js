// backend/src/controllers/compraController.js
const Compra = require('../models/Compra');
const DetalleCompra = require('../models/DetalleCompra');
const Producto = require('../models/Producto');
const Proveedor = require('../models/Proveedor');
const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');
const InventoryMovement = require('../models/InventoryMovement');

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

// Calcular totales de una compra
function calcularTotalesCompra(detalles, tipoDocumento, retencion = 0, percepcion = 0) {
  let montoSubtotal = 0;
  let iva = 0;

  for (const d of detalles) {
    const subtotal = (parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0);
    d.subtotal = subtotal;
    montoSubtotal += subtotal;
    // Solo Credito_Fiscal genera crédito fiscal
    if (tipoDocumento === 'Credito_Fiscal') {
      iva += subtotal * 0.13;
    }
  }

  const total = montoSubtotal + iva - (parseFloat(retencion) || 0) + (parseFloat(percepcion) || 0);
  return { montoSubtotal, iva, total };
}


// ============================================================
// 1. OBTENER COMPRAS (CON FILTROS Y PAGINACIÓN)
// ============================================================
exports.obtenerCompras = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const {
      search,
      mes,
      anio,
      proveedor_id,
      estado_comprobante,
      tipo_documento,
      tipo_egreso,
      condicion_operacion,
      solo_con_vencimiento = 'false',
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (mes) filters.mes = parseInt(mes);
    if (anio) filters.anio = parseInt(anio);
    if (proveedor_id) filters.proveedor_id = parseInt(proveedor_id);
    if (estado_comprobante) filters.estado_comprobante = estado_comprobante;
    if (tipo_documento) filters.tipo_documento = tipo_documento;
    if (tipo_egreso) filters.tipo_egreso = tipo_egreso;
    if (condicion_operacion) filters.condicion_operacion = condicion_operacion;
    if (solo_con_vencimiento === 'true') filters.solo_con_vencimiento = true;

    const result = await Compra.findAll(organizacion_id, filters, page, limit);
    res.json(result);
  } catch (error) {
    console.error('❌ Error al obtener compras:', error);
    res.status(500).json({ message: 'Error al obtener compras', error: error.message });
  }
};

// ============================================================
// 2. OBTENER COMPRA POR ID (CON DETALLES)
// ============================================================
exports.obtenerCompraPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const compra = await Compra.findById(id, organizacion_id);
    if (!compra) return res.status(404).json({ message: 'Compra no encontrada' });
    const detalles = await DetalleCompra.findByCompraId(id);
    res.json({ ...compra, detalles });
  } catch (error) {
    console.error('❌ Error al obtener compra:', error);
    res.status(500).json({ message: 'Error al obtener compra', error: error.message });
  }
};


// ============================================================
// 3. CREAR COMPRA (CON STOCK Y DETALLES)
// ============================================================
exports.crearCompra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const organizacion_id = req.organizacion_id;
    const usuario_id = req.usuario_id || req.user?.id || 1;
    const { detalles, ...compraData } = req.body;

    if (!compraData.proveedor_id) {
      await connection.rollback();
      return res.status(400).json({ message: 'El proveedor es obligatorio' });
    }
    if (!compraData.numero_comprobante) {
      await connection.rollback();
      return res.status(400).json({ message: 'El número de comprobante es obligatorio' });
    }

    if (compraData.uuid_dte) {
      compraData.uuid_dte = compraData.uuid_dte.replace(/-/g, '');
    }
    if (compraData.numero_control) {
      compraData.numero_control = compraData.numero_control.replace(/-/g, '');
    }

    const { montoSubtotal, iva, total } = calcularTotalesCompra(
      detalles || [],
      compraData.tipo_documento || 'Credito_Fiscal',
      compraData.retencion_iva || 0,
      compraData.percepcion_iva || 0
    );

    // Insertar compra
    const compraId = await Compra.create({
      organizacion_id,
      ...compraData,
      monto_subtotal: montoSubtotal,
      iva_credito_fiscal: iva,
      total,
      proveedor_nombre: compraData.proveedor_nombre || 'Proveedor sin nombre',
    });

    // Insertar detalles y movimientos de inventario
    if (detalles && detalles.length > 0) {
      await DetalleCompra.createMany(compraId, detalles);
      if (compraData.tipo_egreso === 'Compra') {
        for (const d of detalles) {
          // Obtener stock actual antes del incremento
          const producto = await Producto.findById(d.producto_id, organizacion_id);
          const stockAnterior = producto ? producto.stock_actual : 0;
          
          // Incrementar stock
          await Producto.incrementStock(d.producto_id, organizacion_id, d.cantidad);
          
          // Registrar movimiento de entrada
          await InventoryMovement.create({
            organizacion_id,
            producto_id: d.producto_id,
            bodega_id: compraData.bodega_id || null,
            tipo_movimiento: 'Entrada',
            cantidad: d.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockAnterior + parseFloat(d.cantidad),
            referencia_tipo: 'Compra',
            referencia_id: compraId,
            costo_unitario: d.precio_unitario || 0,
            observacion: `Compra #${compraData.numero_comprobante}`,
            usuario_id: usuario_id,
          });
        }
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Compra creada exitosamente', id: compraId });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al crear compra:', error);
    res.status(500).json({ message: 'Error al crear compra', error: error.message });
  } finally {
    connection.release();
  }
};


// ============================================================
// 4. ACTUALIZAR COMPRA
// ============================================================
exports.actualizarCompra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const usuario_id = req.usuario_id || req.user?.id || 1;
    const { detalles, ...compraData } = req.body;

    const compra = await Compra.findById(id, organizacion_id);
    if (!compra) {
      await connection.rollback();
      return res.status(404).json({ message: 'Compra no encontrada' });
    }
    if (compra.estado_comprobante === 'Pagado' || compra.estado_comprobante === 'Cancelado') {
      await connection.rollback();
      return res.status(400).json({ message: 'No se puede editar una compra pagada o cancelada' });
    }

    if (compraData.uuid_dte) {
      compraData.uuid_dte = compraData.uuid_dte.replace(/-/g, '');
    }
    if (compraData.numero_control) {
      compraData.numero_control = compraData.numero_control.replace(/-/g, '');
    }

    const { montoSubtotal, iva, total } = calcularTotalesCompra(
      detalles || [],
      compraData.tipo_documento || 'Credito_Fiscal',
      compraData.retencion_iva || 0,
      compraData.percepcion_iva || 0
    );

    await Compra.update(id, organizacion_id, {
      ...compraData,
      monto_subtotal: montoSubtotal,
      iva_credito_fiscal: iva,
      total,
    });

    // Revertir movimientos viejos (si era compra, restar stock y eliminar movimientos)
    const oldDetalles = await DetalleCompra.findByCompraId(id);
    if (compra.tipo_egreso === 'Compra') {
      for (const d of oldDetalles) {
        // Revertir stock (decrementar)
        await Producto.decrementStock(d.producto_id, organizacion_id, d.cantidad);
        // Eliminar movimientos antiguos de esta compra
        await connection.query(
          'DELETE FROM movimientos_inventario WHERE referencia_tipo = "Compra" AND referencia_id = ? AND producto_id = ?',
          [id, d.producto_id]
        );
      }
    }

    // Eliminar detalles viejos
    await DetalleCompra.deleteByCompraId(id);

    // Insertar nuevos detalles y movimientos
    if (detalles && detalles.length > 0) {
      await DetalleCompra.createMany(id, detalles);
      if (compraData.tipo_egreso === 'Compra') {
        for (const d of detalles) {
          const producto = await Producto.findById(d.producto_id, organizacion_id);
          const stockAnterior = producto ? producto.stock_actual : 0;
          await Producto.incrementStock(d.producto_id, organizacion_id, d.cantidad);
          await InventoryMovement.create({
            organizacion_id,
            producto_id: d.producto_id,
            bodega_id: compraData.bodega_id || null,
            tipo_movimiento: 'Entrada',
            cantidad: d.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockAnterior + parseFloat(d.cantidad),
            referencia_tipo: 'Compra',
            referencia_id: id,
            costo_unitario: d.precio_unitario || 0,
            observacion: `Compra #${compraData.numero_comprobante}`,
            usuario_id: usuario_id,
          });
        }
      }
    }

    await connection.commit();
    res.json({ message: 'Compra actualizada exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al actualizar compra:', error);
    res.status(500).json({ message: 'Error al actualizar compra', error: error.message });
  } finally {
    connection.release();
  }
};


// ============================================================
// 5. CANCELAR COMPRA (REVERTIR STOCK)
// ============================================================
exports.cancelarCompra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const compra = await Compra.findById(id, organizacion_id);
    if (!compra) {
      await connection.rollback();
      return res.status(404).json({ message: 'Compra no encontrada' });
    }
    if (compra.estado_comprobante === 'Pagado' || compra.estado_comprobante === 'Cancelado') {
      await connection.rollback();
      return res.status(400).json({ message: 'No se puede cancelar una compra ya pagada o cancelada' });
    }

    const detalles = await DetalleCompra.findByCompraId(id);
    if (compra.tipo_egreso === 'Compra') {
      for (const d of detalles) {
        // Revertir stock
        await Producto.decrementStock(d.producto_id, organizacion_id, d.cantidad, connection);
        // Eliminar movimientos de inventario asociados a esta compra
        await connection.query(
          'DELETE FROM movimientos_inventario WHERE referencia_tipo = "Compra" AND referencia_id = ? AND organizacion_id = ? AND producto_id = ?',
          [id, organizacion_id, d.producto_id]
        );
      }
    }

    await Compra.cancel(id, organizacion_id);

    await connection.commit();
    res.json({ message: 'Compra cancelada exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al cancelar compra:', error);
    res.status(500).json({ message: 'Error al cancelar compra', error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// 6. DASHBOARD COMPLETO (AGRUPA TODOS LOS KPIs)
// ============================================================
exports.obtenerDashboardCompras = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { mes, anio } = req.query;
    const mesActual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anioActual = anio ? parseInt(anio) : new Date().getFullYear();

    const kpis = await Compra.getKPIs(organizacion_id, mesActual, anioActual);
    const gastosPorMes = await Compra.getEvolucionGastos(organizacion_id, anioActual);
    const alertas = await Compra.getAlertasVencimiento(organizacion_id);
    const topProveedores = await Compra.getTopProveedores(organizacion_id, anioActual);
    const distribucion = await Compra.getDistribucionEgresos(organizacion_id, mesActual, anioActual);

    res.json({
      kpis,
      gastosPorMes,
      alertas,
      topProveedores,
      distribucion,
      periodo: { mes: mesActual, anio: anioActual },
    });
  } catch (error) {
    console.error('❌ Error al obtener dashboard de compras:', error);
    res.status(500).json({ message: 'Error al obtener dashboard', error: error.message });
  }
};

// ============================================================
// 7. KPIs DEL DASHBOARD
// ============================================================
exports.getKPIs = async (organizacion_id, mes, anio) => {
  try {
    const [egresosResult] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );
    const totalEgresos = parseFloat(egresosResult[0]?.total) || 0;

    const [cuentasResult] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND estado_comprobante = 'Pendiente' AND condicion_operacion = 'Credito'`,
      [organizacion_id]
    );
    const cuentasPorPagar = parseFloat(cuentasResult[0]?.total) || 0;

    const [ivaResult] = await pool.query(
      `SELECT COALESCE(SUM(iva_credito_fiscal), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND tipo_documento = 'Credito_Fiscal' AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );
    const ivaCreditoFiscal = parseFloat(ivaResult[0]?.total) || 0;

    const [comprasResult] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND tipo_egreso = 'Compra' AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );
    const totalCompras = parseFloat(comprasResult[0]?.total) || 0;

    const [gastosResult] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND tipo_egreso = 'Gasto_Operativo' AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );
    const totalGastos = parseFloat(gastosResult[0]?.total) || 0;

    return {
      total_egresos: totalEgresos,
      cuentas_por_pagar: cuentasPorPagar,
      iva_credito_fiscal: ivaCreditoFiscal,
      total_compras: totalCompras,
      total_gastos: totalGastos,
    };
  } catch (error) {
    console.error('❌ Error en getKPIs:', error);
    throw error;
  }
};

// ============================================================
// 8. EVOLUCIÓN DE GASTOS POR MES
// ============================================================
exports.getEvolucionGastos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio } = req.query;
    const anioActual = anio || new Date().getFullYear();
    const data = await Compra.getEvolucionGastos(organizacion_id, anioActual);
    res.json(data);
  } catch (error) {
    console.error('❌ Error en getEvolucionGastos:', error);
    res.status(500).json({ message: 'Error al obtener evolución de gastos', error: error.message });
  }
};

// ============================================================
// 9. DISTRIBUCIÓN DE EGRESOS
// ============================================================
exports.getDistribucionEgresos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { mes, anio } = req.query;
    const mesActual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anioActual = anio ? parseInt(anio) : new Date().getFullYear();
    const data = await Compra.getDistribucionEgresos(organizacion_id, mesActual, anioActual);
    res.json(data);
  } catch (error) {
    console.error('❌ Error en getDistribucionEgresos:', error);
    res.status(500).json({ message: 'Error al obtener distribución de egresos', error: error.message });
  }
};

// ============================================================
// 10. ALERTAS DE VENCIMIENTO
// ============================================================
exports.getAlertasVencimiento = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = await Compra.getAlertasVencimiento(organizacion_id);
    res.json(data);
  } catch (error) {
    console.error('❌ Error en getAlertasVencimiento:', error);
    res.status(500).json({ message: 'Error al obtener alertas de vencimiento', error: error.message });
  }
};

// ============================================================
// 11. TOP 5 PROVEEDORES
// ============================================================
exports.getTopProveedores = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio } = req.query;
    const anioActual = anio || new Date().getFullYear();
    const data = await Compra.getTopProveedores(organizacion_id, anioActual);
    res.json(data);
  } catch (error) {
    console.error('❌ Error en getTopProveedores:', error);
    res.status(500).json({ message: 'Error al obtener top proveedores', error: error.message });
  }
};

// ============================================================
// 12. AÑOS DISPONIBLES
// ============================================================
exports.getAniosDisponibles = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      'SELECT DISTINCT YEAR(fecha_registro) AS anio FROM compras_gastos WHERE organizacion_id = ? ORDER BY anio DESC',
      [organizacion_id]
    );
    const anios = rows.map(r => r.anio);
    if (anios.length === 0) {
      const year = new Date().getFullYear();
      return res.json([year]);
    }
    res.json(anios);
  } catch (error) {
    console.error('❌ Error al obtener años disponibles:', error);
    res.status(500).json({ message: 'Error al obtener años', error: error.message });
  }
};

// ============================================================
// 14. GENERAR PDF DE COMPRA (INTERNO - PARA USO ADMINISTRATIVO)
// ============================================================
function numeroALetras(num) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (num === 0) return 'CERO';

  const numStr = num.toFixed(2);
  const partes = numStr.split('.');
  const entero = parseInt(partes[0]);
  const decimal = parseInt(partes[1]);

  let resultado = '';

  // Miles
  const miles = Math.floor(entero / 1000);
  const resto = entero % 1000;
  if (miles > 0) {
    resultado += (miles === 1 ? 'MIL' : numeroALetras(miles) + ' MIL');
    if (resto > 0) resultado += ' ';
  }

  // Centenas, decenas, unidades
  if (resto > 0) {
    const c = Math.floor(resto / 100);
    const d = Math.floor((resto % 100) / 10);
    const u = resto % 10;

    if (c > 0) {
      if (c === 1 && resto % 100 === 0) resultado += 'CIEN';
      else resultado += centenas[c];
      if (resto % 100 > 0) resultado += ' ';
    }

    if (d > 0) {
      if (d === 1 && u > 0) {
        resultado += especiales[u];
      } else {
        if (d === 2 && u > 0) {
          resultado += 'VEINTI' + unidades[u];
        } else {
          resultado += decenas[d - 1];
          if (u > 0) resultado += ' Y ' + unidades[u];
        }
      }
    } else if (u > 0) {
      resultado += unidades[u];
    }
  }

  resultado += ` CON ${decimal.toString().padStart(2, '0')}/100`;
  return resultado;
}

exports.generarPDFCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    // 1. Obtener la compra y detalles
    const compra = await Compra.findById(id, organizacion_id);
    if (!compra) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }
    const detalles = await DetalleCompra.findByCompraId(id);

    // 2. Generar PDF con PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    let buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=comprobante_${compra.numero_comprobante}.pdf`);
      res.send(pdfData);
    });

    // ============================================================
    // DISEÑO DEL PDF 
    // ============================================================

    const primaryColor = '#1a1a2e';
    const textColor = '#333333';
    const lightGray = '#f5f5f5';

    // ---------- ENCABEZADO ----------
    doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor);
    doc.text('COMPROBANTE DE COMPRA', 40, 40, { align: 'right' });
    
    doc.fontSize(10).fillColor('#666666');
    doc.text(`N° ${compra.numero_comprobante}`, 40, doc.y - 5, { align: 'right' });
    
    const fechaFormateada = new Date(compra.fecha_registro).toLocaleDateString('es-SV');
    doc.text(`Fecha de Registro: ${fechaFormateada}`, { align: 'right' });

    // ---------- DATOS DEL EMISOR ----------
    doc.moveDown(2);
    const emisorTop = doc.y;
    
    doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
    doc.text('EMISOR (Tu Empresa)', 40, emisorTop);
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    // Fijamos la coordenada X en 40 para asegurarnos que no se mueva
    doc.text('MK sor', 40, doc.y);
    doc.text('NIT: 0804-0123-101-6', 40, doc.y);
    doc.text('NRC: 95899565', 40, doc.y);
    doc.text('Colonia Divina Providencia, BK Y Pasaje 7', 40, doc.y);
    doc.text('Tel: 71409016', 40, doc.y);
    
    const emisorBottom = doc.y; // Guardamos dónde terminó esta columna

    // ---------- DATOS DEL PROVEEDOR ----------
    doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
    doc.text('PROVEEDOR', 300, emisorTop);
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    // Fijamos la coordenada X en 300 para esta columna
    doc.text(compra.proveedor_nombre.toUpperCase(), 300, doc.y);
    if (compra.proveedor_nit) doc.text(`NIT: ${compra.proveedor_nit}`, 300, doc.y);
    if (compra.fecha_vencimiento) {
      doc.text(`Vencimiento: ${new Date(compra.fecha_vencimiento).toLocaleDateString('es-SV')}`, 300, doc.y);
    }

    const proveedorBottom = doc.y; // Guardamos dónde terminó esta columna

    // ---------- INFORMACIÓN EXTRA (UUID, Tipo, Condición) ----------
    // Calculamos cuál de las dos columnas bajó más y le sumamos 20px de margen
    const infoY = Math.max(emisorBottom, proveedorBottom) + 20;
    doc.y = infoY; // Reseteamos la posición Y del documento
    
    doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
    
    doc.text('Tipo de Documento:', 40, infoY);
    doc.font('Helvetica').text(compra.tipo_documento.replace('_', ' '), 145, infoY);
    
    doc.font('Helvetica-Bold').text('Condición:', 300, infoY);
    doc.font('Helvetica').text(compra.condicion_operacion || 'Contado', 360, infoY);

    if (compra.uuid_dte) {
      doc.font('Helvetica-Bold').text('UUID:', 40, infoY + 15);
      doc.font('Helvetica').text(compra.uuid_dte, 145, infoY + 15);
    }

    // ---------- TABLA DE PRODUCTOS (ANCHOS CORREGIDOS) ----------
    const tableTop = doc.y + (compra.uuid_dte ? 25 : 20);
    // Redistribución de anchos para darle más espacio al Total
    const colX = [40, 80, 270, 340, 415, 470]; 
    const colWidths = [40, 190, 70, 75, 55, 85];

    // Cabecera oscura
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    doc.rect(40, tableTop, 515, 20).fill(primaryColor);
    doc.fillColor('#ffffff');
    doc.text('CANT.', colX[0] + 5, tableTop + 5);
    doc.text('PRODUCTO', colX[1] + 10, tableTop + 5);
    doc.text('PRECIO UNIT.', colX[2], tableTop + 5, { width: colWidths[2], align: 'right' });
    doc.text('SUBTOTAL', colX[3], tableTop + 5, { width: colWidths[3], align: 'right' });
    doc.text('IVA', colX[4], tableTop + 5, { width: colWidths[4], align: 'right' });
    doc.text('TOTAL', colX[5], tableTop + 5, { width: colWidths[5], align: 'right' });

    // Filas
    let rowY = tableTop + 25;
    let subtotalTotal = 0;
    let ivaTotal = 0;

    detalles.forEach((d, index) => {
      const cantidad = parseFloat(d.cantidad) || 0;
      const precio = parseFloat(d.precio_unitario) || 0;
      const subtotal = cantidad * precio;
      const iva = compra.tipo_documento === 'Credito_Fiscal' ? subtotal * 0.13 : 0;
      const totalItem = subtotal + iva;

      subtotalTotal += subtotal;
      ivaTotal += iva;

      // Color alterno
      if (index % 2 === 0) {
        doc.rect(40, rowY - 3, 515, 18).fill(lightGray);
      }

      doc.fillColor('#333333').font('Helvetica').fontSize(8.5);
      doc.text(cantidad.toString(), colX[0] + 5, rowY);
      doc.text(d.producto_nombre || 'Producto', colX[1] + 10, rowY, { width: colWidths[1], truncate: true });
      doc.text(`$${precio.toFixed(2)}`, colX[2], rowY, { width: colWidths[2], align: 'right' });
      doc.text(`$${subtotal.toFixed(2)}`, colX[3], rowY, { width: colWidths[3], align: 'right' });
      doc.text(compra.tipo_documento === 'Credito_Fiscal' ? `$${iva.toFixed(2)}` : 'N/A', colX[4], rowY, { width: colWidths[4], align: 'right' });
      doc.text(`$${totalItem.toFixed(2)}`, colX[5], rowY, { width: colWidths[5], align: 'right' });

      rowY += 20;

      // Salto de página básico si hay muchos productos
      if (rowY > 700) { 
        doc.addPage(); 
        rowY = 50; 
      }
    });

    // ---------- TOTALES DINÁMICOS ----------
    const totalsY = rowY + 15;
    let currentTotalY = totalsY;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
    
    // Subtotal
    doc.text('Subtotal:', 370, currentTotalY, { width: 90, align: 'right' });
    doc.text(`$${subtotalTotal.toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
    currentTotalY += 15;

    // IVA (Solo si aplica)
    if (compra.tipo_documento === 'Credito_Fiscal') {
      doc.text('IVA (13%):', 370, currentTotalY, { width: 90, align: 'right' });
      doc.text(`$${ivaTotal.toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
      currentTotalY += 15;
    }

    // Retención
    if (parseFloat(compra.retencion_iva) > 0) {
      doc.text('Retención (1%):', 370, currentTotalY, { width: 90, align: 'right' });
      doc.text(`-$${parseFloat(compra.retencion_iva).toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
      currentTotalY += 15;
    }

    // Percepción
    if (parseFloat(compra.percepcion_iva) > 0) {
      doc.text('Percepción (1%):', 370, currentTotalY, { width: 90, align: 'right' });
      doc.text(`+$${parseFloat(compra.percepcion_iva).toFixed(2)}`, 470, currentTotalY, { width: 85, align: 'right' });
      currentTotalY += 15;
    }

    // Bloque azul oscuro del total (Ensanchado a la izquierda para cubrir bien)
    doc.rect(365, currentTotalY + 5, 190, 25).fill(primaryColor);
    doc.fillColor('#ffffff');
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('TOTAL', 380, currentTotalY + 13);
    doc.text(`$${parseFloat(compra.total).toFixed(2)}`, 470, currentTotalY + 13, { width: 85, align: 'right' });

    // ---------- VALOR EN LETRAS ----------
    doc.fillColor('#333333');
    doc.font('Helvetica').fontSize(8.5);
    const totalLetras = numeroALetras(parseFloat(compra.total));
    doc.text(`SON: ${totalLetras} DÓLARES`, 40, currentTotalY + 40);

    // ---------- PIE DE PÁGINA ----------
    const footerY = 750; 
    doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
    
    doc.fillColor('#9ca3af').fontSize(8);
    doc.text(`Documento generado el: ${new Date().toLocaleDateString('es-SV')} | Comprobante interno de compra`, 40, footerY + 10);
    if (compra.uuid_dte) {
      doc.text(`UUID: ${compra.uuid_dte}`, 40, footerY + 22);
    }

    doc.end();

  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
};

// ============================================================
// EXPORTAR TODAS LAS COMPRAS DEL AÑO (sin filtros)
// ============================================================
exports.exportarTodasCompras = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio } = req.query;
    if (!anio) return res.status(400).json({ message: 'El año es requerido' });
    const filters = { anio: parseInt(anio) };
    const result = await Compra.findAll(organizacion_id, filters, 1, 99999);
    const compras = result.compras || [];
    if (compras.length === 0) return res.status(404).json({ message: 'No hay compras para el año seleccionado' });

    const data = compras.map(c => ({
      'Comprobante': c.numero_comprobante,
      'Proveedor': c.proveedor_nombre,
      'NIT Proveedor': c.proveedor_nit || '',
      'Tipo Documento': c.tipo_documento,
      'Tipo Egreso': c.tipo_egreso,
      'Fecha': c.fecha_registro,
      'Condición': c.condicion_operacion || 'Contado',
      'Vencimiento': c.fecha_vencimiento || '',
      'Subtotal': parseFloat(c.monto_subtotal).toFixed(2),
      'IVA': parseFloat(c.iva_credito_fiscal || 0).toFixed(2),
      'Retención': parseFloat(c.retencion_iva || 0).toFixed(2),
      'Percepción': parseFloat(c.percepcion_iva || 0).toFixed(2),
      'Total': parseFloat(c.total).toFixed(2),
      'Estado': c.estado_comprobante,
      'UUID': c.uuid_dte || '',
      'N° Control': c.numero_control || '',
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
    const filename = `compras_todas_${anio}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar todas las compras:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};


// ============================================================
// EXPORTAR COMPRAS FILTRADAS (con los filtros de la tabla)
// ============================================================
exports.exportarComprasFiltradas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search, mes, anio, proveedor_id, estado_comprobante, tipo_documento, tipo_egreso, condicion_operacion } = req.query;
    const filters = {};
    if (search) filters.search = search;
    if (mes) filters.mes = parseInt(mes);
    if (anio) filters.anio = parseInt(anio);
    if (proveedor_id) filters.proveedor_id = parseInt(proveedor_id);
    if (estado_comprobante) filters.estado_comprobante = estado_comprobante;
    if (tipo_documento) filters.tipo_documento = tipo_documento;
    if (tipo_egreso) filters.tipo_egreso = tipo_egreso;
    if (condicion_operacion) filters.condicion_operacion = condicion_operacion;

    const result = await Compra.findAll(organizacion_id, filters, 1, 99999);
    const compras = result.compras || [];
    if (compras.length === 0) return res.status(404).json({ message: 'No hay compras con los filtros aplicados' });

    const data = compras.map(c => ({
      'Comprobante': c.numero_comprobante,
      'Proveedor': c.proveedor_nombre,
      'NIT Proveedor': c.proveedor_nit || '',
      'Tipo Documento': c.tipo_documento,
      'Tipo Egreso': c.tipo_egreso,
      'Fecha': c.fecha_registro,
      'Condición': c.condicion_operacion || 'Contado',
      'Vencimiento': c.fecha_vencimiento || '',
      'Subtotal': parseFloat(c.monto_subtotal).toFixed(2),
      'IVA': parseFloat(c.iva_credito_fiscal || 0).toFixed(2),
      'Retención': parseFloat(c.retencion_iva || 0).toFixed(2),
      'Percepción': parseFloat(c.percepcion_iva || 0).toFixed(2),
      'Total': parseFloat(c.total).toFixed(2),
      'Estado': c.estado_comprobante,
      'UUID': c.uuid_dte || '',
      'N° Control': c.numero_control || '',
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
    const filename = `compras_filtradas_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar compras filtradas:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};

// ============================================================
// MARCAR COMPRA COMO PAGADA
// ============================================================
exports.marcarComoPagada = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const compra = await Compra.findById(id, organizacion_id);
    if (!compra) return res.status(404).json({ message: 'Compra no encontrada' });
    if (compra.estado_comprobante === 'Pagado') return res.status(400).json({ message: 'La compra ya está pagada' });
    if (compra.estado_comprobante === 'Cancelado') return res.status(400).json({ message: 'No se puede pagar una compra cancelada' });
    await pool.query('UPDATE compras_gastos SET estado_comprobante = "Pagado" WHERE id = ? AND organizacion_id = ?', [id, organizacion_id]);
    res.json({ message: 'Compra marcada como pagada' });
  } catch (error) {
    console.error('❌ Error al marcar compra como pagada:', error);
    res.status(500).json({ message: 'Error al marcar compra como pagada', error: error.message });
  }
};

// ============================================================
// DATOS PARA GRÁFICA: COMPRAS PAGADAS VS PENDIENTES POR MES
// ============================================================
exports.getComparacionPagosPorMes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio } = req.query;
    const anioActual = anio || new Date().getFullYear();
    const [rows] = await pool.query(
      `SELECT 
         MONTH(fecha_registro) AS mes,
         COALESCE(SUM(CASE WHEN estado_comprobante = 'Pagado' THEN total ELSE 0 END), 0) AS pagadas,
         COALESCE(SUM(CASE WHEN estado_comprobante = 'Pendiente' THEN total ELSE 0 END), 0) AS pendientes
       FROM compras_gastos
       WHERE organizacion_id = ?
         AND YEAR(fecha_registro) = ?
         AND tipo_egreso = 'Compra'
         AND estado_comprobante != 'Cancelado'
       GROUP BY MONTH(fecha_registro)
       ORDER BY mes ASC`,
      [organizacion_id, anioActual]
    );
    const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, pagadas: 0, pendientes: 0 }));
    for (const row of rows) {
      const idx = meses.findIndex(m => m.mes === row.mes);
      if (idx !== -1) {
        meses[idx].pagadas = parseFloat(row.pagadas);
        meses[idx].pendientes = parseFloat(row.pendientes);
      }
    }
    res.json(meses);
  } catch (error) {
    console.error('❌ Error al obtener comparación de pagos:', error);
    res.status(500).json({ message: 'Error al obtener comparación de pagos', error: error.message });
  }
};

// ============================================================
// EXPORTAR DATOS DE GRÁFICA: EVOLUCIÓN DE GASTOS
// ============================================================
exports.exportarEvolucionGastos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio } = req.query;
    const anioActual = anio || new Date().getFullYear();
    const data = await Compra.getEvolucionGastos(organizacion_id, anioActual);
    const headers = ['Mes', 'Compras', 'Gastos Operativos', 'Total'];
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of data) {
      const nombreMes = new Date(2024, row.mes - 1).toLocaleString('es', { month: 'long' });
      csv += `${nombreMes};${row.compras.toFixed(2)};${row.gastos.toFixed(2)};${row.total.toFixed(2)}\n`;
    }
    const filename = `evolucion_gastos_${anioActual}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar evolución de gastos:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};

// ============================================================
// EXPORTAR DATOS DE GRÁFICA: COMPARACIÓN PAGOS POR MES
// ============================================================
exports.exportarComparacionPagos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio } = req.query;
    const anioActual = anio || new Date().getFullYear();
    const data = await exports.getComparacionPagosPorMes(organizacion_id, anioActual);
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
// OBTENER COMPRAS PENDIENTES DE PAGO (TODAS)
// ============================================================
exports.getComprasPendientes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT cg.*, p.razon_social AS proveedor_nombre, p.numero_documento AS proveedor_nit
       FROM compras_gastos cg
       LEFT JOIN proveedores p ON cg.proveedor_id = p.id
       WHERE cg.organizacion_id = ?
         AND cg.estado_comprobante = 'Pendiente'
         AND cg.condicion_operacion = 'Credito'
       ORDER BY cg.fecha_vencimiento ASC`,
      [organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener compras pendientes:', error);
    res.status(500).json({ message: 'Error al obtener compras pendientes', error: error.message });
  }
};

exports.getComprasPendientesConVencimiento = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT cg.*, p.razon_social AS proveedor_nombre, p.numero_documento AS proveedor_nit
       FROM compras_gastos cg
       LEFT JOIN proveedores p ON cg.proveedor_id = p.id
       WHERE cg.organizacion_id = ?
         AND cg.estado_comprobante = 'Pendiente'
         AND cg.condicion_operacion = 'Credito'
         AND cg.fecha_vencimiento IS NOT NULL
       ORDER BY cg.fecha_vencimiento ASC`,
      [organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener compras pendientes con vencimiento:', error);
    res.status(500).json({ message: 'Error al obtener compras pendientes', error: error.message });
  }
};

// ============================================================
// TOP 5 PRODUCTOS POR INGRESOS EN EL MES
// ============================================================
exports.getTopProductosMes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { mes, anio } = req.query;
    
    if (!anio) return res.status(400).json({ message: 'El año es requerido' });

    // Consulta base (Anual)
    let query = `
      SELECT 
         p.id,
         p.nombre AS producto,
         p.codigo_sku AS sku,
         COALESCE(SUM(dc.cantidad), 0) AS total_cantidad,
         COALESCE(SUM(dc.subtotal), 0) AS total_ingresos
       FROM detalles_compra dc
       JOIN productos p ON dc.producto_id = p.id
       JOIN compras_gastos cg ON dc.compra_gasto_id = cg.id
       WHERE cg.organizacion_id = ?
         AND cg.estado_comprobante != 'Cancelado'
         AND YEAR(cg.fecha_registro) = ?
    `;
    let queryParams = [organizacion_id, anio];

    // Si viene el mes y no está vacío, agregamos el filtro de mes a la consulta
    if (mes && mes !== '') {
      query += ` AND MONTH(cg.fecha_registro) = ?`;
      queryParams.push(mes);
    }

    // Cerramos la consulta con el group by y el limit
    query += `
       GROUP BY p.id, p.nombre, p.codigo_sku
       ORDER BY total_ingresos DESC
       LIMIT 5
    `;

    const [rows] = await pool.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener top productos:', error);
    res.status(500).json({ message: 'Error al obtener top productos', error: error.message });
  }
};


exports.exportarTopProductos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { mes, anio } = req.query;
    
    const anioActual = anio ? parseInt(anio) : new Date().getFullYear();

    // Consulta base (Anual)
    let query = `
      SELECT 
         p.id,
         p.nombre AS producto,
         p.codigo_sku AS sku,
         COALESCE(SUM(dc.cantidad), 0) AS total_cantidad,
         COALESCE(SUM(dc.subtotal), 0) AS total_ingresos
       FROM detalles_compra dc
       JOIN productos p ON dc.producto_id = p.id
       JOIN compras_gastos cg ON dc.compra_gasto_id = cg.id
       WHERE cg.organizacion_id = ?
         AND cg.estado_comprobante != 'Cancelado'
         AND YEAR(cg.fecha_registro) = ?
    `;
    let queryParams = [organizacion_id, anioActual];

    // Si viene el mes, lo filtramos
    if (mes && mes !== '') {
      query += ` AND MONTH(cg.fecha_registro) = ?`;
      queryParams.push(parseInt(mes));
    }

    query += `
       GROUP BY p.id, p.nombre, p.codigo_sku
       ORDER BY total_ingresos DESC
       LIMIT 5
    `;

    const [rows] = await pool.query(query, queryParams);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay datos de productos para exportar' });
    }

    const headers = ['Producto', 'Cantidad', 'Total Ingresos'];
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of rows) {
      csv += `${row.producto};${row.total_cantidad};${parseFloat(row.total_ingresos).toFixed(2)}\n`;
    }

    // Nombre dinámico para el archivo
    const filename = (mes && mes !== '') 
      ? `top_productos_${mes}_${anioActual}.csv` 
      : `top_productos_anual_${anioActual}.csv`;

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar top productos:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};