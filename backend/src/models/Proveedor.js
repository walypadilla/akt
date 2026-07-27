// backend/src/models/Proveedor.js
const { pool } = require('../config/db');

class Proveedor {
  // ============================================================
  // SANITIZACIÓN Y VALIDACIÓN DE DOCUMENTOS
  // ============================================================
  static sanitizarNumeroDocumento(tipo, numero) {
    if (!numero) throw new Error('El número de documento es requerido');
    
    // Eliminar espacios, guiones y caracteres no numéricos
    const limpio = numero.replace(/[\s-]/g, '').replace(/[^0-9]/g, '');
    
    if (tipo === 'DUI') {
      if (limpio.length !== 9) {
        throw new Error('El DUI debe tener exactamente 9 dígitos (formato: 00000000-0)');
      }
      if (!/^\d{9}$/.test(limpio)) {
        throw new Error('El DUI solo debe contener números');
      }
      // Formatear para mostrar: 00000000-0
      return limpio;
    }
    
    if (tipo === 'NIT') {
      if (limpio.length !== 14) {
        throw new Error('El NIT debe tener exactamente 14 dígitos (formato: 0000-000000-000-0)');
      }
      if (!/^\d{14}$/.test(limpio)) {
        throw new Error('El NIT solo debe contener números');
      }
      return limpio;
    }
    
    // Para otros tipos, solo limpiar
    return limpio;
  }

  // ============================================================
  // OBTENER TODOS (CON PAGINACIÓN Y FILTROS)
  // ============================================================
  static async findAll(organizacion_id, filters = {}, page = 1, limit = 10) {
    let sql = `
      SELECT p.*, 
             d.nombre_departamento, 
             m.nombre_municipio,
             a.descripcion_giro
      FROM proveedores p
      LEFT JOIN departamentos d ON p.id_departamento = d.id_departamento
      LEFT JOIN municipios m ON p.id_municipio = m.id_municipio AND p.id_departamento = m.id_departamento
      LEFT JOIN actividades_economicas a ON p.codigo_giro = a.codigo_giro
      WHERE p.organizacion_id = ?
    `;
    const params = [organizacion_id];

    // Filtro de estado (activo)
    if (filters.activo === 'true') {
      sql += ' AND p.activo = 1';
    } else if (filters.activo === 'false') {
      sql += ' AND p.activo = 0';
    }
    // Si no se envía activo, mostramos todos (sin filtro de estado)

    // Resto de filtros...
    if (filters.razon_social) {
      sql += ' AND (p.razon_social LIKE ? OR p.nombre_comercial LIKE ?)';
      const like = `%${filters.razon_social}%`;
      params.push(like, like);
    }
    if (filters.nombre_comercial) {
      sql += ' AND p.nombre_comercial LIKE ?';
      params.push(`%${filters.nombre_comercial}%`);
    }
    if (filters.numero_documento) {
      sql += ' AND p.numero_documento LIKE ?';
      params.push(`%${filters.numero_documento}%`);
    }
    if (filters.tipo_documento) {
      sql += ' AND p.tipo_documento = ?';
      params.push(filters.tipo_documento);
    }
    if (filters.codigo_giro) {
      sql += ' AND p.codigo_giro = ?';
      params.push(filters.codigo_giro);
    }
    if (filters.tipo_contribuyente) {
      sql += ' AND p.tipo_contribuyente = ?';
      params.push(filters.tipo_contribuyente);
    }

    sql += ' ORDER BY p.razon_social ASC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(sql, params);

    // Contar total (con los mismos filtros, sin paginación)
    let countSql = `
      SELECT COUNT(*) AS total
      FROM proveedores p
      WHERE p.organizacion_id = ?
    `;
    const countParams = [organizacion_id];
    // Aplicar los mismos filtros (excepto paginación)
    if (filters.activo === 'true') {
      countSql += ' AND p.activo = 1';
    } else if (filters.activo === 'false') {
      countSql += ' AND p.activo = 0';
    }
    if (filters.razon_social) {
      countSql += ' AND (p.razon_social LIKE ? OR p.nombre_comercial LIKE ?)';
      countParams.push(`%${filters.razon_social}%`, `%${filters.razon_social}%`);
    }
    if (filters.nombre_comercial) {
      countSql += ' AND p.nombre_comercial LIKE ?';
      countParams.push(`%${filters.nombre_comercial}%`);
    }
    if (filters.numero_documento) {
      countSql += ' AND p.numero_documento LIKE ?';
      countParams.push(`%${filters.numero_documento}%`);
    }
    if (filters.tipo_documento) {
      countSql += ' AND p.tipo_documento = ?';
      countParams.push(filters.tipo_documento);
    }
    if (filters.codigo_giro) {
      countSql += ' AND p.codigo_giro = ?';
      countParams.push(filters.codigo_giro);
    }
    if (filters.tipo_contribuyente) {
      countSql += ' AND p.tipo_contribuyente = ?';
      countParams.push(filters.tipo_contribuyente);
    }
    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    // Contar activos e inactivos
    const [activosResult] = await pool.query(
      'SELECT COUNT(*) AS total FROM proveedores WHERE organizacion_id = ? AND activo = 1',
      [organizacion_id]
    );
    const [inactivosResult] = await pool.query(
      'SELECT COUNT(*) AS total FROM proveedores WHERE organizacion_id = ? AND activo = 0',
      [organizacion_id]
    );

    return {
      proveedores: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalActivos: activosResult[0]?.total || 0,
      totalInactivos: inactivosResult[0]?.total || 0,
    };
  }

