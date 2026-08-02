// backend/src/models/Paciente.js
const { pool } = require('../config/db');

class Paciente {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `
      SELECT p.*, c.nombre AS cliente_nombre 
      FROM pacientes p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.organizacion_id = ? AND p.activo = 1
    `;
    const params = [organizacion_id];
    if (filters.search) {
      sql += ' AND (p.nombre LIKE ? OR p.apellidos LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.tipo_paciente) {
      sql += ' AND p.tipo_paciente = ?';
      params.push(filters.tipo_paciente);
    }
    sql += ' ORDER BY p.nombre ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS cliente_nombre 
       FROM pacientes p
       JOIN clientes c ON p.cliente_id = c.id
       WHERE p.id = ? AND p.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const { organizacion_id, cliente_id, tipo_paciente, nombre, apellidos, fecha_nacimiento, genero, especie, raza, color, senas_particulares, chip, peso } = data;
    const [result] = await pool.query(
      `INSERT INTO pacientes 
       (organizacion_id, cliente_id, tipo_paciente, nombre, apellidos, fecha_nacimiento, genero, especie, raza, color, senas_particulares, chip, peso)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, cliente_id, tipo_paciente, nombre, apellidos || null, fecha_nacimiento || null, genero || null, especie || null, raza || null, color || null, senas_particulares || null, chip || null, peso || null]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    // similar, dinámico
  }

  static async delete(id, organizacion_id) {
    await pool.query('UPDATE pacientes SET activo = 0 WHERE id = ? AND organizacion_id = ?', [id, organizacion_id]);
  }
}

module.exports = Paciente;