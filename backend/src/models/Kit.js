// backend/src/models/Kit.js
const { pool } = require('../config/db');

class Kit {
  static async findAll(organizacion_id) {
    const [rows] = await pool.query(
      `SELECT k.*, p.nombre AS producto_nombre
       FROM kits k
       JOIN productos p ON k.producto_id = p.id
       WHERE p.organizacion_id = ?
       ORDER BY p.nombre`,
      [organizacion_id]
    );
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT k.*, p.nombre AS producto_nombre
       FROM kits k
       JOIN productos p ON k.producto_id = p.id
       WHERE k.id = ? AND p.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async getComponentes(kit_id) {
    const [rows] = await pool.query(
      `SELECT kc.*, p.nombre AS producto_nombre, p.precio_unitario, p.costo_promedio
       FROM kit_componentes kc
       JOIN productos p ON kc.componente_id = p.id
       WHERE kc.kit_id = ?`,
      [kit_id]
    );
    return rows;
  }

  static async create(data) {
    const { organizacion_id, producto_id, cantidad = 1, descuento = 0 } = data;
    const [result] = await pool.query(
      `INSERT INTO kits (organizacion_id, producto_id, cantidad, descuento)
       VALUES (?, ?, ?, ?)`,
      [organizacion_id, producto_id, cantidad, descuento]
    );
    return result.insertId;
  }

  static async addComponente(kit_id, componente_id, cantidad, organizacion_id) {
    await pool.query(
      `INSERT INTO kit_componentes (kit_id, componente_id, cantidad)
       VALUES (?, ?, ?)`,
      [kit_id, componente_id, cantidad]
    );
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'DELETE FROM kits WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async deleteComponentes(kit_id) {
    await pool.query(
      'DELETE FROM kit_componentes WHERE kit_id = ?',
      [kit_id]
    );
  }

  static async getKitByProducto(producto_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT * FROM kits WHERE producto_id = ? AND organizacion_id = ?`,
      [producto_id, organizacion_id]
    );
    return rows[0];
  }
}

module.exports = Kit;