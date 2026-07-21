// backend/src/models/Planilla.js
const { pool } = require('../config/db');

class Planilla {
  static async create(data, connection = null) {
    const db = connection || pool;
    const {
      organizacion_id, empleado_id, mes, anio, dias_trabajados,
      horas_extras_monto, nocturnidad_monto, descuento_isss,
      descuento_afp, descuento_renta, salario_neto_pagar,
      estado = 'Pendiente'
    } = data;
    const [result] = await db.query(
      `INSERT INTO planillas_mensuales 
       (organizacion_id, empleado_id, mes, anio, dias_trabajados,
        horas_extras_monto, nocturnidad_monto, descuento_isss,
        descuento_afp, descuento_renta, salario_neto_pagar, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, empleado_id, mes, anio, dias_trabajados,
       horas_extras_monto, nocturnidad_monto, descuento_isss,
       descuento_afp, descuento_renta, salario_neto_pagar, estado]
    );
    return result.insertId;
  }

  static async findByOrganizacion(organizacion_id, filters = {}) {
    let sql = `
      SELECT p.*, e.nombre AS empleado_nombre
      FROM planillas_mensuales p
      JOIN empleados_nomina e ON p.empleado_id = e.id
      WHERE p.organizacion_id = ?
    `;
    const params = [organizacion_id];
    if (filters.mes) {
      sql += ' AND p.mes = ?';
      params.push(filters.mes);
    }
    if (filters.anio) {
      sql += ' AND p.anio = ?';
      params.push(filters.anio);
    }
    if (filters.estado) {
      sql += ' AND p.estado = ?';
      params.push(filters.estado);
    }
    sql += ' ORDER BY p.anio DESC, p.mes DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findEmpleadoById(id, organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM empleados_nomina WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async getTotales(organizacion_id, mes, anio) {
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) AS total_empleados,
        SUM(salario_neto_pagar) AS total_neto,
        SUM(descuento_isss) AS total_isss,
        SUM(descuento_afp) AS total_afp,
        SUM(descuento_renta) AS total_renta
       FROM planillas_mensuales
       WHERE organizacion_id = ? AND mes = ? AND anio = ?`,
      [organizacion_id, mes, anio]
    );
    return rows[0];
  }
}

module.exports = Planilla;