// backend/src/models/Ausencia.js
const { pool } = require('../config/db');

class Ausencia {
  static async create(data) {
    const { organizacion_id, empleado_id, fecha, tipo, remunerada, dias, observacion } = data;
    const [result] = await pool.query(
      `INSERT INTO ausencias_empleado 
       (organizacion_id, empleado_id, fecha, tipo, remunerada, dias, observacion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, empleado_id, fecha, tipo, remunerada ? 1 : 0, dias, observacion]
    );
    return result.insertId;
  }

  static async findByEmpleado(empleado_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT * FROM ausencias_empleado WHERE empleado_id = ? AND organizacion_id = ? ORDER BY fecha DESC`,
      [empleado_id, organizacion_id]
    );
    return rows;
  }

  static async getByPeriodo(empleado_id, fecha_inicio, fecha_fin, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT * FROM ausencias_empleado 
       WHERE empleado_id = ? AND organizacion_id = ? AND fecha BETWEEN ? AND ?`,
      [empleado_id, organizacion_id, fecha_inicio, fecha_fin]
    );
    return rows;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'DELETE FROM ausencias_empleado WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Ausencia;