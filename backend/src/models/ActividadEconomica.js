// backend/src/models/ActividadEconomica.js
const { pool } = require('../config/db');

class ActividadEconomica {
  static async findAll() {
    const [rows] = await pool.query(
      'SELECT * FROM actividades_economicas ORDER BY descripcion_giro'
    );
    return rows;
  }

  static async findByCodigo(codigo_giro) {
    const [rows] = await pool.query(
      'SELECT * FROM actividades_economicas WHERE codigo_giro = ?',
      [codigo_giro]
    );
    return rows[0];
  }
}

module.exports = ActividadEconomica;