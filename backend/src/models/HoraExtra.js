// backend/src/models/HoraExtra.js
const { pool } = require('../config/db');

class HoraExtra {
  static async create(data) {
    const { organizacion_id, empleado_id, periodo_id, horas, monto_total, descripcion } = data;
    const [result] = await pool.query(
      `INSERT INTO horas_extras_empleado 
       (organizacion_id, empleado_id, periodo_id, horas, monto_total, descripcion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organizacion_id, empleado_id, periodo_id, horas, monto_total || 0, descripcion]
    );
    return result.insertId;
  }

  static async findByPeriodo(periodo_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT * FROM horas_extras_empleado WHERE periodo_id = ? AND organizacion_id = ?`,
      [periodo_id, organizacion_id]
    );
    return rows;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'DELETE FROM horas_extras_empleado WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = HoraExtra;