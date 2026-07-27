const { pool } = require('../config/db');

class Aguinaldo {
  static async create(data) {
    const { organizacion_id, empleado_id, anio, monto, estado = 'Emitido' } = data;
    const [result] = await pool.query(
      `INSERT INTO aguinaldos (organizacion_id, empleado_id, anio, monto, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [organizacion_id, empleado_id, anio, monto, estado]
    );
    return result.insertId;
  }

  static async findByOrganizacion(organizacion_id, anio = null, estado = null) {
    let sql = `SELECT a.*, e.nombre AS empleado_nombre, e.apellidos, e.salario_base, e.fecha_ingreso
               FROM aguinaldos a
               JOIN empleados_nomina e ON a.empleado_id = e.id
               WHERE a.organizacion_id = ?`;
    const params = [organizacion_id];
    if (anio) {
      sql += ' AND a.anio = ?';
      params.push(anio);
    }
    if (estado) {
      sql += ' AND a.estado = ?';
      params.push(estado);
    }
    sql += ' ORDER BY e.nombre ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT a.*, e.nombre AS empleado_nombre, e.apellidos, e.salario_base
       FROM aguinaldos a
       JOIN empleados_nomina e ON a.empleado_id = e.id
       WHERE a.id = ? AND a.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async updateEstado(id, organizacion_id, estado) {
    const [result] = await pool.query(
      'UPDATE aguinaldos SET estado = ? WHERE id = ? AND organizacion_id = ?',
      [estado, id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async updateEstadoMultiple(ids, organizacion_id, estado) {
    if (!ids || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    let sql = `UPDATE aguinaldos SET estado = ?`;
    const params = [estado];
    if (estado === 'Pagado') {
      sql += `, fecha_pago = NOW()`;
    }
    sql += ` WHERE id IN (${placeholders}) AND organizacion_id = ? AND estado != 'Pagado'`;
    params.push(...ids, organizacion_id);
    const [result] = await pool.query(sql, params);
    return result.affectedRows;
  }

  static async deleteByOrganizacion(organizacion_id, anio = null) {
    let sql = 'DELETE FROM aguinaldos WHERE organizacion_id = ?';
    const params = [organizacion_id];
    if (anio) {
      sql += ' AND anio = ?';
      params.push(anio);
    }
    const [result] = await pool.query(sql, params);
    return result.affectedRows;
  }
}

module.exports = Aguinaldo;