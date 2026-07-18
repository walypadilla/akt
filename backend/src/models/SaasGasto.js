const {pool} = require('../config/db');

class SaasGasto {
    // crear un nuevo gasto
    static async create(data) {
        const { proveedor, monto, descripcion, fecha_gasto } = data;
        const [result] = await pool.query(
            `INSERT INTO saas_gastos_infraestructura 
             (proveedor, monto, descripcion, fecha_gasto)
             VALUES (?, ?, ?, ?)`,
            [proveedor, monto, descripcion, fecha_gasto]
        );
        return result.insertId;
    }

    // obtener un total de gasto por mes
    static async getTotalByMonth(anio, mes) {
        const [rows] = await pool.query(
            `SELECT SUM(monto) AS total FROM saas_gastos_infraestructura
             WHERE YEAR(fecha_gasto) = ? AND MONTH(fecha_gasto) = ?`,
            [anio, mes]
        );
        return rows[0].total || 0;
    }

    // obtener total por año
    static async getGroupedByMonth(anio) {
        const [rows] = await pool.query(
            `SELECT YEAR(fecha_gasto) AS anio, MONTH(fecha_gasto) AS mes, 
                    SUM(monto) AS total_gastos
             FROM saas_gastos_infraestructura
             WHERE YEAR(fecha_gasto) = ?
             GROUP BY YEAR(fecha_gasto), MONTH(fecha_gasto)
             ORDER BY anio DESC, mes DESC`,
            [anio]
        );
        return rows;
    }
}

module.exports = SaasGasto;