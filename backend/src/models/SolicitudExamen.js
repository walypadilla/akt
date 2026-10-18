// backend/src/models/SolicitudExamen.js
const { pool } = require('../config/db');
const crypto = require('crypto');

class SolicitudExamen {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `
      SELECT s.*,
             e.nombre AS examen_nombre,
             e.precio AS examen_precio,
             p.nombre AS paciente_nombre,
             p.apellidos AS paciente_apellidos,
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
              e.precio AS examen_precio,
              p.nombre AS paciente_nombre,
              p.apellidos AS paciente_apellidos
       FROM solicitudes_examen s
       JOIN examenes e ON s.examen_id = e.id
       JOIN pacientes p ON s.paciente_id = p.id
       WHERE s.id = ? AND s.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async findByToken(token) {
    const [rows] = await pool.query(
      `SELECT 
        s.id,
        s.estado,
        s.fecha_solicitud,
        s.fecha_resultado,
        s.resultado_texto,
        s.resultado_archivo_url,
        s.token_expira_en,
        s.token_usos,
        e.nombre AS examen_nombre,
        e.descripcion AS examen_descripcion,
        p.nombre AS paciente_nombre,
        p.apellidos AS paciente_apellidos,
        p.fecha_nacimiento AS paciente_fecha_nacimiento,
        p.genero AS paciente_genero,
        p.codigo_expediente AS paciente_codigo,
        cl.nombre AS cliente_nombre,
        u.nombre AS medico_nombre,
        o.nombre_empresa, o.nit, o.nrc, o.direccion, o.telefono, o.correo_contacto, o.logo_url
       FROM solicitudes_examen s
       LEFT JOIN examenes e ON s.examen_id = e.id
       LEFT JOIN pacientes p ON s.paciente_id = p.id
       LEFT JOIN clientes cl ON p.cliente_id = cl.id
       LEFT JOIN consultas c ON s.consulta_id = c.id
       LEFT JOIN medicos m ON c.medico_id = m.id
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       LEFT JOIN organizaciones o ON s.organizacion_id = o.id
       WHERE s.token_publico = ? 
         AND s.token_expira_en > NOW()
         AND s.estado = 'Completado'
       LIMIT 1`,
      [token]
    );

    if (rows.length > 0) {
      // Incrementar contador de usos (auditoría)
      await pool.query(
        'UPDATE solicitudes_examen SET token_usos = token_usos + 1 WHERE id = ?',
        [rows[0].id]
      );
    }

    return rows[0];
  }

  static async create(data) {
    const { organizacion_id, consulta_id, examen_id, paciente_id, tipo_ejecucion } = data;
    const [result] = await pool.query(
      `INSERT INTO solicitudes_examen
       (organizacion_id, consulta_id, examen_id, paciente_id, tipo_ejecucion)
       VALUES (?, ?, ?, ?, ?)`,
      [
        organizacion_id,
        consulta_id || null,
        examen_id,
        paciente_id,
        tipo_ejecucion === 'Externo' ? 'Externo' : 'Interno',
      ]
    );
    return result.insertId;
  }

  static async completar(id, organizacion_id, data) {
    const { resultado_texto, resultado_archivo_url, costo_aplicado } = data;

    // Token de 64 chars hex = 256 bits de entropía (criptográficamente seguro)
    const token = crypto.randomBytes(32).toString('hex');

    const [result] = await pool.query(
      `UPDATE solicitudes_examen
       SET estado = 'Completado',
           fecha_resultado = NOW(),
           resultado_texto = ?,
           resultado_archivo_url = COALESCE(?, resultado_archivo_url),
           costo_aplicado = COALESCE(?, costo_aplicado),
           token_publico = ?,
           token_expira_en = DATE_ADD(NOW(), INTERVAL 7 DAY)
       WHERE id = ? AND organizacion_id = ?`,
      [
        resultado_texto || null,
        resultado_archivo_url || null,
        costo_aplicado || null,
        token,
        id,
        organizacion_id,
      ]
    );
    return result.affectedRows > 0;
  }

  static async cancelar(id, organizacion_id) {
    const [result] = await pool.query(
      `UPDATE solicitudes_examen SET estado = 'Cancelado'
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

