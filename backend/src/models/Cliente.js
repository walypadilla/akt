// backend/src/models/Cliente.js
const { pool } = require('../config/db');

class Cliente {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `SELECT c.*, 
                      d.nombre_departamento, m.nombre_municipio
               FROM clientes c
               LEFT JOIN departamentos d ON c.id_departamento = d.id_departamento
               LEFT JOIN municipios m ON c.id_municipio = m.id_municipio AND c.id_departamento = m.id_departamento
               WHERE c.organizacion_id = ?`;
    const params = [organizacion_id];
    if (filters.nombre) {
      sql += ' AND c.nombre LIKE ?';
      params.push(`%${filters.nombre}%`);
    }
    if (filters.nit) {
      sql += ' AND c.nit LIKE ?';
      params.push(`%${filters.nit}%`);
    }
    sql += ' ORDER BY c.nombre ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT c.*, d.nombre_departamento, m.nombre_municipio
       FROM clientes c
       LEFT JOIN departamentos d ON c.id_departamento = d.id_departamento
       LEFT JOIN municipios m ON c.id_municipio = m.id_municipio AND c.id_departamento = m.id_departamento
       WHERE c.id = ? AND c.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, nombre, dui, nit, nrc, giro, tipo_contribuyente,
      direccion, telefono, correo, telefono_whatsapp,
      id_departamento, id_municipio, direccion_linea
    } = data;
    const [result] = await pool.query(
      `INSERT INTO clientes 
       (organizacion_id, nombre, dui, nit, nrc, giro, tipo_contribuyente,
        direccion, telefono, correo, telefono_whatsapp,
        id_departamento, id_municipio, direccion_linea)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, nombre, dui, nit, nrc, giro, tipo_contribuyente,
       direccion, telefono, correo, telefono_whatsapp,
       id_departamento, id_municipio, direccion_linea]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const {
      nombre, dui, nit, nrc, giro, tipo_contribuyente,
      direccion, telefono, correo, telefono_whatsapp,
      id_departamento, id_municipio, direccion_linea
    } = data;
    const [result] = await pool.query(
      `UPDATE clientes SET
        nombre = ?, dui = ?, nit = ?, nrc = ?, giro = ?, tipo_contribuyente = ?,
        direccion = ?, telefono = ?, correo = ?, telefono_whatsapp = ?,
        id_departamento = ?, id_municipio = ?, direccion_linea = ?
       WHERE id = ? AND organizacion_id = ?`,
      [nombre, dui, nit, nrc, giro, tipo_contribuyente,
       direccion, telefono, correo, telefono_whatsapp,
       id_departamento, id_municipio, direccion_linea,
       id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'DELETE FROM clientes WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async existsNit(nit, organizacion_id, excludeId = null) {
    let sql = 'SELECT id FROM clientes WHERE nit = ? AND organizacion_id = ?';
    const params = [nit, organizacion_id];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
  }
}

module.exports = Cliente;