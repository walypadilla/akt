const { pool } = require('../config/db');

class HistorialVacuna {
  // Historial completo de un paciente con info de factura
  static async findByPaciente(paciente_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT 
        h.*,
        v.nombre AS vacuna_nombre,
        v.dias_recordatorio,
        u.nombre AS medico_nombre,
        f.numero_correlativo AS factura_numero,
        f.estado AS factura_estado,
        f.total_pagar AS factura_total,
        c.codigo_sku AS consulta_sku,
        p.nombre AS paciente_nombre,
        p.apellidos AS paciente_apellidos
       FROM historial_vacunas h
       JOIN vacunas v ON h.vacuna_id = v.id
       LEFT JOIN medicos m ON h.medico_id = m.id
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       LEFT JOIN facturas f ON h.factura_id = f.id
       LEFT JOIN consultas c ON h.consulta_id = c.id
       JOIN pacientes p ON h.paciente_id = p.id
       WHERE h.paciente_id = ? AND h.organizacion_id = ?
       ORDER BY h.fecha_aplicacion DESC`,
      [paciente_id, organizacion_id]
    );
    return rows;
  }

  // Próximas dosis (con semáforo)
  static async getProximasVacunas(organizacion_id, dias = 30) {
    const [rows] = await pool.query(
      `SELECT 
        h.id,
        h.fecha_proxima,
        h.paciente_id,
        p.nombre AS paciente_nombre,
        p.apellidos AS paciente_apellidos,
        c.nombre AS cliente_nombre,
        c.telefono_whatsapp,
        v.nombre AS vacuna_nombre,
        DATEDIFF(h.fecha_proxima, CURDATE()) AS dias_restantes
       FROM historial_vacunas h
       JOIN pacientes p ON h.paciente_id = p.id
       JOIN clientes c ON p.cliente_id = c.id
       JOIN vacunas v ON h.vacuna_id = v.id
       WHERE h.organizacion_id = ?
         AND h.fecha_proxima IS NOT NULL
         AND h.fecha_proxima <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY h.fecha_proxima ASC`,
      [organizacion_id, parseInt(dias)]
    );
    return rows;
  }

  // Cartilla completa con semáforo (verde/amarillo/rojo)
  static async getCartillaPaciente(paciente_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT 
        h.*,
        v.nombre AS vacuna_nombre,
        v.dias_recordatorio,
        u.nombre AS medico_nombre,
        f.numero_correlativo AS factura_numero,
        f.estado AS factura_estado,
        DATEDIFF(h.fecha_proxima, CURDATE()) AS dias_restantes
       FROM historial_vacunas h
       JOIN vacunas v ON h.vacuna_id = v.id
       LEFT JOIN medicos m ON h.medico_id = m.id
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       LEFT JOIN facturas f ON h.factura_id = f.id
       WHERE h.paciente_id = ? AND h.organizacion_id = ?
       ORDER BY h.fecha_aplicacion DESC`,
      [paciente_id, organizacion_id]
    );

