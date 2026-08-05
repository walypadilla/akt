const { pool } = require('../config/db');

class Vacuna {
  static async findAll(organizacion_id, activo = true) {
    const sql = `
      SELECT * FROM vacunas 
      WHERE organizacion_id = ? ${activo ? 'AND activo = 1' : ''}
      ORDER BY nombre
    `;
    const [rows] = await pool.query(sql, [organizacion_id]);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM vacunas WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const { organizacion_id, nombre, descripcion, dias_recordatorio } = data;
    const [result] = await pool.query(
      `INSERT INTO vacunas (organizacion_id, nombre, descripcion, dias_recordatorio)
       VALUES (?, ?, ?, ?)`,
      [organizacion_id, nombre, descripcion || null, dias_recordatorio || 365]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const fields = [];
    const values = [];
    if (data.nombre !== undefined) { fields.push('nombre = ?'); values.push(data.nombre); }
    if (data.descripcion !== undefined) { fields.push('descripcion = ?'); values.push(data.descripcion); }
    if (data.dias_recordatorio !== undefined) { fields.push('dias_recordatorio = ?'); values.push(data.dias_recordatorio); }
    if (data.activo !== undefined) { fields.push('activo = ?'); values.push(data.activo ? 1 : 0); }
    if (fields.length === 0) return false;
    values.push(id, organizacion_id);
    const [result] = await pool.query(
      `UPDATE vacunas SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE vacunas SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Vacuna;