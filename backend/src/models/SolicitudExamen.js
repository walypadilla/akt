const { pool } = require('../config/db');

class SolicitudExamen {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `
      SELECT s.*,
             e.nombre AS examen_nombre,
             p.nombre AS paciente_nombre,
             p.cliente_id,
             c.nombre AS cliente_nombre,
             c.telefono_whatsapp,
             c.correo
      FROM solicitudes_examen s
      JOIN examenes e ON s.examen_id = e.id
      JOIN pacientes p ON s.paciente_id = p.id
      JOIN clientes c ON p.cliente_id = c.id
      WHERE s.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (filters.paciente_id) {
      sql += ' AND s.paciente_id = ?';
      params.push(filters.paciente_id);
    }
    if (filters.estado) {
      sql += ' AND s.estado = ?';
      params.push(filters.estado);
    }
    if (filters.consulta_id) {
      sql += ' AND s.consulta_id = ?';
      params.push(filters.consulta_id);
    }

    sql += ' ORDER BY s.fecha_solicitud DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT s.*,
              e.nombre AS examen_nombre,
              p.nombre AS paciente_nombre
       FROM solicitudes_examen s
       JOIN examenes e ON s.examen_id = e.id
       JOIN pacientes p ON s.paciente_id = p.id
       WHERE s.id = ? AND s.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const { organizacion_id, consulta_id, examen_id, paciente_id } = data;
    const [result] = await pool.query(
      `INSERT INTO solicitudes_examen
       (organizacion_id, consulta_id, examen_id, paciente_id)
       VALUES (?, ?, ?, ?)`,
      [organizacion_id, consulta_id || null, examen_id, paciente_id]
    );
    return result.insertId;
  }

  static async completar(id, organizacion_id, data) {
    const { resultado_texto, resultado_archivo_url } = data;
    const [result] = await pool.query(
      `UPDATE solicitudes_examen
       SET estado = 'Completado',
           fecha_resultado = NOW(),
           resultado_texto = ?,
           resultado_archivo_url = ?
       WHERE id = ? AND organizacion_id = ?`,
      [resultado_texto || null, resultado_archivo_url || null, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async cancelar(id, organizacion_id) {
    const [result] = await pool.query(
      `UPDATE solicitudes_examen
       SET estado = 'Cancelado'
       WHERE id = ? AND organizacion_id = ?`,
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async getPendientes(organizacion_id) {
    const [rows] = await pool.query(
      `SELECT s.*,
              e.nombre AS examen_nombre,
              p.nombre AS paciente_nombre,
              c.nombre AS cliente_nombre,
              c.telefono_whatsapp
       FROM solicitudes_examen s
       JOIN examenes e ON s.examen_id = e.id
       JOIN pacientes p ON s.paciente_id = p.id
       JOIN clientes c ON p.cliente_id = c.id
       WHERE s.organizacion_id = ? AND s.estado = 'Pendiente'
       ORDER BY s.fecha_solicitud ASC`,
      [organizacion_id]
    );
    return rows;
  }
}

module.exports = SolicitudExamen;