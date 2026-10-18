const { pool } = require('../config/db');

class Vacuna {
  static async findAll(organizacion_id, soloActivos = true) {
    const sql = `
      SELECT v.*, p.nombre AS producto_nombre, p.precio_unitario AS producto_precio,
             p.stock_actual AS producto_stock
      FROM vacunas v
      LEFT JOIN productos p ON v.producto_id = p.id
      WHERE v.organizacion_id = ? ${soloActivos ? 'AND v.activo = 1' : ''}
      ORDER BY v.nombre
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
    const { organizacion_id, nombre, descripcion, dias_recordatorio, producto_id } = data;
    const [result] = await pool.query(
      `INSERT INTO vacunas (organizacion_id, nombre, descripcion, dias_recordatorio, producto_id, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        organizacion_id,
        nombre,
        descripcion || null,
        dias_recordatorio || 365,
        producto_id || null,
      ]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const fields = [];
    const values = [];
    if (data.nombre !== undefined) { fields.push('nombre = ?'); values.push(data.nombre); }
    if (data.descripcion !== undefined) { fields.push('descripcion = ?'); values.push(data.descripcion); }
    if (data.dias_recordatorio !== undefined) { fields.push('dias_recordatorio = ?'); values.push(data.dias_recordatorio); }
    if (data.producto_id !== undefined) { fields.push('producto_id = ?'); values.push(data.producto_id || null); }
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

  static async reactivar(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE vacunas SET activo = 1 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async getAniosDisponibles(organizacion_id) {
    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(fecha_aplicacion) AS anio
       FROM historial_vacunas
       WHERE organizacion_id = ? AND fecha_aplicacion IS NOT NULL
       ORDER BY anio DESC`,
      [organizacion_id]
    );
    const anios = rows.map((r) => r.anio);
    return anios.length ? anios : [new Date().getFullYear()];
  }
}

module.exports = Vacuna;