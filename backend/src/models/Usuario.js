// backend/src/models/Usuario.js
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

class Usuario {
  // ========== CRUD BÁSICO ==========
  static async findAll(filters = {}) {
    let sql = 'SELECT id, organizacion_id, nombre, correo, rol, estado, password_temporal, creado_en FROM usuarios WHERE 1=1';
    const params = [];
    if (filters.organizacion_id) {
        sql += ' AND organizacion_id = ?';
        params.push(filters.organizacion_id);
    }
    if (filters.rol) { // <-- Agregar esta condición
        sql += ' AND rol = ?';
        params.push(filters.rol);
    }
    if (filters.estado) {
        sql += ' AND estado = ?';
        params.push(filters.estado);
    }
    sql += ' ORDER BY creado_en DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
    }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, organizacion_id, nombre, correo, rol, estado, password_temporal, creado_en FROM usuarios WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByEmail(correo) {
    const [rows] = await pool.query(
      'SELECT id, organizacion_id, nombre, correo, password, rol, estado, password_temporal FROM usuarios WHERE correo = ?',
      [correo]
    );
    return rows[0];
  }

  static async create(data) {
    const { organizacion_id, nombre, correo, password, rol = 'Vendedor', estado = 'Activo' } = data;
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO usuarios (organizacion_id, nombre, correo, password, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organizacion_id || null, nombre, correo, hashedPassword, rol, estado]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { nombre, correo, rol, estado } = data;
    const [result] = await pool.query(
      `UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, estado = ?
       WHERE id = ?`,
      [nombre, correo, rol, estado, id]
    );
    return result.affectedRows > 0;
  }

  // ========== GESTIÓN DE CONTRASEÑAS ==========
  static async updatePassword(id, nuevaContraseña, esTemporal = false) {
    const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);
    const [result] = await pool.query(
      `UPDATE usuarios SET password = ?, password_temporal = ? WHERE id = ?`,
      [hashedPassword, esTemporal ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  }

  static async resetPassword(id) {
    const temporal = Math.random().toString(36).slice(-8) + '1A!';
    await this.updatePassword(id, temporal, true);
    return temporal;
  }

  static async verifyPassword(correo, password) {
    const user = await this.findByEmail(correo);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;
    return user;
  }

  // ========== ESTADO ==========
  static async updateStatus(id, estado) {
    const [result] = await pool.query(
      'UPDATE usuarios SET estado = ? WHERE id = ?',
      [estado, id]
    );
    return result.affectedRows > 0;
  }

  // ========== CORREO ==========
  static async updateEmail(id, nuevoCorreo) {
    const [result] = await pool.query(
      'UPDATE usuarios SET correo = ? WHERE id = ?',
      [nuevoCorreo, id]
    );
    return result.affectedRows > 0;
  }

  // ========== VALIDACIONES ==========
  static async existsEmail(correo, excludeId = null) {
    let sql = 'SELECT id FROM usuarios WHERE correo = ?';
    const params = [correo];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
  }

  static async belongsToOrganization(userId, organizacionId) {
    const [rows] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ? AND organizacion_id = ?',
      [userId, organizacionId]
    );
    return rows.length > 0;
  }
}

module.exports = Usuario;