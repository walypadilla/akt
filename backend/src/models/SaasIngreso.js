const {pool} = require('../config/db');

class SaasIngreso {
    // crear un ingreso de membresia
    static async create(data) {
        const { organizacion_id, monto, mes_pagado, anio_pagado } = data;
        const [result] = await pool.query(
            `INSERT INTO saas_ingresos_membresias 
             (organizacion_id, monto, mes_pagado, anio_pagado)
             VALUES (?, ?, ?, ?)`,
            [organizacion_id, monto, mes_pagado, anio_pagado]
        );
        return result.insertId;
    }

    // obtener total mensual
    static async getTotalByMonth(anio, mes) {
        const [rows] = await pool.query(
            `SELECT SUM(monto) AS total FROM saas_ingresos_membresias
             WHERE anio_pagado = ? AND mes_pagado = ?`,
            [anio, mes]
        );
        return rows[0].total || 0;
    }

    // agrupar por mes
    static async getGroupedByMonth(anio) {
        const [rows] = await pool.query(
            `SELECT anio_pagado, mes_pagado, SUM(monto) AS total_ingresos
             FROM saas_ingresos_membresias
             WHERE anio_pagado = ?
             GROUP BY anio_pagado, mes_pagado
             ORDER BY anio_pagado DESC, mes_pagado DESC`,
            [anio]
        );
        return rows;
    }
}

module.exports = SaasIngreso;