  static async getDashboard(organizacion_id, anio = null, mes = null) {
    const anioFiltro = anio || new Date().getFullYear();
    const mesFiltro = mes ? parseInt(mes) : null;

    // Pendientes (siempre global, no se filtra por fecha)
    const [pendientes] = await pool.query(
      `SELECT COUNT(*) AS total FROM solicitudes_examen 
      WHERE organizacion_id = ? AND estado = 'Pendiente'`,
      [organizacion_id]
    );

    // Solicitados en el período
    let sqlSolicitados = `
      SELECT COUNT(*) AS total FROM solicitudes_examen 
      WHERE organizacion_id = ? AND YEAR(fecha_solicitud) = ?
    `;
    const paramsSolicitados = [organizacion_id, anioFiltro];
    if (mesFiltro) {
      sqlSolicitados += ' AND MONTH(fecha_solicitud) = ?';
      paramsSolicitados.push(mesFiltro);
    }
    const [solicitados] = await pool.query(sqlSolicitados, paramsSolicitados);

    // Completados en el período (por fecha_resultado)
    let sqlCompletados = `
      SELECT COUNT(*) AS total FROM solicitudes_examen 
      WHERE organizacion_id = ? AND estado = 'Completado' 
        AND YEAR(fecha_resultado) = ?
    `;
    const paramsCompletados = [organizacion_id, anioFiltro];
    if (mesFiltro) {
      sqlCompletados += ' AND MONTH(fecha_resultado) = ?';
      paramsCompletados.push(mesFiltro);
    }
    const [completados] = await pool.query(sqlCompletados, paramsCompletados);

    // Top 5 en el período
    let sqlTop = `
      SELECT e.id, e.nombre, COUNT(s.id) AS total
      FROM solicitudes_examen s
      JOIN examenes e ON s.examen_id = e.id
      WHERE s.organizacion_id = ? AND YEAR(s.fecha_solicitud) = ?
    `;
    const paramsTop = [organizacion_id, anioFiltro];
    if (mesFiltro) {
      sqlTop += ' AND MONTH(s.fecha_solicitud) = ?';
      paramsTop.push(mesFiltro);
    }
    sqlTop += ' GROUP BY e.id, e.nombre ORDER BY total DESC LIMIT 5';
    const [topExamenes] = await pool.query(sqlTop, paramsTop);

    // Años disponibles
    const [anios] = await pool.query(
      `SELECT DISTINCT YEAR(fecha_solicitud) AS anio 
      FROM solicitudes_examen 
      WHERE organizacion_id = ? AND fecha_solicitud IS NOT NULL
      ORDER BY anio DESC`,
      [organizacion_id]
    );

    return {
      pendientes: pendientes[0]?.total || 0,
      delMes: solicitados[0]?.total || 0,
      completadosMes: completados[0]?.total || 0,
      topExamenes: topExamenes || [],
      aniosDisponibles: anios.length ? anios.map((a) => a.anio) : [new Date().getFullYear()],
      periodo: { anio: anioFiltro, mes: mesFiltro },
    };
  }

  static async findForExport(organizacion_id, filters = {}) {
    let sql = `
      SELECT 
        s.id,
        s.fecha_solicitud,
        s.fecha_resultado,
        s.estado,
        s.tipo_ejecucion,
        s.costo_aplicado,
        s.resultado_texto,
        e.nombre AS examen_nombre,
        p.nombre AS paciente_nombre,
        p.apellidos AS paciente_apellidos,
        c.nombre AS cliente_nombre,
        c.telefono_whatsapp,
        u.nombre AS medico_nombre
      FROM solicitudes_examen s
      JOIN examenes e ON s.examen_id = e.id
      JOIN pacientes p ON s.paciente_id = p.id
      JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN consultas co ON s.consulta_id = co.id
      LEFT JOIN medicos m ON co.medico_id = m.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE s.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (filters.estado) {
      sql += ' AND s.estado = ?';
      params.push(filters.estado);
    }
    if (filters.examen_id) {
      sql += ' AND s.examen_id = ?';
      params.push(filters.examen_id);
    }
    if (filters.search) {
      sql += ' AND (p.nombre LIKE ? OR p.apellidos LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.fecha_inicio) {
      sql += ' AND DATE(s.fecha_solicitud) >= ?';
      params.push(filters.fecha_inicio);
    }
    if (filters.fecha_fin) {
      sql += ' AND DATE(s.fecha_solicitud) <= ?';
      params.push(filters.fecha_fin);
    }

    sql += ' ORDER BY s.fecha_solicitud DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }
}

module.exports = SolicitudExamen;