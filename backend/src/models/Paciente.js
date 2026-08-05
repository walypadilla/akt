const { pool } = require('../config/db');

class Paciente {
  static async findAll(organizacion_id, filters = {}, page = 1, limit = 10) {
    let sql = `
      SELECT p.*, c.nombre AS cliente_nombre
      FROM pacientes p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (filters.search) {
      sql += ' AND (p.nombre LIKE ? OR p.apellidos LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.dui) {
      sql += ' AND p.dui LIKE ?';
      params.push(`%${filters.dui}%`);
    }
    // Filtro por sexo (genero)
    if (filters.sexo) {
      sql += ' AND p.genero = ?';
      params.push(filters.sexo);
    }
    if (filters.activo === 'true') {
      sql += ' AND p.activo = 1';
    } else if (filters.activo === 'false') {
      sql += ' AND p.activo = 0';
    } else if (!filters.activo || filters.activo === '') {
      sql += ' AND p.activo = 1';
    }

    sql += ' ORDER BY p.nombre ASC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(sql, params);

    // Conteo total con los mismos filtros
    let countSql = 'SELECT COUNT(*) AS total FROM pacientes p WHERE p.organizacion_id = ?';
    const countParams = [organizacion_id];
    if (filters.search) {
      countSql += ' AND (p.nombre LIKE ? OR p.apellidos LIKE ?)';
      countParams.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.dui) {
      countSql += ' AND p.dui LIKE ?';
      countParams.push(`%${filters.dui}%`);
    }
    if (filters.sexo) {
      countSql += ' AND p.genero = ?';
      countParams.push(filters.sexo);
    }
    if (filters.activo === 'true') {
      countSql += ' AND p.activo = 1';
    } else if (filters.activo === 'false') {
      countSql += ' AND p.activo = 0';
    } else if (!filters.activo || filters.activo === '') {
      countSql += ' AND p.activo = 1';
    }

    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return {
      pacientes: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS cliente_nombre, c.telefono, c.telefono_whatsapp
       FROM pacientes p
       JOIN clientes c ON p.cliente_id = c.id
       WHERE p.id = ? AND p.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, cliente_id, nombre, apellidos,
      fecha_nacimiento, genero, especie, raza, color,
      senas_particulares, chip, peso,
      ocupacion, grupo_sanguineo, enfermedades_cronicas, contacto_emergencia,
      tipo_denticion, habitos_bucales, ortodoncia_previa, ultima_visita_dentista,
      sensibilidad_dental, estado_reproductivo, tipo_alimentacion, habitat,
      alergias, antecedentes, codigo_expediente
    } = data;

    const [result] = await pool.query(
      `INSERT INTO pacientes
       (organizacion_id, cliente_id, nombre, apellidos,
        fecha_nacimiento, genero, especie, raza, color,
        senas_particulares, chip, peso,
        ocupacion, grupo_sanguineo, enfermedades_cronicas, contacto_emergencia,
        tipo_denticion, habitos_bucales, ortodoncia_previa, ultima_visita_dentista,
        sensibilidad_dental, estado_reproductivo, tipo_alimentacion, habitat,
        alergias, antecedentes, codigo_expediente)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizacion_id, cliente_id, nombre, apellidos || null,
        fecha_nacimiento || null, genero || null, especie || null, raza || null,
        color || null, senas_particulares || null, chip || null, peso || null,
        ocupacion || null, grupo_sanguineo || null, enfermedades_cronicas || null,
        contacto_emergencia || null, tipo_denticion || null, habitos_bucales || null,
        ortodoncia_previa !== undefined ? (ortodoncia_previa ? 1 : 0) : null,
        ultima_visita_dentista || null, sensibilidad_dental || null,
        estado_reproductivo || null, tipo_alimentacion || null, habitat || null,
        alergias || null, antecedentes || null, codigo_expediente || null
      ]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const fields = [];
    const values = [];

    const allowed = [
      'cliente_id', 'nombre', 'apellidos', 'fecha_nacimiento', 'genero',
      'especie', 'raza', 'color', 'senas_particulares', 'chip', 'peso',
      'ocupacion', 'grupo_sanguineo', 'enfermedades_cronicas', 'contacto_emergencia',
      'tipo_denticion', 'habitos_bucales', 'ortodoncia_previa', 'ultima_visita_dentista',
      'sensibilidad_dental', 'estado_reproductivo', 'tipo_alimentacion', 'habitat',
      'alergias', 'antecedentes', 'codigo_expediente'
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return false;

    values.push(id, organizacion_id);
    const [result] = await pool.query(
      `UPDATE pacientes SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE pacientes SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async reactivar(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE pacientes SET activo = 1 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

}

module.exports = Paciente;