  // ============================================================
  // OBTENER POR ID
  // ============================================================
  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT p.*, 
              d.nombre_departamento, 
              m.nombre_municipio,
              a.descripcion_giro
       FROM proveedores p
       LEFT JOIN departamentos d ON p.id_departamento = d.id_departamento
       LEFT JOIN municipios m ON p.id_municipio = m.id_municipio AND p.id_departamento = m.id_departamento
       LEFT JOIN actividades_economicas a ON p.codigo_giro = a.codigo_giro
       WHERE p.id = ? AND p.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  // ============================================================
  // CREAR PROVEEDOR
  // ============================================================
  static async create(data) {
    const {
      organizacion_id,
      razon_social,
      nombre_comercial,
      tipo_documento,
      numero_documento,
      nrc,
      id_departamento,
      id_municipio,
      direccion_linea,
      telefono,
      email_dte,
      codigo_giro,
      tipo_contribuyente,
    } = data;

    // Sanitizar número de documento según tipo
    const numeroSanitizado = this.sanitizarNumeroDocumento(tipo_documento, numero_documento);

    // Validación cruzada: si es NIT, NRC obligatorio
    if (tipo_documento === 'NIT' && !nrc) {
      throw new Error('El NRC es obligatorio para contribuyentes con NIT');
    }

    const [result] = await pool.query(
      `INSERT INTO proveedores 
       (organizacion_id, razon_social, nombre_comercial, tipo_documento,
        numero_documento, nrc, id_departamento, id_municipio, direccion_linea,
        telefono, email_dte, codigo_giro, tipo_contribuyente, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        organizacion_id,
        razon_social,
        nombre_comercial || null,
        tipo_documento,
        numeroSanitizado,
        nrc || null,
        id_departamento,
        id_municipio,
        direccion_linea || null,
        telefono || null,
        email_dte || null,
        codigo_giro,
        tipo_contribuyente || 'Pequeño',
      ]
    );
    return result.insertId;
  }

  // ============================================================
  // ACTUALIZAR PROVEEDOR
  // ============================================================
  static async update(id, organizacion_id, data) {
    const {
      razon_social,
      nombre_comercial,
      tipo_documento,
      numero_documento,
      nrc,
      id_departamento,
      id_municipio,
      direccion_linea,
      telefono,
      email_dte,
      codigo_giro,
      tipo_contribuyente,
    } = data;

    // Sanitizar número de documento según tipo
    const numeroSanitizado = this.sanitizarNumeroDocumento(tipo_documento, numero_documento);

    // Validación cruzada: si es NIT, NRC obligatorio
    if (tipo_documento === 'NIT' && !nrc) {
      throw new Error('El NRC es obligatorio para contribuyentes con NIT');
    }

    const [result] = await pool.query(
      `UPDATE proveedores SET
        razon_social = ?,
        nombre_comercial = ?,
        tipo_documento = ?,
        numero_documento = ?,
        nrc = ?,
        id_departamento = ?,
        id_municipio = ?,
        direccion_linea = ?,
        telefono = ?,
        email_dte = ?,
        codigo_giro = ?,
        tipo_contribuyente = ?
       WHERE id = ? AND organizacion_id = ?`,
      [
        razon_social,
        nombre_comercial || null,
        tipo_documento,
        numeroSanitizado,
        nrc || null,
        id_departamento,
        id_municipio,
        direccion_linea || null,
        telefono || null,
        email_dte || null,
        codigo_giro,
        tipo_contribuyente || 'Pequeño',
        id,
        organizacion_id,
      ]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // DESACTIVAR PROVEEDOR
  // ============================================================
  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE proveedores SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // REACTIVAR PROVEEDOR
  // ============================================================
  static async reactivar(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE proveedores SET activo = 1 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Proveedor;