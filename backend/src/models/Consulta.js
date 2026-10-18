const { pool } = require('../config/db');

class Consulta {
  static async generarSKU(organizacion_id, connection = null) {
    const conn = connection || pool;
    const [count] = await conn.query(
      'SELECT COUNT(*) AS total FROM consultas WHERE organizacion_id = ?',
      [organizacion_id]
    );
    const fecha = new Date();
    const yyyymmdd = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
    const correlativo = String(count[0].total + 1).padStart(4, '0');
    return `CONS-${yyyymmdd}-${correlativo}`;
  }

  static async findAll(organizacion_id, filters = {}, page = 1, limit = 10) {
    let sql = `
      SELECT 
        c.*,
        p.nombre AS paciente_nombre,
        p.apellidos AS paciente_apellidos,
        u.nombre AS medico_nombre,
        f.numero_correlativo AS factura_numero,
        f.estado AS factura_estado,
        f.total_pagar AS factura_total
      FROM consultas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN medicos m ON c.medico_id = m.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      LEFT JOIN facturas f ON c.factura_id = f.id AND f.organizacion_id = c.organizacion_id
      WHERE c.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (filters.paciente_id) {
      sql += ' AND c.paciente_id = ?';
      params.push(filters.paciente_id);
    }
    if (filters.medico_id) {
      sql += ' AND c.medico_id = ?';
      params.push(filters.medico_id);
    }
    // Búsqueda por paciente o por SKU
    if (filters.search) {
      sql += ' AND (p.nombre LIKE ? OR p.apellidos LIKE ? OR c.codigo_sku LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    // Filtro por año/mes
    if (filters.anio) {
      sql += ' AND YEAR(c.fecha_consulta) = ?';
      params.push(parseInt(filters.anio));
    }
    if (filters.mes) {
      sql += ' AND MONTH(c.fecha_consulta) = ?';
      params.push(parseInt(filters.mes));
    }
    if (filters.fecha_inicio && filters.fecha_fin) {
      sql += ' AND DATE(c.fecha_consulta) BETWEEN ? AND ?';
      params.push(filters.fecha_inicio, filters.fecha_fin);
    }

    sql += ' ORDER BY c.fecha_consulta DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT c.*, p.nombre AS paciente_nombre, p.apellidos AS paciente_apellidos, p.cliente_id
      FROM consultas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ? AND c.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const codigo_sku = await this.generarSKU(data.organizacion_id);

    const {
      organizacion_id, cita_id, paciente_id, medico_id, fecha_consulta,
      subjetivo, objetivo, analisis, plan,
      presion_arterial, frecuencia_cardiaca, temperatura,
      peso, talla, imc,
      diagnostico_codigo, diagnostico_texto, receta,
      vacunas_aplicadas,
    } = data;

    const [result] = await pool.query(
      `INSERT INTO consultas (
        codigo_sku, organizacion_id, cita_id, paciente_id, medico_id, fecha_consulta,
        subjetivo, objetivo, analisis, plan,
        presion_arterial, frecuencia_cardiaca, temperatura,
        peso, talla, imc,
        diagnostico_codigo, diagnostico_texto, receta,
        vacunas_aplicadas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo_sku,
        organizacion_id,
        cita_id || null,
        paciente_id,
        medico_id,
        fecha_consulta,
        subjetivo || null, objetivo || null, analisis || null, plan || null,
        presion_arterial || null, frecuencia_cardiaca || null, temperatura || null,
        peso || null, talla || null, imc || null,
        diagnostico_codigo || null, diagnostico_texto || null, receta || null,
        vacunas_aplicadas ? JSON.stringify(vacunas_aplicadas) : null,
      ]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const fields = [];
    const values = [];

    // Campos numéricos que deben convertirse a NULL si vienen vacíos
    const camposNumericos = [
      'frecuencia_cardiaca',
      'temperatura',
      'peso',
      'talla',
      'imc',
    ];

    const camposTexto = [
      'paciente_id', 'medico_id', 'cita_id',
      'fecha_consulta',
      'subjetivo', 'objetivo', 'analisis', 'plan',
      'presion_arterial',
      'diagnostico_codigo', 'diagnostico_texto',
      'receta',
    ];

    // Procesar campos de texto
    for (const key of camposTexto) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        // Convertir string vacío a null
        values.push(data[key] === '' ? null : data[key]);
      }
    }

    // Procesar campos numéricos (convertir '' a null)
    for (const key of camposNumericos) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        const val = data[key];
        values.push(
          val === '' || val === null || val === undefined || isNaN(parseFloat(val))
            ? null
            : parseFloat(val)
        );
      }
    }

    // Campo JSON vacunas_aplicadas
    if (data.vacunas_aplicadas !== undefined) {
      fields.push('vacunas_aplicadas = ?');
      values.push(
        Array.isArray(data.vacunas_aplicadas) && data.vacunas_aplicadas.length > 0
          ? JSON.stringify(data.vacunas_aplicadas)
          : null
      );
    }

    if (fields.length === 0) return 0;

    values.push(id, organizacion_id);
    const [result] = await pool.query(
      `UPDATE consultas SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      values
    );
    return result.affectedRows;
  }

  // Años disponibles de consultas
  static async getAniosDisponibles(organizacion_id) {
    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(fecha_consulta) AS anio
      FROM consultas
      WHERE organizacion_id = ? AND fecha_consulta IS NOT NULL
      ORDER BY anio DESC`,
      [organizacion_id]
    );
    const anios = rows.map((r) => r.anio);
    return anios.length ? anios : [new Date().getFullYear()];
  }

}

module.exports = Consulta;