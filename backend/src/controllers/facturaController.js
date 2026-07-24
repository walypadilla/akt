// backend/src/controllers/facturaController.js
const Factura = require('../models/Factura');
const DetalleFactura = require('../models/DetalleFactura');
const { pool } = require('../config/db');

// --- Funciones auxiliares ---
async function getClienteInfo(cliente_id, organizacion_id) {
  const [rows] = await pool.query(
    'SELECT tipo_contribuyente, nit, nrc, giro, nombre, telefono FROM clientes WHERE id = ? AND organizacion_id = ?',
    [cliente_id, organizacion_id]
  );
  return rows[0];
}

async function generarNumeroCorrelativo(organizacion_id, tipo_documento) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM facturas 
     WHERE organizacion_id = ? AND tipo_documento = ? AND eliminado_en IS NULL`,
    [organizacion_id, tipo_documento]
  );
  const count = rows[0].count + 1;
  const prefix = tipo_documento === 'CCF' ? 'CCF' : 'FAF';
  return `${prefix}-${String(count).padStart(6, '0')}`;
}

// ============================================================
// DESCUENTO DE STOCK PARA PRODUCTOS INDIVIDUALES Y KITS
// ============================================================

/**
 * Descuenta stock de un producto individual (verifica si es servicio)
 */
async function descuentoProductoIndividual(
  productoId,
  cantidad,
  organizacion_id,
  facturaId,
  usuario_id,
  connection
) {
  // 1. Obtener el producto para verificar su tipo
  const [producto] = await connection.query(
    'SELECT tipo, stock_actual FROM productos WHERE id = ? AND organizacion_id = ?',
    [productoId, organizacion_id]
  );
  if (producto.length === 0) {
    throw new Error('Producto no encontrado');
  }

  // 2. Si es un servicio, no se descuenta stock
  if (producto[0].tipo === 'Servicio') {
    // Registrar movimiento de servicio (sin afectar inventario)
    await connection.query(
      `INSERT INTO movimientos_inventario 
       (organizacion_id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
        referencia_tipo, referencia_id, observacion, usuario_id)
       VALUES (?, ?, 'Servicio', ?, ?, ?, 'Venta', ?, 'Venta de servicio', ?)`,
      [
        organizacion_id,
        productoId,
        cantidad,
        0, // stock_anterior
        0, // stock_nuevo
        facturaId,
        usuario_id,
      ]
    );
    return; // Salimos sin descontar stock
  }

  // 3. Producto normal (tipo Producto)
  const [prod] = await connection.query(
    `SELECT stock_actual FROM productos WHERE id = ? AND organizacion_id = ? FOR UPDATE`,
    [productoId, organizacion_id]
  );
  if (prod[0].stock_actual < cantidad) {
    throw new Error(`Stock insuficiente. Disponible: ${prod[0].stock_actual}, solicitado: ${cantidad}`);
  }

  await connection.query(
    `UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ? AND organizacion_id = ?`,
    [cantidad, productoId, organizacion_id]
  );

  await connection.query(
    `INSERT INTO movimientos_inventario 
     (organizacion_id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
      referencia_tipo, referencia_id, observacion, usuario_id)
     SELECT ?, ?, 'Salida', ?, stock_actual, stock_actual - ?, 'Venta', ?, 'Venta directa', ?
     FROM productos WHERE id = ? AND organizacion_id = ?`,
    [
      organizacion_id,
      productoId,
      cantidad,
      cantidad,
      facturaId,
      usuario_id,
      productoId,
      organizacion_id,
    ]
  );
}

/**
 * Descuenta stock de un kit y sus componentes al venderlo
 */
async function descuentoKitYComponentes(
  kitProductoId,
  cantidadVendida,
  organizacion_id,
  facturaId,
  usuario_id,
  connection
) {
  // Verificar que el kit no sea servicio (los kits siempre son Producto, pero por seguridad)
  const [kitCheck] = await connection.query(
    'SELECT tipo FROM productos WHERE id = ? AND organizacion_id = ?',
    [kitProductoId, organizacion_id]
  );
  if (kitCheck.length > 0 && kitCheck[0].tipo === 'Servicio') {
    return; // No hacemos nada si es servicio
  }

  // 1. Bloquear y obtener stock del kit
  const [kit] = await connection.query(
    `SELECT stock_actual FROM productos WHERE id = ? AND organizacion_id = ? FOR UPDATE`,
    [kitProductoId, organizacion_id]
  );
  if (kit.length === 0) {
    throw new Error('Kit no encontrado');
  }
  if (kit[0].stock_actual < cantidadVendida) {
    throw new Error(`Stock insuficiente del kit. Disponible: ${kit[0].stock_actual}, solicitado: ${cantidadVendida}`);
  }

  // 2. Descontar stock del kit
  await connection.query(
    `UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ? AND organizacion_id = ?`,
    [cantidadVendida, kitProductoId, organizacion_id]
  );

  // 3. Registrar movimiento del kit (salida)
  await connection.query(
    `INSERT INTO movimientos_inventario 
     (organizacion_id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, 
      referencia_tipo, referencia_id, observacion, usuario_id)
     SELECT ?, ?, 'Salida', ?, stock_actual, stock_actual - ?, 'Venta', ?, 'Venta de kit', ?
     FROM productos WHERE id = ? AND organizacion_id = ?`,
    [
      organizacion_id,
      kitProductoId,
      cantidadVendida,
      cantidadVendida,
      facturaId,
      usuario_id,
      kitProductoId,
      organizacion_id,
    ]
  );

  // 4. Obtener componentes del kit
  const [componentes] = await connection.query(
    `SELECT producto_componente_id, cantidad FROM producto_componentes WHERE producto_kit_id = ?`,
    [kitProductoId]
  );

  // 5. Para cada componente, descontar stock si es Producto (no Servicio)
  for (const comp of componentes) {
    // Verificar que el componente sea Producto
    const [compTipo] = await connection.query(
      'SELECT tipo FROM productos WHERE id = ? AND organizacion_id = ?',
      [comp.producto_componente_id, organizacion_id]
    );
    if (compTipo.length > 0 && compTipo[0].tipo === 'Servicio') {
      continue; // Saltamos este componente si es servicio
    }

    const cantidadADescontar = comp.cantidad * cantidadVendida;

    const [prod] = await connection.query(
      `SELECT stock_actual FROM productos WHERE id = ? AND organizacion_id = ? FOR UPDATE`,
      [comp.producto_componente_id, organizacion_id]
    );
    if (prod.length === 0) {
      throw new Error(`Componente ${comp.producto_componente_id} no encontrado`);
    }
    if (prod[0].stock_actual < cantidadADescontar) {
      throw new Error(
        `Stock insuficiente del componente ID ${comp.producto_componente_id}. ` +
        `Disponible: ${prod[0].stock_actual}, necesario: ${cantidadADescontar}`
      );
    }

    await connection.query(
      `UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ? AND organizacion_id = ?`,
      [cantidadADescontar, comp.producto_componente_id, organizacion_id]
    );

    await connection.query(
      `INSERT INTO movimientos_inventario 
       (organizacion_id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
        referencia_tipo, referencia_id, observacion, usuario_id)
       SELECT ?, ?, 'Salida', ?, stock_actual, stock_actual - ?, 'Venta', ?, 'Descuento por kit', ?
       FROM productos WHERE id = ? AND organizacion_id = ?`,
      [
        organizacion_id,
        comp.producto_componente_id,
        cantidadADescontar,
        cantidadADescontar,
        facturaId,
        usuario_id,
        comp.producto_componente_id,
        organizacion_id,
      ]
    );
  }
}

// ============================================================
// RECALCULAR TOTALES DE FACTURA
// ============================================================
async function recalcularTotalesFactura(factura_id, connection = null) {
  const db = connection || pool;
  const [detalles] = await db.query(
    `SELECT subtotal, iva FROM detalles_factura WHERE factura_id = ?`,
    [factura_id]
  );
  let subtotal = 0;
  let ivaTotal = 0;
  for (const d of detalles) {
    subtotal += parseFloat(d.subtotal) || 0;
    ivaTotal += parseFloat(d.iva) || 0;
  }
  const [factura] = await db.query(
    `SELECT descuento, retencion_1, intereses_mora, estado FROM facturas WHERE id = ?`,
    [factura_id]
  );
  if (!factura) return;
  const descuento = parseFloat(factura.descuento) || 0;
  const retencion = parseFloat(factura.retencion_1) || 0;
  const intereses = parseFloat(factura.intereses_mora) || 0;
  const base = subtotal - descuento;
  const iva = base * 0.13;
  const total = base + iva - retencion + intereses;
  await db.query(
    `UPDATE facturas SET subtotal_sumas = ?, iva_13 = ?, total_pagar = ? WHERE id = ?`,
    [subtotal, iva, total, factura_id]
  );
  return { subtotal, iva, total };
}

// ============================================================
// CONTROLADORES DE FACTURA
// ============================================================

exports.crearFactura = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { organizacion_id, usuario_id } = req;
    const {
      cliente_id,
      tipo_documento = 'CCF',
      descuento = 0,
      intereses_mora = 0,
      detalles,
      retencion_1 = 0,
    } = req.body;

    const clienteInfo = await getClienteInfo(cliente_id, organizacion_id);
    if (!clienteInfo) {
      await connection.rollback();
      return res.status(400).json({ message: 'Cliente no encontrado' });
    }

    const numero_correlativo = await generarNumeroCorrelativo(organizacion_id, tipo_documento);

    let subtotal = 0;
    for (const detalle of detalles) {
      const [producto] = await connection.query(
        'SELECT precio_unitario FROM productos WHERE id = ? AND organizacion_id = ?',
        [detalle.producto_id, organizacion_id]
      );
      if (!producto || producto.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: `Producto ${detalle.producto_id} no encontrado` });
      }
      const precio = parseFloat(producto[0].precio_unitario);
      const cantidad = parseInt(detalle.cantidad);
      subtotal += precio * cantidad;
    }

    const base = subtotal - descuento;
    const iva = base * 0.13;
    const total = base + iva - retencion_1 + intereses_mora;

    const [result] = await connection.query(
      `INSERT INTO facturas 
       (organizacion_id, cliente_id, tipo_documento, numero_correlativo, 
        subtotal_sumas, descuento, iva_13, retencion_1, intereses_mora, total_pagar, usuario_id, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Emitida')`,
      [
        organizacion_id,
        cliente_id,
        tipo_documento,
        numero_correlativo,
        subtotal,
        descuento,
        iva,
        retencion_1,
        intereses_mora,
        total,
        usuario_id,
      ]
    );
    const facturaId = result.insertId;

    for (const detalle of detalles) {
      const [producto] = await connection.query(
        'SELECT precio_unitario, es_kit, tipo FROM productos WHERE id = ? AND organizacion_id = ?',
        [detalle.producto_id, organizacion_id]
      );
      const precio = parseFloat(producto[0].precio_unitario);
      const cantidad = parseInt(detalle.cantidad);
      const subtotalDetalle = precio * cantidad;

      await connection.query(
        `INSERT INTO detalles_factura 
         (factura_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [facturaId, detalle.producto_id, cantidad, precio, subtotalDetalle]
      );

      // Descontar stock solo si es Producto (no Servicio)
      if (producto[0].tipo !== 'Servicio') {
        if (producto[0]?.es_kit) {
          await descuentoKitYComponentes(
            detalle.producto_id,
            cantidad,
            organizacion_id,
            facturaId,
            usuario_id,
            connection
          );
        } else {
          await descuentoProductoIndividual(
            detalle.producto_id,
            cantidad,
            organizacion_id,
            facturaId,
            usuario_id,
            connection
          );
        }
      } else {
        // Registrar movimiento de servicio
        await connection.query(
          `INSERT INTO movimientos_inventario 
           (organizacion_id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
            referencia_tipo, referencia_id, observacion, usuario_id)
           VALUES (?, ?, 'Servicio', ?, ?, ?, 'Venta', ?, 'Venta de servicio', ?)`,
          [
            organizacion_id,
            detalle.producto_id,
            cantidad,
            0,
            0,
            facturaId,
            usuario_id,
          ]
        );
      }
    }

    await connection.commit();
    res.status(201).json({
      message: 'Factura creada correctamente',
      factura_id: facturaId,
      numero_correlativo,
      total,
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [crearFactura] Error:', error);
    res.status(500).json({
      message: 'Error al crear factura',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.obtenerFacturas = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const facturas = await Factura.findByOrganizacion(organizacion_id);
    res.json(facturas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener facturas' });
  }
};

exports.anularFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    if (factura.estado === 'Anulada') {
      return res.status(400).json({ message: 'La factura ya está anulada' });
    }
    await Factura.update(id, organizacion_id, { estado: 'Anulada' });
    res.json({ message: 'Factura anulada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al anular factura' });
  }
};

exports.obtenerUltimasFacturas = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const limit = parseInt(req.query.limit) || 14;
    const facturas = await Factura.findLatestByOrganizacion(organizacion_id, limit);
    res.json(facturas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener últimas facturas' });
  }
};

exports.buscarFacturas = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const filters = {
      cliente_id: req.query.cliente_id,
      monto_min: req.query.monto_min,
      monto_max: req.query.monto_max,
      mes: req.query.mes,
      anio: req.query.anio,
      estado: req.query.estado,
      tipo_documento: req.query.tipo_documento,
    };
    const facturas = await Factura.searchByFilters(organizacion_id, filters);
    res.json(facturas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en búsqueda de facturas' });
  }
};

exports.cambiarEstadoFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const { organizacion_id } = req;
    if (!['Borrador', 'Emitida', 'Pagada', 'Anulada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }
    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    if (factura.estado === 'Anulada') {
      return res.status(400).json({ message: 'No se puede modificar una factura anulada' });
    }
    await Factura.update(id, organizacion_id, { estado });
    res.json({ message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cambiar estado' });
  }
};

exports.editarFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const { descuento, intereses_mora, cliente_id } = req.body;
    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    if (factura.estado === 'Anulada') {
      return res.status(400).json({ message: 'No se puede editar una factura anulada' });
    }
    let updateData = {};
    if (descuento !== undefined) updateData.descuento = descuento;
    if (intereses_mora !== undefined) updateData.intereses_mora = intereses_mora;
    if (cliente_id !== undefined) updateData.cliente_id = cliente_id;
    if (updateData.descuento !== undefined || updateData.intereses_mora !== undefined) {
      const subtotal = factura.subtotal_sumas;
      const descuentoNuevo = updateData.descuento !== undefined ? updateData.descuento : factura.descuento;
      const interesesNuevo = updateData.intereses_mora !== undefined ? updateData.intereses_mora : factura.intereses_mora;
      const base = subtotal - descuentoNuevo;
      const iva = base * 0.13;
      let retencion = factura.retencion_1;
      const total = base + iva - retencion + interesesNuevo;
      updateData.iva_13 = Math.round(iva * 100) / 100;
      updateData.total_pagar = Math.round(total * 100) / 100;
    }
    await Factura.update(id, organizacion_id, updateData);
    res.json({ message: 'Factura actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al editar factura' });
  }
};

exports.generarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura_${factura.numero_correlativo}.pdf`);
      res.send(pdfData);
    });

    doc.fontSize(16).text('Factura', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Número: ${factura.numero_correlativo}`);
    doc.text(`Fecha: ${factura.creado_en}`);
    doc.text(`Cliente: ${factura.cliente_nombre}`);
    doc.text(`NIT: ${factura.nit || 'N/A'}`);
    doc.text(`Tipo: ${factura.tipo_documento}`);
    doc.moveDown();
    doc.text(`Subtotal: $${factura.subtotal_sumas}`);
    doc.text(`Descuento: $${factura.descuento}`);
    doc.text(`IVA (13%): $${factura.iva_13}`);
    if (factura.retencion_1 > 0) doc.text(`Retención (1%): $${factura.retencion_1}`);
    if (factura.intereses_mora > 0) doc.text(`Intereses mora: $${factura.intereses_mora}`);
    doc.text(`Total a pagar: $${factura.total_pagar}`, { bold: true });
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar PDF: ' + error.message });
  }
};

exports.obtenerFacturaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    res.json(factura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener factura' });
  }
};

// ============================================================
// CONTROLADORES PARA AGREGAR/ELIMINAR DETALLES (individuales)
// ============================================================

exports.crearDetalle = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { organizacion_id, usuario_id } = req;
    const { factura_id, producto_id, cantidad } = req.body;

    // 1. Verificar factura
    const [factura] = await connection.query(
      'SELECT id, estado FROM facturas WHERE id = ? AND organizacion_id = ?',
      [factura_id, organizacion_id]
    );
    if (!factura || factura.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    const estado = factura[0].estado;
    if (estado === 'Anulada') {
      await connection.rollback();
      return res.status(400).json({ message: 'No se puede modificar una factura anulada' });
    }

    // 2. Obtener producto
    const [producto] = await connection.query(
      'SELECT id, precio_unitario, tipo, es_kit, stock_actual FROM productos WHERE id = ? AND organizacion_id = ?',
      [producto_id, organizacion_id]
    );
    if (!producto || producto.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Producto no encontrado' });
    }
    const precio = parseFloat(producto[0].precio_unitario);
    const cant = parseInt(cantidad);
    if (cant <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'La cantidad debe ser mayor a cero' });
    }

    // 3. Si la factura está emitida y es Producto, descontar stock
    if (estado === 'Emitida' || estado === 'Pagada') {
      if (producto[0].tipo === 'Servicio') {
        // Registrar movimiento de servicio
        await connection.query(
          `INSERT INTO movimientos_inventario 
           (organizacion_id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
            referencia_tipo, referencia_id, observacion, usuario_id)
           VALUES (?, ?, 'Servicio', ?, ?, ?, 'Venta', ?, 'Venta de servicio', ?)`,
          [
            organizacion_id,
            producto_id,
            cant,
            0,
            0,
            factura_id,
            usuario_id,
          ]
        );
      } else if (producto[0].es_kit) {
        await descuentoKitYComponentes(
          producto_id,
          cant,
          organizacion_id,
          factura_id,
          usuario_id,
          connection
        );
      } else {
        await descuentoProductoIndividual(
          producto_id,
          cant,
          organizacion_id,
          factura_id,
          usuario_id,
          connection
        );
      }
    }

    // 4. Insertar detalle
    const subtotal = precio * cant;
    const ivaDetalle = 0;
    await connection.query(
      `INSERT INTO detalles_factura (factura_id, producto_id, cantidad, precio_unitario, subtotal, iva)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [factura_id, producto_id, cant, precio, subtotal, ivaDetalle]
    );

    // 5. Recalcular totales
    await recalcularTotalesFactura(factura_id, connection);

    await connection.commit();
    res.status(201).json({ message: 'Detalle agregado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [crearDetalle] Error:', error);
    res.status(500).json({ message: 'Error al agregar detalle', error: error.message });
  } finally {
    connection.release();
  }
};

