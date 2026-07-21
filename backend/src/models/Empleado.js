// backend/src/models/Empleado.js
const { pool } = require('../config/db');

class Empleado {
  static async findAll(organizacion_id, filters = {}) {
    let sql = 'SELECT * FROM empleados_nomina WHERE organizacion_id = ?';
    const params = [organizacion_id];
    if (filters.nombre) {
      sql += ' AND nombre LIKE ?';
      params.push(`%${filters.nombre}%`);
    }
    if (filters.dui) {
      sql += ' AND dui = ?';
      params.push(filters.dui);
    }
    sql += ' ORDER BY nombre ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM empleados_nomina WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, nombre, salario_base, dui,
      cotiza_isss = 1, cotiza_afp = 1,
      afp_numero, isss_numero
    } = data;
    const [result] = await pool.query(
      `INSERT INTO empleados_nomina 
       (organizacion_id, nombre, salario_base, dui, cotiza_isss, cotiza_afp, afp_numero, isss_numero)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, nombre, salario_base, dui, cotiza_isss, cotiza_afp, afp_numero, isss_numero]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const {
      nombre, salario_base, dui,
      cotiza_isss, cotiza_afp,
      afp_numero, isss_numero
    } = data;
    const [result] = await pool.query(
      `UPDATE empleados_nomina SET
        nombre = ?, salario_base = ?, dui = ?,
        cotiza_isss = ?, cotiza_afp = ?,
        afp_numero = ?, isss_numero = ?
       WHERE id = ? AND organizacion_id = ?`,
      [nombre, salario_base, dui, cotiza_isss, cotiza_afp, afp_numero, isss_numero, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'DELETE FROM empleados_nomina WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async existsDui(dui, organizacion_id, excludeId = null) {
    let sql = 'SELECT id FROM empleados_nomina WHERE dui = ? AND organizacion_id = ?';
    const params = [dui, organizacion_id];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
  }
}

module.exports = Empleado;