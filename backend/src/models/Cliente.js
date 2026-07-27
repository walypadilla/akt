// backend/src/models/Cliente.js
const { pool } = require('../config/db');

class Cliente {
  // ============================================================
  // SANITIZACIÓN Y VALIDACIÓN DE DOCUMENTOS
  // ============================================================
  static sanitizarNumeroDocumento(tipo, numero) {
    if (!numero) return null;
    const limpio = numero.replace(/[\s-]/g, '').replace(/[^0-9]/g, '');
    if (tipo === 'DUI') {
      if (limpio.length !== 9) throw new Error('El DUI debe tener exactamente 9 dígitos (formato: 00000000-0)');
      if (!/^\d{9}$/.test(limpio)) throw new Error('El DUI solo debe contener números');
      return limpio;
    }
    if (tipo === 'NIT') {
      if (limpio.length !== 9 && limpio.length !== 14) {
        throw new Error('El NIT debe tener 9 dígitos (persona natural) o 14 dígitos (persona jurídica)');
      }
      if (!/^\d{9,14}$/.test(limpio)) throw new Error('El NIT solo debe contener números');
      return limpio;
    }
    return limpio;
  }

  static sanitizarNRC(nrc) {
    if (!nrc) return null;
    const limpio = nrc.replace(/[\s-]/g, '').trim();
    if (limpio.length < 2 || limpio.length > 8) {
      throw new Error('El NRC debe tener entre 2 y 8 caracteres');
    }
    return limpio;
  }

  // ============================================================
  // OBTENER TODOS (CON PAGINACIÓN Y FILTROS)
  // ============================================================
  static async findAll(organizacion_id, filters = {}, page = 1, limit = 10) {
    let sql = `
      SELECT c.*, 
             d.nombre_departamento, 
             m.nombre_municipio
      FROM clientes c
      LEFT JOIN departamentos d ON c.id_departamento = d.id_departamento
      LEFT JOIN municipios m ON c.id_municipio = m.id_municipio AND c.id_departamento = m.id_departamento
      WHERE c.organizacion_id = ?
    `;
    const params = [organizacion_id];

    // Filtro de estado (activo)
    if (filters.activo === 'true') {
      sql += ' AND c.activo = 1';
    } else if (filters.activo === 'false') {
      sql += ' AND c.activo = 0';
    } else if (filters.activo === undefined || filters.activo === '') {
      // Por defecto solo activos
      sql += ' AND c.activo = 1';
    }

    // Resto de filtros
    if (filters.nombre) {
      sql += ' AND c.nombre LIKE ?';
      params.push(`%${filters.nombre}%`);
    }
    if (filters.nit) {
      const nitLimpio = filters.nit.replace(/[\s-]/g, '');
      sql += ' AND c.nit LIKE ?';
      params.push(`%${nitLimpio}%`);
    }
    if (filters.dui) {
      const duiLimpio = filters.dui.replace(/[\s-]/g, '');
      sql += ' AND c.dui LIKE ?';
      params.push(`%${duiLimpio}%`);
    }
    if (filters.tipo_contribuyente) {
      sql += ' AND c.tipo_contribuyente = ?';
      params.push(filters.tipo_contribuyente);
    }
    if (filters.giro) {
      sql += ' AND c.giro = ?';
      params.push(filters.giro);
    }

    sql += ' ORDER BY c.nombre ASC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(sql, params);

    // Contar total (con los mismos filtros, sin paginación)
    let countSql = `
      SELECT COUNT(*) AS total
      FROM clientes c
      WHERE c.organizacion_id = ?
    `;
    const countParams = [organizacion_id];

    if (filters.activo === 'true') {
      countSql += ' AND c.activo = 1';
    } else if (filters.activo === 'false') {
      countSql += ' AND c.activo = 0';
    } else if (filters.activo === undefined || filters.activo === '') {
      countSql += ' AND c.activo = 1';
    }
    if (filters.nombre) {
      countSql += ' AND c.nombre LIKE ?';
      countParams.push(`%${filters.nombre}%`);
    }
    if (filters.nit) {
      countSql += ' AND c.nit LIKE ?';
      countParams.push(`%${filters.nit.replace(/[\s-]/g, '')}%`);
    }
    if (filters.dui) {
      countSql += ' AND c.dui LIKE ?';
      countParams.push(`%${filters.dui.replace(/[\s-]/g, '')}%`);
    }
    if (filters.tipo_contribuyente) {
      countSql += ' AND c.tipo_contribuyente = ?';
      countParams.push(filters.tipo_contribuyente);
    }
    if (filters.giro) {
      countSql += ' AND c.giro = ?';
      countParams.push(filters.giro);
    }

    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    // Contar activos, inactivos y nuevos del mes
    const [activosResult] = await pool.query(
      'SELECT COUNT(*) AS total FROM clientes WHERE organizacion_id = ? AND activo = 1',
      [organizacion_id]
    );
    const [inactivosResult] = await pool.query(
      'SELECT COUNT(*) AS total FROM clientes WHERE organizacion_id = ? AND activo = 0',
      [organizacion_id]
    );
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    const [nuevosResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM clientes 
       WHERE organizacion_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
      [organizacion_id, mesActual, anioActual]
    );

    return {
      clientes: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalActivos: activosResult[0]?.total || 0,
      totalInactivos: inactivosResult[0]?.total || 0,
      totalNuevosMes: nuevosResult[0]?.total || 0,
    };
  }

