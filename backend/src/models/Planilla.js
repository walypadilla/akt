// backend/src/models/Planilla.js
const { pool } = require('../config/db');

class Planilla {

  static async findByOrganizacion(organizacion_id, mes, anio, estado, page = 1, limit = 10, empleado_id = null) {
    let sql = `
      SELECT p.*, e.nombre AS empleado_nombre, e.apellidos, e.salario_base
      FROM planillas p
      JOIN empleados_nomina e ON p.empleado_id = e.id
      WHERE p.organizacion_id = ?
    `;
    const params = [organizacion_id];
    if (mes) {
      sql += ' AND p.mes = ?';
      params.push(mes);
    }
    if (anio) {
      sql += ' AND p.anio = ?';
      params.push(anio);
    }
    if (estado) {
      sql += ' AND p.estado = ?';
      params.push(estado);
    }
    if (empleado_id) {
      sql += ' AND p.empleado_id = ?';
      params.push(empleado_id);
    }
    sql += ' ORDER BY p.anio DESC, p.mes DESC, e.nombre ASC';

    // Paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(sql, params);

    // Contar total
    let countSql = `
      SELECT COUNT(*) AS total
      FROM planillas p
      JOIN empleados_nomina e ON p.empleado_id = e.id
      WHERE p.organizacion_id = ?
    `;
    const countParams = [organizacion_id];
    if (mes) {
      countSql += ' AND p.mes = ?';
      countParams.push(mes);
    }
    if (anio) {
      countSql += ' AND p.anio = ?';
      countParams.push(anio);
    }
    if (estado) {
      countSql += ' AND p.estado = ?';
      countParams.push(estado);
    }
    if (empleado_id) {
      countSql += ' AND p.empleado_id = ?';
      countParams.push(empleado_id);
    }
    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return {
      planillas: rows,
      paginacion: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT p.*, e.nombre AS empleado_nombre, e.apellidos, e.salario_base
       FROM planillas p
       JOIN empleados_nomina e ON p.empleado_id = e.id
       WHERE p.id = ? AND p.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data, connection = null) {
    const db = connection || pool;
    const {
      organizacion_id, empleado_id, periodo_id, mes, anio, tipo_periodo,
      dias_trabajados, dias_ausencia, incapacidad_dias,
      horas_extras_monto, nocturnidad_monto,
      descuento_isss, descuento_afp, descuento_renta,
      isss_patronal, afp_patronal,
      salario_neto_pagar, estado = 'Borrador', pagado_en = null
    } = data;
    const [result] = await db.query(
      `INSERT INTO planillas 
       (organizacion_id, empleado_id, periodo_id, mes, anio, tipo_periodo,
        dias_trabajados, dias_ausencia, incapacidad_dias,
        horas_extras_monto, nocturnidad_monto,
        descuento_isss, descuento_afp, descuento_renta,
        isss_patronal, afp_patronal,
        salario_neto_pagar, estado, pagado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizacion_id, empleado_id, periodo_id, mes, anio, tipo_periodo,
        dias_trabajados, dias_ausencia, incapacidad_dias,
        horas_extras_monto, nocturnidad_monto,
        descuento_isss, descuento_afp, descuento_renta,
        isss_patronal, afp_patronal,
        salario_neto_pagar, estado, pagado_en
      ]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const { estado, pagado_en } = data;
    const [result] = await pool.query(
      `UPDATE planillas SET estado = ?, pagado_en = ? WHERE id = ? AND organizacion_id = ?`,
      [estado, pagado_en, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE planillas SET estado = ? WHERE id = ? AND organizacion_id = ? AND estado != ?',
      ['Anulada', id, organizacion_id, 'Pagada']
    );
    return result.affectedRows > 0;
  }

  static async existePlanilla(empleado_id, periodo_id) {
    const [rows] = await pool.query(
      'SELECT id FROM planillas WHERE empleado_id = ? AND periodo_id = ?',
      [empleado_id, periodo_id]
    );
    return rows.length > 0;
  }

  static async getAniosDisponibles(organizacion_id) {
    const [rows] = await pool.query(
      'SELECT DISTINCT anio FROM planillas WHERE organizacion_id = ? ORDER BY anio DESC',
      [organizacion_id]
    );
    return rows.map(r => r.anio);
  }

  static async getCountByEmpleadoMes(empleado_id, mes, anio) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as total FROM planillas WHERE empleado_id = ? AND mes = ? AND anio = ? AND tipo_periodo NOT IN ('Aguinaldo', 'Vacaciones')`,
      [empleado_id, mes, anio]
    );
    return rows[0].total;
  }

}
module.exports = Planilla;