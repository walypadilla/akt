const { pool } = require('../config/db');

class Medico {
  static async create(data) {
    const [result] = await pool.query(
      `INSERT INTO medicos (organizacion_id, usuario_id, especialidad, numero_licencia, activo)
       VALUES (?, ?, ?, ?, 1)`,
      [data.organizacion_id, data.usuario_id, data.especialidad || null, data.numero_licencia || null]
    );
    return result.insertId;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT m.*, u.nombre, u.correo, u.telefono
       FROM medicos m
       JOIN usuarios u ON m.usuario_id = u.id
       WHERE m.id = ? AND m.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0] || null;
  }

  static async findByUsuarioId(usuario_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT * FROM medicos WHERE usuario_id = ? AND organizacion_id = ?`,
      [usuario_id, organizacion_id]
    );
    return rows[0] || null;
  }

  static async findAll(organizacion_id, soloActivos = true) {
    let sql = `
      SELECT m.*, u.nombre, u.correo
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.organizacion_id = ?
    `;
    const params = [organizacion_id];
    if (soloActivos) {
      sql += ` AND m.activo = 1`;
    }
    sql += ` ORDER BY u.nombre ASC`;
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findAllWithStats(organizacion_id, anio = null, mes = null, soloActivos = true) {
    const anioFiltro = anio || new Date().getFullYear();
    
    let sql = `
      SELECT m.*, u.nombre, u.correo,
        COALESCE((
          SELECT SUM(f.total_pagar)
          FROM facturas f
          JOIN consultas c ON c.factura_id = f.id
          WHERE c.medico_id = m.id
            AND f.organizacion_id = ?
            AND YEAR(f.creado_en) = ?
            ${mes ? 'AND MONTH(f.creado_en) = ?' : ''}
            AND f.estado = 'Pagada'
        ), 0) AS total_facturado,
        (
          SELECT COUNT(*)
          FROM consultas c2
          WHERE c2.medico_id = m.id
            AND c2.organizacion_id = ?
            AND YEAR(c2.fecha_consulta) = ?
            ${mes ? 'AND MONTH(c2.fecha_consulta) = ?' : ''}
        ) AS total_consultas
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.organizacion_id = ?
    `;

    const params = [];
    params.push(organizacion_id, anioFiltro);
    if (mes) params.push(mes);
    params.push(organizacion_id, anioFiltro);
    if (mes) params.push(mes);
    params.push(organizacion_id);

    if (soloActivos) {
      sql += ` AND m.activo = 1`;
    }
    sql += ` ORDER BY u.nombre ASC`;

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async update(id, organizacion_id, data) {
    const fields = [];
    const values = [];

    if (data.especialidad !== undefined) {
      fields.push('especialidad = ?');
      values.push(data.especialidad);
    }
    if (data.numero_licencia !== undefined) {
      fields.push('numero_licencia = ?');
      values.push(data.numero_licencia);
    }
    if (data.activo !== undefined) {
      fields.push('activo = ?');
      values.push(data.activo ? 1 : 0);
    }

    if (fields.length === 0) return 0;

    values.push(id, organizacion_id);
    const [result] = await pool.query(
      `UPDATE medicos SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      values
    );
    return result.affectedRows;
  }

  // Obtener consultas del médico unidas con sus facturas (si existen)
  static async getDetalleConConsultas(medico_id, organizacion_id, anio = null, mes = null) {
    let sql = `
      SELECT 
        c.id AS consulta_id,
        c.fecha_consulta,
        c.motivo,
        c.diagnostico,
        c.factura_id,
        p.nombre AS paciente_nombre,
        f.numero_correlativo AS factura_numero,
        f.total_pagar AS factura_total,
        f.estado AS factura_estado,
        f.creado_en AS factura_fecha
      FROM consultas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN facturas f ON c.factura_id = f.id AND f.organizacion_id = ?
      WHERE c.medico_id = ? AND c.organizacion_id = ?
    `;
    
    const params = [organizacion_id, medico_id, organizacion_id];

    if (anio) {
      sql += ` AND YEAR(c.fecha_consulta) = ?`;
      params.push(anio);
    }
    if (mes) {
      sql += ` AND MONTH(c.fecha_consulta) = ?`;
      params.push(mes);
    }

    sql += ` ORDER BY c.fecha_consulta DESC`;

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  // Años disponibles en base a historial de consultas
  static async getAniosDisponibles(medico_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(fecha_consulta) AS anio 
       FROM consultas 
       WHERE medico_id = ? AND organizacion_id = ? AND fecha_consulta IS NOT NULL
       ORDER BY anio DESC`,
      [medico_id, organizacion_id]
    );
    const anios = rows.map(r => r.anio);
    return anios.length ? anios : [new Date().getFullYear()];
  }

  // Meses disponibles en un año específico
  static async getMesesDisponibles(medico_id, organizacion_id, anio) {
    const [rows] = await pool.query(
      `SELECT DISTINCT MONTH(fecha_consulta) AS mes 
       FROM consultas 
       WHERE medico_id = ? AND organizacion_id = ? AND YEAR(fecha_consulta) = ?
       ORDER BY mes ASC`,
      [medico_id, organizacion_id, anio]
    );
    return rows.map(r => r.mes);
  }
}

module.exports = Medico;