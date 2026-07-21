// backend/src/models/Departamento.js
const { pool } = require('../config/db');

class Departamento {
  static async findAll() {
    const [rows] = await pool.query(
      'SELECT * FROM departamentos ORDER BY nombre_departamento'
    );
    return rows;
  }
}

module.exports = Departamento;