  // ============================================================
  // OBTENER POR ID
  // ============================================================
  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT c.*, d.nombre_departamento, m.nombre_municipio
       FROM clientes c
       LEFT JOIN departamentos d ON c.id_departamento = d.id_departamento
       LEFT JOIN municipios m ON c.id_municipio = m.id_municipio AND c.id_departamento = m.id_departamento
       WHERE c.id = ? AND c.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  // ============================================================
  // CREAR CLIENTE
  // ============================================================
  static async create(data) {
    const {
      organizacion_id,
      nombre,
      dui,
      nit,
      nrc,
      giro,
      tipo_contribuyente,
      direccion,
      telefono,
      correo,
      telefono_whatsapp,
      id_departamento,
      id_municipio,
      direccion_linea,
    } = data;

    const duiSanitizado = dui ? this.sanitizarNumeroDocumento('DUI', dui) : null;
    const nitSanitizado = nit ? this.sanitizarNumeroDocumento('NIT', nit) : null;
    const nrcSanitizado = this.sanitizarNRC(nrc);

    if (!duiSanitizado && !nitSanitizado) {
      throw new Error('Debe proporcionar al menos DUI o NIT');
    }
    if (nitSanitizado && nitSanitizado.length === 14 && !nrcSanitizado) {
      throw new Error('El NRC es obligatorio para personas jurídicas (NIT de 14 dígitos)');
    }

    const [result] = await pool.query(
      `INSERT INTO clientes 
       (organizacion_id, nombre, dui, nit, nrc, giro, tipo_contribuyente,
        direccion, telefono, correo, telefono_whatsapp,
        id_departamento, id_municipio, direccion_linea, activo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        organizacion_id,
        nombre,
        duiSanitizado,
        nitSanitizado,
        nrcSanitizado,
        giro || null,
        tipo_contribuyente || 'Pequeño',
        direccion || null,
        telefono || null,
        correo || null,
        telefono_whatsapp || null,
        id_departamento || null,
        id_municipio || null,
        direccion_linea || null,
      ]
    );
    return result.insertId;
  }

  // ============================================================
  // ACTUALIZAR CLIENTE
  // ============================================================
  static async update(id, organizacion_id, data) {
    const {
      nombre,
      dui,
      nit,
      nrc,
      giro,
      tipo_contribuyente,
      direccion,
      telefono,
      correo,
      telefono_whatsapp,
      id_departamento,
      id_municipio,
      direccion_linea,
      activo,
    } = data;

    const duiSanitizado = dui ? this.sanitizarNumeroDocumento('DUI', dui) : null;
    const nitSanitizado = nit ? this.sanitizarNumeroDocumento('NIT', nit) : null;
    const nrcSanitizado = this.sanitizarNRC(nrc);

    if (!duiSanitizado && !nitSanitizado) {
      throw new Error('Debe proporcionar al menos DUI o NIT');
    }
    if (nitSanitizado && nitSanitizado.length === 14 && !nrcSanitizado) {
      throw new Error('El NRC es obligatorio para personas jurídicas (NIT de 14 dígitos)');
    }

    const [result] = await pool.query(
      `UPDATE clientes SET
        nombre = ?,
        dui = ?,
        nit = ?,
        nrc = ?,
        giro = ?,
        tipo_contribuyente = ?,
        direccion = ?,
        telefono = ?,
        correo = ?,
        telefono_whatsapp = ?,
        id_departamento = ?,
        id_municipio = ?,
        direccion_linea = ?,
        activo = ?
       WHERE id = ? AND organizacion_id = ?`,
      [
        nombre,
        duiSanitizado,
        nitSanitizado,
        nrcSanitizado,
        giro || null,
        tipo_contribuyente || 'Pequeño',
        direccion || null,
        telefono || null,
        correo || null,
        telefono_whatsapp || null,
        id_departamento || null,
        id_municipio || null,
        direccion_linea || null,
        activo !== undefined ? activo : 1,
        id,
        organizacion_id,
      ]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // VERIFICAR SI NIT YA EXISTE
  // ============================================================
  static async existsNit(nit, organizacion_id, excludeId = null) {
    if (!nit) return false;
    const cleanNit = nit.replace(/[\s-]/g, '');
    let sql = 'SELECT id FROM clientes WHERE nit = ? AND organizacion_id = ?';
    const params = [cleanNit, organizacion_id];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
  }

  // ============================================================
  // DESACTIVAR CLIENTE
  // ============================================================
  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE clientes SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // REACTIVAR CLIENTE
  // ============================================================
  static async reactivar(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE clientes SET activo = 1 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // DATOS PARA GRÁFICAS
  // ============================================================
  static async getClientesPorMes(organizacion_id, anio) {
    const [rows] = await pool.query(
      `SELECT 
         MONTH(created_at) AS mes,
         COUNT(*) AS total
       FROM clientes
       WHERE organizacion_id = ? 
         AND YEAR(created_at) = ?
         AND activo = 1
       GROUP BY MONTH(created_at)
       ORDER BY mes ASC`,
      [organizacion_id, anio]
    );
    return rows;
  }

  static async getTopClientes(organizacion_id, anio, limit = 5) {
    const [rows] = await pool.query(
      `SELECT 
         c.id,
         c.nombre,
         COALESCE(SUM(f.total_pagar), 0) AS total_compras
       FROM clientes c
       LEFT JOIN facturas f ON f.cliente_id = c.id 
         AND f.organizacion_id = c.organizacion_id
         AND f.estado = 'Pagada'
         AND YEAR(f.creado_en) = ?
       WHERE c.organizacion_id = ?
         AND c.activo = 1
       GROUP BY c.id, c.nombre
       ORDER BY total_compras DESC
       LIMIT ?`,
      [anio, organizacion_id, limit]
    );
    return rows;
  }
}

module.exports = Cliente;