    // Agregar semáforo calculado
    return rows.map((r) => {
      let semaforo = 'gris';
      let mensaje = 'Sin fecha próxima registrada';
      if (r.fecha_proxima) {
        if (r.dias_restantes < 0) {
          semaforo = 'rojo';
          mensaje = `Vencida hace ${Math.abs(r.dias_restantes)} días`;
        } else if (r.dias_restantes <= 15) {
          semaforo = 'amarillo';
          mensaje = `Vence en ${r.dias_restantes} días`;
        } else {
          semaforo = 'verde';
          mensaje = `Al día · próxima en ${r.dias_restantes} días`;
        }
      }
      return { ...r, semaforo, mensaje_semaforo: mensaje };
    });
  }

  static async create(data) {
    const {
      organizacion_id, paciente_id, vacuna_id, consulta_id,
      fecha_aplicacion, fecha_proxima, lote, observaciones, medico_id,
    } = data;

    const [result] = await pool.query(
      `INSERT INTO historial_vacunas
       (organizacion_id, paciente_id, vacuna_id, consulta_id, medico_id,
        fecha_aplicacion, fecha_proxima, lote, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizacion_id,
        paciente_id,
        vacuna_id,
        consulta_id || null,
        medico_id || null,
        fecha_aplicacion,
        fecha_proxima || null,
        lote || null,
        observaciones || null,
      ]
    );
    return result.insertId;
  }

  static async updateFactura(id, organizacion_id, factura_id) {
    const [result] = await pool.query(
      `UPDATE historial_vacunas 
      SET factura_id = ? 
      WHERE id = ? AND organizacion_id = ?`,
      [factura_id, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async findByToken(token) {
    const [rows] = await pool.query(
      `SELECT p.id AS paciente_id, p.nombre, p.apellidos, p.codigo_expediente,
              p.fecha_nacimiento, p.genero, p.especie, p.raza,
              o.nombre_empresa, o.logo_url, o.telefono, o.correo_contacto
       FROM pacientes p
       JOIN organizaciones o ON p.organizacion_id = o.id
       WHERE p.cartilla_token = ? 
         AND p.cartilla_token_expira > NOW()
       LIMIT 1`,
      [token]
    );
    return rows[0];
  }

  // Dashboard KPIs
  static async getDashboard(organizacion_id, anio, mes) {
    const anioFiltro = anio || new Date().getFullYear();
    const mesFiltro = mes ? parseInt(mes) : null;

    let sqlAplic = `
      SELECT COUNT(*) AS total FROM historial_vacunas
      WHERE organizacion_id = ? AND YEAR(fecha_aplicacion) = ?
    `;
    const paramsAplic = [organizacion_id, anioFiltro];
    if (mesFiltro) {
      sqlAplic += ' AND MONTH(fecha_aplicacion) = ?';
      paramsAplic.push(mesFiltro);
    }
    const [aplicadas] = await pool.query(sqlAplic, paramsAplic);

    // Usamos ROW_NUMBER para obtener el ÚLTIMO registro por paciente y vacuna
    const [estados] = await pool.query(`
      WITH UltimosEstados AS (
        SELECT 
          fecha_proxima,
          ROW_NUMBER() OVER(PARTITION BY paciente_id, vacuna_id ORDER BY fecha_aplicacion DESC, id DESC) as rn
        FROM historial_vacunas
        WHERE organizacion_id = ? AND fecha_proxima IS NOT NULL
      )
      SELECT 
        SUM(CASE WHEN fecha_proxima < CURDATE() THEN 1 ELSE 0 END) AS vencidas,
        SUM(CASE WHEN fecha_proxima >= CURDATE() AND fecha_proxima <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS proximas
      FROM UltimosEstados
      WHERE rn = 1
    `, [organizacion_id]);

    const vencidas = parseInt(estados[0]?.vencidas || 0);
    const proximas = parseInt(estados[0]?.proximas || 0);

    let sqlTop = `
      SELECT v.id, v.nombre, COUNT(h.id) AS total
      FROM historial_vacunas h
      JOIN vacunas v ON h.vacuna_id = v.id
      WHERE h.organizacion_id = ? AND YEAR(h.fecha_aplicacion) = ?
    `;
    const paramsTop = [organizacion_id, anioFiltro];
    if (mesFiltro) {
      sqlTop += ' AND MONTH(h.fecha_aplicacion) = ?';
      paramsTop.push(mesFiltro);
    }
    sqlTop += ' GROUP BY v.id, v.nombre ORDER BY total DESC LIMIT 5';
    const [topVacunas] = await pool.query(sqlTop, paramsTop);

    const [anios] = await pool.query(
      `SELECT DISTINCT YEAR(fecha_aplicacion) AS anio 
       FROM historial_vacunas WHERE organizacion_id = ? 
       ORDER BY anio DESC`,
      [organizacion_id]
    );

    return {
      aplicadasMes: aplicadas[0]?.total || 0,
      proximas,
      vencidas,
      topVacunas: topVacunas || [],
      aniosDisponibles: anios.length ? anios.map((a) => a.anio) : [new Date().getFullYear()],
    };
  }

  static async vincularFacturaAConsulta(consulta_id, organizacion_id, factura_id) {
    const [result] = await pool.query(
      `UPDATE historial_vacunas 
      SET factura_id = ? 
      WHERE consulta_id = ? 
        AND organizacion_id = ? 
        AND factura_id IS NULL`,
      [factura_id, consulta_id, organizacion_id]
    );
    return result.affectedRows;
  }

  // Obtener historial global filtrado por mes, año y estado
  static async findAllGlobal(organizacion_id, anio, mes, filtro = 'todas', page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // Base de la consulta que obtiene solo el ÚLTIMO registro por paciente y vacuna
    let baseSql = `
      WITH UltimosEstados AS (
        SELECT h.*, 
               ROW_NUMBER() OVER(PARTITION BY h.paciente_id, h.vacuna_id ORDER BY h.fecha_aplicacion DESC, h.id DESC) as rn
        FROM historial_vacunas h
        WHERE h.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (anio) {
      baseSql += ' AND YEAR(h.fecha_aplicacion) = ?';
      params.push(parseInt(anio));
    }
    if (mes) {
      baseSql += ' AND MONTH(h.fecha_aplicacion) = ?';
      params.push(parseInt(mes));
    }

    baseSql += ` ) SELECT * FROM UltimosEstados WHERE rn = 1`;

    // Aplicamos el filtro de estado
    let filtroSql = '';
    if (filtro === 'vencidas') {
      filtroSql = ' AND fecha_proxima < CURDATE()';
    } else if (filtro === 'proximas') {
      filtroSql = ' AND fecha_proxima >= CURDATE() AND fecha_proxima <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)';
    } else if (filtro === 'aplicadas') {
      filtroSql = ' AND (fecha_proxima IS NULL OR fecha_proxima >= CURDATE())';
    }

    // Total de registros para paginación
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM (${baseSql} ${filtroSql}) AS sub`, 
      params
    );
    const total = countResult[0].total;

    // Consulta final con JOINs
    const sqlData = `
      SELECT 
        u.id, u.paciente_id, u.fecha_aplicacion, u.fecha_proxima, u.lote, u.observaciones,
        v.id AS vacuna_id, v.nombre AS vacuna_nombre,
        p.nombre AS paciente_nombre, p.apellidos AS paciente_apellidos, p.especie,
        c.nombre AS cliente_nombre, c.telefono_whatsapp,
        us.nombre AS medico_nombre,
        DATEDIFF(u.fecha_proxima, CURDATE()) AS dias_restantes
      FROM (${baseSql} ${filtroSql}) AS u
      JOIN vacunas v ON u.vacuna_id = v.id
      JOIN pacientes p ON u.paciente_id = p.id
      JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN medicos m ON u.medico_id = m.id
      LEFT JOIN usuarios us ON m.usuario_id = us.id
      ORDER BY u.fecha_proxima ASC, u.fecha_aplicacion DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limit, offset];
    const [rows] = await pool.query(sqlData, dataParams);

    return {
      data: rows,
      paginacion: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

}

module.exports = HistorialVacuna;