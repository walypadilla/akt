const { pool } = require('../config/db');

class Examen {
  // Obtener todos los exámenes activos
  static async findAll(organizacion_id, soloActivos = true) {
    const sql = `
      SELECT * FROM examenes 
      WHERE organizacion_id = ? ${soloActivos ? 'AND activo = 1' : ''}
      ORDER BY nombre
    `;
    const [rows] = await pool.query(sql, [organizacion_id]);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM examenes WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const { organizacion_id, nombre, descripcion, precio } = data;
    const [result] = await pool.query(
      `INSERT INTO examenes (organizacion_id, nombre, descripcion, precio)
       VALUES (?, ?, ?, ?)`,
      [organizacion_id, nombre, descripcion || null, precio || 0]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const fields = [];
    const values = [];

    if (data.nombre !== undefined) { fields.push('nombre = ?'); values.push(data.nombre); }
    if (data.descripcion !== undefined) { fields.push('descripcion = ?'); values.push(data.descripcion); }
    if (data.precio !== undefined) { fields.push('precio = ?'); values.push(data.precio); }
    if (data.activo !== undefined) { fields.push('activo = ?'); values.push(data.activo ? 1 : 0); }

    if (fields.length === 0) return false;

    values.push(id, organizacion_id);
    const [result] = await pool.query(
      `UPDATE examenes SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE examenes SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Examen;