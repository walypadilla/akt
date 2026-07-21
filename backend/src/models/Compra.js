// backend/src/models/Compra.js
const { pool } = require('../config/db');

class Compra {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `SELECT cg.*, p.razon_social AS proveedor_nombre
               FROM compras_gastos cg
               LEFT JOIN proveedores p ON cg.proveedor_id = p.id
               WHERE cg.organizacion_id = ?`;
    const params = [organizacion_id];
    if (filters.proveedor_id) {
      sql += ' AND cg.proveedor_id = ?';
      params.push(filters.proveedor_id);
    }
    if (filters.tipo_egreso) {
      sql += ' AND cg.tipo_egreso = ?';
      params.push(filters.tipo_egreso);
    }
    if (filters.fecha_inicio && filters.fecha_fin) {
      sql += ' AND cg.fecha_registro BETWEEN ? AND ?';
      params.push(filters.fecha_inicio, filters.fecha_fin);
    }
    sql += ' ORDER BY cg.fecha_registro DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT cg.*, p.razon_social AS proveedor_nombre
       FROM compras_gastos cg
       LEFT JOIN proveedores p ON cg.proveedor_id = p.id
       WHERE cg.id = ? AND cg.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, proveedor_id, proveedor_nombre, tipo_documento,
      numero_comprobante, tipo_egreso, descripcion, monto_subtotal,
      iva_credito_fiscal, total, url_comprobante_foto, fecha_registro,
      tipo_comprobante, estado_comprobante
    } = data;
    const [result] = await pool.query(
      `INSERT INTO compras_gastos 
       (organizacion_id, proveedor_id, proveedor_nombre, tipo_documento,
        numero_comprobante, tipo_egreso, descripcion, monto_subtotal,
        iva_credito_fiscal, total, url_comprobante_foto, fecha_registro,
        tipo_comprobante, estado_comprobante)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, proveedor_id || null, proveedor_nombre, tipo_documento,
       numero_comprobante, tipo_egreso, descripcion, monto_subtotal,
       iva_credito_fiscal, total, url_comprobante_foto, fecha_registro,
       tipo_comprobante || 'Factura', estado_comprobante || 'Pendiente']
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const {
      proveedor_id, proveedor_nombre, tipo_documento,
      numero_comprobante, tipo_egreso, descripcion, monto_subtotal,
      iva_credito_fiscal, total, url_comprobante_foto, fecha_registro,
      tipo_comprobante, estado_comprobante
    } = data;
    const [result] = await pool.query(
      `UPDATE compras_gastos SET
        proveedor_id = ?, proveedor_nombre = ?, tipo_documento = ?,
        numero_comprobante = ?, tipo_egreso = ?, descripcion = ?,
        monto_subtotal = ?, iva_credito_fiscal = ?, total = ?,
        url_comprobante_foto = ?, fecha_registro = ?,
        tipo_comprobante = ?, estado_comprobante = ?
       WHERE id = ? AND organizacion_id = ?`,
      [proveedor_id || null, proveedor_nombre, tipo_documento,
       numero_comprobante, tipo_egreso, descripcion, monto_subtotal,
       iva_credito_fiscal, total, url_comprobante_foto, fecha_registro,
       tipo_comprobante, estado_comprobante, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'DELETE FROM compras_gastos WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Compra;