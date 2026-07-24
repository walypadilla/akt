// backend/src/models/PeriodoPago.js
const { pool } = require('../config/db');

class PeriodoPago {
  static async findByFecha(organizacion_id, fecha, connection = null) {
    const db = connection || pool;
    const [rows] = await db.query(
      `SELECT * FROM periodos_pago
       WHERE organizacion_id = ? AND ? BETWEEN fecha_inicio AND fecha_fin`,
      [organizacion_id, fecha]
    );
    return rows[0];
  }

  static async create(organizacion_id, tipo, fecha_inicio, fecha_fin, mes, anio, connection = null) {
    const db = connection || pool;
    const [result] = await db.query(
      `INSERT INTO periodos_pago (organizacion_id, tipo, fecha_inicio, fecha_fin, mes, anio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organizacion_id, tipo, fecha_inicio, fecha_fin, mes, anio]
    );
    return result.insertId;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM periodos_pago WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return rows[0];
  }
}
module.exports = PeriodoPago;