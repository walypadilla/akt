const { pool } = require('../config/db');

class Consulta {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `
      SELECT c.*,
             p.nombre AS paciente_nombre,
             u.nombre AS medico_nombre,
             cl.nombre AS cliente_nombre
      FROM consultas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN medicos m ON c.medico_id = m.id
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN clientes cl ON p.cliente_id = cl.id
      WHERE c.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (filters.paciente_id) {
      sql += ' AND c.paciente_id = ?';
      params.push(filters.paciente_id);
    }
    if (filters.medico_id) {
      sql += ' AND c.medico_id = ?';
      params.push(filters.medico_id);
    }
    if (filters.fecha_inicio && filters.fecha_fin) {
      sql += ' AND c.fecha_consulta BETWEEN ? AND ?';
      params.push(filters.fecha_inicio, filters.fecha_fin);
    }

    sql += ' ORDER BY c.fecha_consulta DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT c.*,
              p.nombre AS paciente_nombre,
              p.tipo_paciente,
              u.nombre AS medico_nombre,
              cl.nombre AS cliente_nombre,
              cl.telefono_whatsapp,
              cl.correo
       FROM consultas c
       JOIN pacientes p ON c.paciente_id = p.id
       JOIN medicos m ON c.medico_id = m.id
       JOIN usuarios u ON m.usuario_id = u.id
       JOIN clientes cl ON p.cliente_id = cl.id
       WHERE c.id = ? AND c.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, cita_id, paciente_id, medico_id, fecha_consulta,
      subjetivo, objetivo, analisis, plan,
      presion_arterial, frecuencia_cardiaca, temperatura,
      peso, talla, imc,
      diagnostico_codigo, diagnostico_texto, receta,
      vacunas_aplicadas
    } = data;

    const [result] = await pool.query(
      `INSERT INTO consultas
       (organizacion_id, cita_id, paciente_id, medico_id, fecha_consulta,
        subjetivo, objetivo, analisis, plan,
        presion_arterial, frecuencia_cardiaca, temperatura,
        peso, talla, imc,
        diagnostico_codigo, diagnostico_texto, receta,
        vacunas_aplicadas)
       VALUES (?, ?, ?, ?, ?,
               ?, ?, ?, ?,
               ?, ?, ?,
               ?, ?, ?,
               ?, ?, ?,
               ?)`,
      [
        organizacion_id, cita_id || null, paciente_id, medico_id, fecha_consulta,
        subjetivo || null, objetivo || null, analisis || null, plan || null,
        presion_arterial || null, frecuencia_cardiaca || null, temperatura || null,
        peso || null, talla || null, imc || null,
        diagnostico_codigo || null, diagnostico_texto || null, receta || null,
        vacunas_aplicadas ? JSON.stringify(vacunas_aplicadas) : null
      ]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const fields = [];
    const values = [];

    const allowed = [
      'subjetivo', 'objetivo', 'analisis', 'plan',
      'presion_arterial', 'frecuencia_cardiaca', 'temperatura',
      'peso', 'talla', 'imc',
      'diagnostico_codigo', 'diagnostico_texto', 'receta',
      'vacunas_aplicadas'
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'vacunas_aplicadas' && data[key]) {
          values.push(JSON.stringify(data[key]));
        } else {
          values.push(data[key]);
        }
      }
    }

    if (fields.length === 0) return false;

    values.push(id, organizacion_id);
    const [result] = await pool.query(
      `UPDATE consultas SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }
}

module.exports = Consulta;