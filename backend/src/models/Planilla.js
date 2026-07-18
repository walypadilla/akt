const {pool} = require('../config/db');

class Planilla {

    // crear empleado
    static async create(data) {
        const {
            organizacion_id, empleado_id, mes, anio, dias_trabajados,
            horas_extras_monto, nocturnidad_monto, descuento_isss,
            descuento_afp, descuento_renta, salario_neto_pagar,
            estado = 'Pendiente'
        } = data;
        const [result] = await pool.query(
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

    // buscar empleado por organizacion
    static async findByOrganizacion(organizacion_id) {
        const [rows] = await pool.query(
            `SELECT p.*, e.nombre AS empleado_nombre
             FROM planillas_mensuales p
             JOIN empleados_nomina e ON p.empleado_id = e.id
             WHERE p.organizacion_id = ?
             ORDER BY p.anio DESC, p.mes DESC`,
            [organizacion_id]
        );
        return rows;
    }

    //buscar empleado por ID
    static async findEmpleadoById(id, organizacion_id) {
        const [rows] = await pool.query(
            `SELECT * FROM empleados_nomina 
             WHERE id = ? AND organizacion_id = ?`,
            [id, organizacion_id]
        );
        return rows[0];
    }
}

module.exports = Planilla;