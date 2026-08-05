const { pool } = require('../config/db');

class HistorialVacuna {
  static async findByPaciente(paciente_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT h.*, v.nombre AS vacuna_nombre, v.dias_recordatorio,
              u.nombre AS medico_nombre
       FROM historial_vacunas h
       JOIN vacunas v ON h.vacuna_id = v.id
       JOIN medicos m ON h.medico_id = m.id
       JOIN usuarios u ON m.usuario_id = u.id
       WHERE h.paciente_id = ? AND h.organizacion_id = ?
       ORDER BY h.fecha_aplicacion DESC`,
      [paciente_id, organizacion_id]
    );
    return rows;
  }

  static async create(data) {
    const {
      organizacion_id, paciente_id, vacuna_id, fecha_aplicacion,
      fecha_proxima, lote, observaciones, medico_id
    } = data;
    const [result] = await pool.query(
      `INSERT INTO historial_vacunas
       (organizacion_id, paciente_id, vacuna_id, fecha_aplicacion,
        fecha_proxima, lote, observaciones, medico_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, paciente_id, vacuna_id, fecha_aplicacion,
       fecha_proxima || null, lote || null, observaciones || null, medico_id]
    );
    return result.insertId;
  }

  static async getProximasVacunas(organizacion_id, dias = 30) {
    const [rows] = await pool.query(
      `SELECT h.*, v.nombre AS vacuna_nombre, p.nombre AS paciente_nombre,
              cl.telefono_whatsapp, cl.nombre AS cliente_nombre
       FROM historial_vacunas h
       JOIN vacunas v ON h.vacuna_id = v.id
       JOIN pacientes p ON h.paciente_id = p.id
       JOIN clientes cl ON p.cliente_id = cl.id
       WHERE h.organizacion_id = ?
         AND h.fecha_proxima BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY h.fecha_proxima ASC`,
      [organizacion_id, dias]
    );
    return rows;
  }
}

module.exports = HistorialVacuna;