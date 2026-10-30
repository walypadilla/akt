const { pool } = require('../config/db');

class Cita {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `
      SELECT c.*,
             p.nombre AS paciente_nombre,
             cl.nombre AS cliente_nombre,
             cl.telefono AS cliente_telefono,
             cl.telefono_whatsapp,
             u.nombre AS medico_nombre
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN medicos m ON c.medico_id = m.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE c.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (filters.estado) { sql += ' AND c.estado = ?'; params.push(filters.estado); }
    if (filters.medico_id) { sql += ' AND c.medico_id = ?'; params.push(filters.medico_id); }
    if (filters.paciente_id) { sql += ' AND c.paciente_id = ?'; params.push(filters.paciente_id); }
    if (filters.cliente_id) { sql += ' AND c.cliente_id = ?'; params.push(filters.cliente_id); }
    if (filters.fecha_inicio && filters.fecha_fin) {
      sql += ' AND c.fecha_hora BETWEEN ? AND ?';
      params.push(filters.fecha_inicio, filters.fecha_fin);
    }

    sql += ' ORDER BY c.fecha_hora ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT c.*, 
              p.nombre AS paciente_nombre, 
              cl.nombre AS cliente_nombre,
              u.nombre AS medico_nombre
       FROM citas c
       LEFT JOIN pacientes p ON c.paciente_id = p.id
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       LEFT JOIN medicos m ON c.medico_id = m.id
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       WHERE c.id = ? AND c.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, paciente_id = null, cliente_id = null, medico_id = null, 
      fecha_hora, duracion_minutos = 30, observaciones, titulo
    } = data;

    const [result] = await pool.query(
      `INSERT INTO citas
       (organizacion_id, paciente_id, cliente_id, medico_id, fecha_hora,
        duracion_minutos, estado, observaciones, titulo)
       VALUES (?, ?, ?, ?, ?, ?, 'Programada', ?, ?)`,
      [organizacion_id, paciente_id, cliente_id, medico_id, fecha_hora, duracion_minutos, observaciones || null, titulo || null]
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
    const allowed = ['fecha_hora', 'duracion_minutos', 'estado', 'observaciones', 'paciente_id', 'cliente_id', 'medico_id', 'titulo'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key] === '' ? null : data[key]);
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

  static async checkConflicto(organizacion_id, medico_id, paciente_id, fecha_hora, duracion_minutos, exclude_id = null) {
    // Lógica: Busca si el médico o el paciente tienen otra cita que se cruce con este bloque de tiempo
    let sql = `
      SELECT id, medico_id, paciente_id, fecha_hora, duracion_minutos
      FROM citas
      WHERE organizacion_id = ?
        AND estado NOT IN ('Cancelada', 'Atendida')
        AND (medico_id = ? OR paciente_id = ?)
        AND fecha_hora < DATE_ADD(?, INTERVAL ? MINUTE)
        AND DATE_ADD(fecha_hora, INTERVAL duracion_minutos MINUTE) > ?
    `;
    const params = [organizacion_id, medico_id, paciente_id, fecha_hora, duracion_minutos || 30, fecha_hora];
    
    if (exclude_id) {
      sql += ' AND id != ?';
      params.push(exclude_id);
    }

    const [rows] = await pool.query(sql, params);
    return rows;
  }

}

module.exports = Cita;