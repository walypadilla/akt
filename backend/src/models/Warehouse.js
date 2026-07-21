// backend/src/models/Warehouse.js
const { pool } = require('../config/db');

class Warehouse {
  
  static async findAll(organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM bodegas WHERE organizacion_id = ? ORDER BY nombre',
      [organizacion_id]
    );
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM bodegas WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const { organizacion_id, nombre, direccion, responsable } = data;
    const [result] = await pool.query(
      `INSERT INTO bodegas (organizacion_id, nombre, direccion, responsable)
       VALUES (?, ?, ?, ?)`,
      [organizacion_id, nombre, direccion, responsable]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const { nombre, direccion, responsable } = data;
    const [result] = await pool.query(
      `UPDATE bodegas SET nombre = ?, direccion = ?, responsable = ?
       WHERE id = ? AND organizacion_id = ?`,
      [nombre, direccion, responsable, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'DELETE FROM bodegas WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Warehouse;