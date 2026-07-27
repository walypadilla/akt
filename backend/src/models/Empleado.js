// backend/src/models/Empleado.js
const { pool } = require('../config/db');

class Empleado {
  static async findAll(organizacion_id, filters = {}) {
    const {
      search = '',
      activo = null,
      page = 1,
      limit = 10,
    } = filters;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT e.*
      FROM empleados_nomina e
      WHERE e.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (search) {
      sql += ` AND (e.nombre LIKE ? OR e.apellidos LIKE ? OR e.dui LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (activo !== null) {
      sql += ` AND e.activo = ?`;
      params.push(activo ? 1 : 0);
    }

    sql += ` ORDER BY e.nombre ASC, e.apellidos ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(sql, params);

    let countSql = `
      SELECT COUNT(*) AS total
      FROM empleados_nomina e
      WHERE e.organizacion_id = ?
    `;
    const countParams = [organizacion_id];
    if (search) {
      countSql += ` AND (e.nombre LIKE ? OR e.apellidos LIKE ? OR e.dui LIKE ?)`;
      countParams.push(searchParam, searchParam, searchParam);
    }
    if (activo !== null) {
      countSql += ` AND e.activo = ?`;
      countParams.push(activo ? 1 : 0);
    }
    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return {
      empleados: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };
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
      organizacion_id, nombre, apellidos, salario_base, dui,
      cotiza_isss = 1, cotiza_afp = 1,
      afp_numero, isss_numero,
      fecha_ingreso // ✅ agregado
    } = data;
    const [result] = await pool.query(
      `INSERT INTO empleados_nomina 
       (organizacion_id, nombre, apellidos, salario_base, dui, cotiza_isss, cotiza_afp, afp_numero, isss_numero, fecha_ingreso, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [organizacion_id, nombre, apellidos || '', salario_base, dui, cotiza_isss, cotiza_afp, afp_numero, isss_numero, fecha_ingreso]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const {
      nombre, apellidos, salario_base, dui,
      cotiza_isss, cotiza_afp,
      afp_numero, isss_numero,
      fecha_ingreso // ✅ agregado
    } = data;
    const [result] = await pool.query(
      `UPDATE empleados_nomina SET
        nombre = ?, apellidos = ?, salario_base = ?, dui = ?,
        cotiza_isss = ?, cotiza_afp = ?,
        afp_numero = ?, isss_numero = ?,
        fecha_ingreso = ?
       WHERE id = ? AND organizacion_id = ?`,
      [nombre, apellidos || '', salario_base, dui, cotiza_isss, cotiza_afp, afp_numero, isss_numero, fecha_ingreso, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE empleados_nomina SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async reactivar(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE empleados_nomina SET activo = 1 WHERE id = ? AND organizacion_id = ?',
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