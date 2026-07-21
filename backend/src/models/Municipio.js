// backend/src/models/Municipio.js
const { pool } = require('../config/db');

class Municipio {
  static async findByDepartamento(id_departamento) {
    const [rows] = await pool.query(
      'SELECT * FROM municipios WHERE id_departamento = ? ORDER BY nombre_municipio',
      [id_departamento]
    );
    return rows;
  }
}

module.exports = Municipio;