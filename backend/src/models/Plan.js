const { pool } = require('../config/db');

class Plan {
  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM planes WHERE activo = 1 ORDER BY precio');
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM planes WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(data) {
    const { nombre, descripcion, limite_facturas_mensuales, limite_whatsapp_mensual, precio } = data;
    const [result] = await pool.query(
      `INSERT INTO planes (nombre, descripcion, limite_facturas_mensuales, limite_whatsapp_mensual, precio)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, descripcion, limite_facturas_mensuales, limite_whatsapp_mensual, precio]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { nombre, descripcion, limite_facturas_mensuales, limite_whatsapp_mensual, precio, activo } = data;
    await pool.query(
      `UPDATE planes SET nombre=?, descripcion=?, limite_facturas_mensuales=?, 
       limite_whatsapp_mensual=?, precio=?, activo=? WHERE id=?`,
      [nombre, descripcion, limite_facturas_mensuales, limite_whatsapp_mensual, precio, activo, id]
    );
  }

  static async delete(id) {
    await pool.query('UPDATE planes SET activo = 0 WHERE id = ?', [id]);
  }
}

module.exports = Plan;