exports.eliminarDetalle = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { organizacion_id, usuario_id } = req;

    // 1. Obtener detalle y factura
    const [detalle] = await connection.query(
      `SELECT df.*, f.estado, f.id AS factura_id, f.organizacion_id
       FROM detalles_factura df
       JOIN facturas f ON df.factura_id = f.id
       WHERE df.id = ? AND f.organizacion_id = ?`,
      [id, organizacion_id]
    );
    if (!detalle || detalle.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Detalle no encontrado' });
    }
    const facturaId = detalle[0].factura_id;
    const estado = detalle[0].estado;
    const producto_id = detalle[0].producto_id;
    const cantidad = detalle[0].cantidad;

    if (estado === 'Anulada') {
      await connection.rollback();
      return res.status(400).json({ message: 'No se puede modificar una factura anulada' });
    }

    // 2. Si la factura está emitida y es Producto, reponer stock
    if (estado === 'Emitida' || estado === 'Pagada') {
      const [producto] = await connection.query(
        'SELECT tipo, es_kit FROM productos WHERE id = ? AND organizacion_id = ?',
        [producto_id, organizacion_id]
      );
      if (producto.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Producto no encontrado' });
      }
      // Si es servicio, no reponer stock
      if (producto[0].tipo !== 'Servicio') {
        if (producto[0].es_kit) {
          // Reponer stock del kit
          await connection.query(
            `UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ? AND organizacion_id = ?`,
            [cantidad, producto_id, organizacion_id]
          );
          // Reponer componentes
          const [componentes] = await connection.query(
            `SELECT producto_componente_id, cantidad FROM producto_componentes WHERE producto_kit_id = ?`,
            [producto_id]
          );
          for (const comp of componentes) {
            const cantidadReponer = comp.cantidad * cantidad;
            await connection.query(
              `UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ? AND organizacion_id = ?`,
              [cantidadReponer, comp.producto_componente_id, organizacion_id]
            );
            await connection.query(
              `INSERT INTO movimientos_inventario 
               (organizacion_id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
                referencia_tipo, referencia_id, observacion, usuario_id)
               SELECT ?, ?, 'Entrada', ?, stock_actual, stock_actual + ?, 'Devolución', ?, 'Reposición por eliminación de detalle', ?
               FROM productos WHERE id = ? AND organizacion_id = ?`,
              [
                organizacion_id,
                comp.producto_componente_id,
                cantidadReponer,
                cantidadReponer,
                facturaId,
                usuario_id,
                comp.producto_componente_id,
                organizacion_id,
              ]
            );
          }
        } else {
          // Producto individual
          await connection.query(
            `UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ? AND organizacion_id = ?`,
            [cantidad, producto_id, organizacion_id]
          );
          await connection.query(
            `INSERT INTO movimientos_inventario 
             (organizacion_id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
              referencia_tipo, referencia_id, observacion, usuario_id)
             SELECT ?, ?, 'Entrada', ?, stock_actual, stock_actual + ?, 'Devolución', ?, 'Reposición por eliminación de detalle', ?
             FROM productos WHERE id = ? AND organizacion_id = ?`,
            [
              organizacion_id,
              producto_id,
              cantidad,
              cantidad,
              facturaId,
              usuario_id,
              producto_id,
              organizacion_id,
            ]
          );
        }
      }
    }

    // 3. Eliminar detalle
    await connection.query('DELETE FROM detalles_factura WHERE id = ?', [id]);

    // 4. Recalcular totales
    await recalcularTotalesFactura(facturaId, connection);

    await connection.commit();
    res.json({ message: 'Detalle eliminado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [eliminarDetalle] Error:', error);
    res.status(500).json({ message: 'Error al eliminar detalle', error: error.message });
  } finally {
    connection.release();
  }
};