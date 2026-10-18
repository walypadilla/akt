// backend/src/models/Examen.js
const { pool } = require('../config/db');

class Examen {
  static async findAll(organizacion_id, soloActivos = true) {
    const sql = `
      SELECT e.*, p.nombre AS producto_nombre, p.precio_unitario AS producto_precio
      FROM examenes e
      LEFT JOIN productos p ON e.producto_id = p.id
      WHERE e.organizacion_id = ? ${soloActivos ? 'AND e.activo = 1' : ''}
      ORDER BY e.nombre
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
    const {
      organizacion_id,
      nombre,
      descripcion,
      precio,
      plantilla_resultados,
      producto_id,
    } = data;

    const [result] = await pool.query(
      `INSERT INTO examenes
       (organizacion_id, nombre, descripcion, precio, plantilla_resultados, producto_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        organizacion_id,
        nombre,
        descripcion || null,
        precio || 0,
        plantilla_resultados || null,
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
    if (data.precio !== undefined) { fields.push('precio = ?'); values.push(data.precio); }
    if (data.plantilla_resultados !== undefined) {
      fields.push('plantilla_resultados = ?');
      values.push(data.plantilla_resultados || null);
    }
    if (data.producto_id !== undefined) {
      fields.push('producto_id = ?');
      values.push(data.producto_id || null);
    }
    if (data.activo !== undefined) { fields.push('activo = ?'); values.push(data.activo ? 1 : 0); }

    if (fields.length === 0) return false;
    values.push(id, organizacion_id);
    const [result] = await pool.query(
      `UPDATE examenes SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Desactivar (nunca eliminar)
  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE examenes SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  // Reactivar
  static async reactivar(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE examenes SET activo = 1 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async getAniosDisponibles(organizacion_id) {
    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(fecha_solicitud) AS anio 
       FROM solicitudes_examen 
       WHERE organizacion_id = ? AND fecha_solicitud IS NOT NULL
       ORDER BY anio DESC`,
      [organizacion_id]
    );
    const anios = rows.map((r) => r.anio);
    return anios.length ? anios : [new Date().getFullYear()];
  }
}

module.exports = Examen;