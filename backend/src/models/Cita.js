const { pool } = require('../config/db');

class Cita {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `
      SELECT c.*,
             p.nombre AS paciente_nombre,
             p.tipo_paciente,
             u.nombre AS medico_nombre,
             cl.nombre AS cliente_nombre,
             cl.telefono_whatsapp
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN medicos m ON c.medico_id = m.id
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN clientes cl ON p.cliente_id = cl.id
      WHERE c.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (filters.estado) {
      sql += ' AND c.estado = ?';
      params.push(filters.estado);
    }
    if (filters.medico_id) {
      sql += ' AND c.medico_id = ?';
      params.push(filters.medico_id);
    }
    if (filters.fecha_inicio && filters.fecha_fin) {
      sql += ' AND c.fecha_hora BETWEEN ? AND ?';
      params.push(filters.fecha_inicio, filters.fecha_fin);
    }
    if (filters.paciente_id) {
      sql += ' AND c.paciente_id = ?';
      params.push(filters.paciente_id);
    }

    sql += ' ORDER BY c.fecha_hora ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT c.*,
              p.nombre AS paciente_nombre,
              u.nombre AS medico_nombre
       FROM citas c
       JOIN pacientes p ON c.paciente_id = p.id
       JOIN medicos m ON c.medico_id = m.id
       JOIN usuarios u ON m.usuario_id = u.id
       WHERE c.id = ? AND c.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, paciente_id, medico_id, fecha_hora,
      duracion_minutos = 30, observaciones
    } = data;

    const [result] = await pool.query(
      `INSERT INTO citas
       (organizacion_id, paciente_id, medico_id, fecha_hora,
        duracion_minutos, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, 'Programada', ?)`,
      [organizacion_id, paciente_id, medico_id, fecha_hora,
       duracion_minutos, observaciones || null]
    );
    return result.insertId;
  }

  static async updateStatus(id, organizacion_id, estado) {
    const [result] = await pool.query(
      'UPDATE citas SET estado = ? WHERE id = ? AND organizacion_id = ?',
      [estado, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async update(id, organizacion_id, data) {
    const fields = [];
    const values = [];

    const allowed = ['fecha_hora', 'duracion_minutos', 'estado', 'observaciones'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return false;

    values.push(id, organizacion_id);
    const [result] = await pool.query(
      `UPDATE citas SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async marcarRecordatorioEnviado(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE citas SET recordatorio_enviado = 1 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Cita;