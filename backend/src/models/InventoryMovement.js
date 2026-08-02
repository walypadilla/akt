// backend/src/models/InventoryMovement.js
const { pool } = require('../config/db');

class InventoryMovement {
  
  static async findAll(organizacion_id, filters = {}) {
    let sql = `
    SELECT m.*, 
           p.nombre AS producto_nombre, 
           b.nombre AS bodega_nombre,
           u.nombre AS usuario_nombre,
           CASE 
             WHEN m.referencia_tipo = 'Compra' THEN (SELECT numero_comprobante FROM compras_gastos WHERE id = m.referencia_id)
             WHEN m.referencia_tipo = 'Factura' THEN (SELECT numero_correlativo FROM facturas WHERE id = m.referencia_id)
             ELSE NULL
           END AS numero_documento
    FROM movimientos_inventario m
    JOIN productos p ON m.producto_id = p.id
    LEFT JOIN bodegas b ON m.bodega_id = b.id
    JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.organizacion_id = ?
  `;
    const params = [organizacion_id];

    if (filters.producto_id) {
      sql += ' AND m.producto_id = ?';
      params.push(filters.producto_id);
    }
    if (filters.bodega_id) {
      sql += ' AND m.bodega_id = ?';
      params.push(filters.bodega_id);
    }
    if (filters.tipo_movimiento) {
      sql += ' AND m.tipo_movimiento = ?';
      params.push(filters.tipo_movimiento);
    }
    if (filters.fecha_inicio && filters.fecha_fin) {
      sql += ' AND m.created_at >= ? AND m.created_at <= ?';
      params.push(filters.fecha_inicio, filters.fecha_fin);
    }
    if (filters.referencia_tipo) {
      sql += ' AND m.referencia_tipo = ?';
      params.push(filters.referencia_tipo);
    }

    sql += ' ORDER BY m.created_at DESC';
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(parseInt(filters.offset));
    }

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getKardex(producto_id, organizacion_id, fecha_inicio, fecha_fin) {
    let sql = `
      SELECT m.*, 
            b.nombre AS bodega_nombre, 
            u.nombre AS usuario_nombre,
            CASE 
              WHEN m.referencia_tipo = 'Compra' THEN (SELECT numero_comprobante FROM compras_gastos WHERE id = m.referencia_id)
              WHEN m.referencia_tipo = 'Factura' THEN (SELECT numero_correlativo FROM facturas WHERE id = m.referencia_id)
              ELSE NULL
            END AS numero_documento
      FROM movimientos_inventario m
      LEFT JOIN bodegas b ON m.bodega_id = b.id
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.producto_id = ? AND m.organizacion_id = ?
        AND m.created_at >= ? AND m.created_at <= ?
      ORDER BY m.created_at ASC
    `;
    const [rows] = await pool.query(sql, [producto_id, organizacion_id, fecha_inicio, fecha_fin]);
    return rows;
  }

  static async create(data, connection = null) {
    const db = connection || pool;
    const {
      organizacion_id, producto_id, bodega_id, tipo_movimiento,
      cantidad, stock_anterior, stock_nuevo, referencia_tipo,
      referencia_id, costo_unitario, observacion, usuario_id
    } = data;
    const [result] = await db.query(
      `INSERT INTO movimientos_inventario 
      (organizacion_id, producto_id, bodega_id, tipo_movimiento, cantidad,
        stock_anterior, stock_nuevo, referencia_tipo, referencia_id,
        costo_unitario, observacion, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, producto_id, bodega_id, tipo_movimiento, cantidad,
      stock_anterior, stock_nuevo, referencia_tipo, referencia_id,
      costo_unitario, observacion, usuario_id]
    );
    return result.insertId;
  }

}

module.exports = InventoryMovement;