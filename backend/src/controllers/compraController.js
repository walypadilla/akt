// backend/src/controllers/compraController.js
const Compra = require('../models/Compra');
const DetalleCompra = require('../models/DetalleCompra');
const Producto = require('../models/Producto');
const { pool } = require('../config/db');

exports.obtenerCompras = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { proveedor_id, tipo_egreso, fecha_inicio, fecha_fin } = req.query;
    const filters = {};
    if (proveedor_id) filters.proveedor_id = proveedor_id;
    if (tipo_egreso) filters.tipo_egreso = tipo_egreso;
    if (fecha_inicio && fecha_fin) {
      filters.fecha_inicio = fecha_inicio;
      filters.fecha_fin = fecha_fin;
    }
    const compras = await Compra.findAll(organizacion_id, filters);
    res.json(compras);
  } catch (error) {
    console.error('Error al obtener compras:', error);
    res.status(500).json({ message: 'Error al obtener compras', error: error.message });
  }
};

exports.obtenerCompraPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const compra = await Compra.findById(id, organizacion_id);
    if (!compra) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }
    // Obtener detalles
    const detalles = await DetalleCompra.findByCompraId(id);
    res.json({ ...compra, detalles });
  } catch (error) {
    console.error('Error al obtener compra:', error);
    res.status(500).json({ message: 'Error al obtener compra', error: error.message });
  }
};

exports.crearCompra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const organizacion_id = req.organizacion_id;
    const { detalles, ...compraData } = req.body;

    // Calcular totales si no vienen
    let monto_subtotal = 0;
    let iva = 0;
    let total = 0;
    if (!compraData.monto_subtotal && detalles) {
      for (const d of detalles) {
        const subtotal = d.cantidad * d.precio_unitario;
        d.subtotal = subtotal;
        monto_subtotal += subtotal;
        iva += subtotal * 0.13;
      }
      total = monto_subtotal + iva;
      compraData.monto_subtotal = monto_subtotal;
      compraData.iva_credito_fiscal = iva;
      compraData.total = total;
    }

    // Insertar compra
    const compraId = await Compra.create({
      organizacion_id,
      ...compraData,
      proveedor_nombre: compraData.proveedor_nombre || 'Proveedor sin nombre'
    });

    // Insertar detalles y actualizar stock
    if (detalles && detalles.length > 0) {
      await DetalleCompra.createMany(compraId, detalles);
      for (const d of detalles) {
        await Producto.incrementStock(d.producto_id, organizacion_id, d.cantidad);
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Compra creada', id: compraId });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear compra:', error);
    res.status(500).json({ message: 'Error al crear compra', error: error.message });
  } finally {
    connection.release();
  }
};

exports.actualizarCompra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { detalles, ...compraData } = req.body;

    const compra = await Compra.findById(id, organizacion_id);
    if (!compra) {
      await connection.rollback();
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    // Actualizar compra
    await Compra.update(id, organizacion_id, compraData);

    // Reemplazar detalles y ajustar stock
    // Primero eliminar detalles antiguos y revertir stock
    const oldDetalles = await DetalleCompra.findByCompraId(id);
    for (const d of oldDetalles) {
      await Producto.decrementStock(d.producto_id, organizacion_id, d.cantidad);
    }
    await DetalleCompra.deleteByCompraId(id);

    // Insertar nuevos detalles y actualizar stock
    if (detalles && detalles.length > 0) {
      // Calcular subtotales si no vienen
      for (const d of detalles) {
        if (!d.subtotal) {
          d.subtotal = d.cantidad * d.precio_unitario;
        }
      }
      await DetalleCompra.createMany(id, detalles);
      for (const d of detalles) {
        await Producto.incrementStock(d.producto_id, organizacion_id, d.cantidad);
      }
    }

    await connection.commit();
    res.json({ message: 'Compra actualizada' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar compra:', error);
    res.status(500).json({ message: 'Error al actualizar compra', error: error.message });
  } finally {
    connection.release();
  }
};

exports.eliminarCompra = async (req, res) => {
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

    // Revertir stock de detalles
    const detalles = await DetalleCompra.findByCompraId(id);
    for (const d of detalles) {
      await Producto.decrementStock(d.producto_id, organizacion_id, d.cantidad);
    }
    await DetalleCompra.deleteByCompraId(id);

    await Compra.delete(id, organizacion_id);
    await connection.commit();
    res.json({ message: 'Compra eliminada' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar compra:', error);
    res.status(500).json({ message: 'Error al eliminar compra', error: error.message });
  } finally {
    connection.release();
  }
};