// backend/src/models/Proveedor.js
const { pool } = require('../config/db');

class Proveedor {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `SELECT p.*, 
                      d.nombre_departamento, m.nombre_municipio,
                      a.descripcion_giro
               FROM proveedores p
               LEFT JOIN departamentos d ON p.id_departamento = d.id_departamento
               LEFT JOIN municipios m ON p.id_municipio = m.id_municipio AND p.id_departamento = m.id_departamento
               LEFT JOIN actividades_economicas a ON p.codigo_giro = a.codigo_giro
               WHERE p.organizacion_id = ? AND p.activo = 1`;
    const params = [organizacion_id];
    if (filters.nombre) {
      sql += ' AND (p.razon_social LIKE ? OR p.nombre_comercial LIKE ?)';
      params.push(`%${filters.nombre}%`, `%${filters.nombre}%`);
    }
    if (filters.nit) {
      sql += ' AND p.numero_documento LIKE ?';
      params.push(`%${filters.nit}%`);
    }
    sql += ' ORDER BY p.razon_social ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT p.*, d.nombre_departamento, m.nombre_municipio,
              a.descripcion_giro
       FROM proveedores p
       LEFT JOIN departamentos d ON p.id_departamento = d.id_departamento
       LEFT JOIN municipios m ON p.id_municipio = m.id_municipio AND p.id_departamento = m.id_departamento
       LEFT JOIN actividades_economicas a ON p.codigo_giro = a.codigo_giro
       WHERE p.id = ? AND p.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, razon_social, nombre_comercial, tipo_documento,
      numero_documento, nrc, id_departamento, id_municipio, direccion_linea,
      telefono, email_dte, codigo_giro, tipo_contribuyente
    } = data;
    const [result] = await pool.query(
      `INSERT INTO proveedores 
       (organizacion_id, razon_social, nombre_comercial, tipo_documento,
        numero_documento, nrc, id_departamento, id_municipio, direccion_linea,
        telefono, email_dte, codigo_giro, tipo_contribuyente, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [organizacion_id, razon_social, nombre_comercial, tipo_documento,
       numero_documento, nrc, id_departamento, id_municipio, direccion_linea,
       telefono, email_dte, codigo_giro, tipo_contribuyente]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const {
      razon_social, nombre_comercial, tipo_documento,
      numero_documento, nrc, id_departamento, id_municipio, direccion_linea,
      telefono, email_dte, codigo_giro, tipo_contribuyente, activo
    } = data;
    const [result] = await pool.query(
      `UPDATE proveedores SET
        razon_social = ?, nombre_comercial = ?, tipo_documento = ?,
        numero_documento = ?, nrc = ?, id_departamento = ?, id_municipio = ?,
        direccion_linea = ?, telefono = ?, email_dte = ?, codigo_giro = ?,
        tipo_contribuyente = ?, activo = ?
       WHERE id = ? AND organizacion_id = ?`,
      [razon_social, nombre_comercial, tipo_documento,
       numero_documento, nrc, id_departamento, id_municipio, direccion_linea,
       telefono, email_dte, codigo_giro, tipo_contribuyente, activo,
       id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE proveedores SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Proveedor;