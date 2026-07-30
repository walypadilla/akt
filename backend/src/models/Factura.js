// backend/src/models/Factura.js
const { pool } = require('../config/db');

class Factura {
    static async findAll(organizacion_id, filters = {}, page = 1, limit = 10) {
        let sql = `
            SELECT f.*,
                c.nombre AS cliente_nombre,
                c.nit AS cliente_nit,
                c.dui AS cliente_dui,
                c.nrc AS cliente_nrc,
                c.giro AS cliente_giro,
                c.direccion AS cliente_direccion,
                c.telefono AS cliente_telefono,
                u.nombre AS usuario_nombre
            FROM facturas f
            LEFT JOIN clientes c ON f.cliente_id = c.id
            LEFT JOIN usuarios u ON f.usuario_id = u.id
            WHERE f.organizacion_id = ?
            AND f.eliminado_en IS NULL
        `;
        const params = [organizacion_id];

        if (filters.search) {
            sql += ` AND (f.numero_correlativo LIKE ? OR c.nombre LIKE ? OR c.nit LIKE ?)`;
            const searchParam = `%${filters.search}%`;
            params.push(searchParam, searchParam, searchParam);
        }
        if (filters.mes) {
            sql += ' AND MONTH(f.creado_en) = ?';
            params.push(parseInt(filters.mes));
        }
        if (filters.anio) {
            sql += ' AND YEAR(f.creado_en) = ?';
            params.push(parseInt(filters.anio));
        }
        if (filters.cliente_id) {
            sql += ' AND f.cliente_id = ?';
            params.push(parseInt(filters.cliente_id));
        }
        if (filters.estado) {
            sql += ' AND f.estado = ?';
            params.push(filters.estado);
        }
        if (filters.tipo_documento) {
            sql += ' AND f.tipo_documento = ?';
            params.push(filters.tipo_documento);
        }
        if (filters.condicion_operacion) {
            sql += ' AND f.condicion_operacion = ?';
            params.push(filters.condicion_operacion);
        }
        if (filters.solo_con_vencimiento) {
            sql += ' AND f.fecha_vencimiento IS NOT NULL';
        }
        if (filters.solo_pendientes) {
            sql += ' AND f.estado IN ("Emitida") AND f.condicion_operacion = "Credito" AND f.fecha_vencimiento IS NOT NULL';
        }

        sql += ' ORDER BY f.creado_en DESC, f.id DESC';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [rows] = await pool.query(sql, params);

        // Contar total (con los mismos filtros)
        let countSql = `
            SELECT COUNT(*) AS total
            FROM facturas f
            LEFT JOIN clientes c ON f.cliente_id = c.id
            LEFT JOIN usuarios u ON f.usuario_id = u.id
            WHERE f.organizacion_id = ?
            AND f.eliminado_en IS NULL
        `;
        const countParams = [organizacion_id];

        if (filters.search) {
            countSql += ` AND (f.numero_correlativo LIKE ? OR c.nombre LIKE ? OR c.nit LIKE ?)`;
            countParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.mes) {
            countSql += ' AND MONTH(f.creado_en) = ?';
            countParams.push(parseInt(filters.mes));
        }
        if (filters.anio) {
            countSql += ' AND YEAR(f.creado_en) = ?';
            countParams.push(parseInt(filters.anio));
        }
        if (filters.cliente_id) {
            countSql += ' AND f.cliente_id = ?';
            countParams.push(parseInt(filters.cliente_id));
        }
        if (filters.estado) {
            countSql += ' AND f.estado = ?';
            countParams.push(filters.estado);
        }
        if (filters.tipo_documento) {
            countSql += ' AND f.tipo_documento = ?';
            countParams.push(filters.tipo_documento);
        }
        if (filters.condicion_operacion) {
            countSql += ' AND f.condicion_operacion = ?';
            countParams.push(filters.condicion_operacion);
        }
        if (filters.solo_con_vencimiento) {
            countSql += ' AND f.fecha_vencimiento IS NOT NULL';
        }
        if (filters.solo_pendientes) {
            countSql += ' AND f.estado IN ("Emitida") AND f.condicion_operacion = "Credito" AND f.fecha_vencimiento IS NOT NULL';
        }

        const [countResult] = await pool.query(countSql, countParams);
        const total = countResult[0]?.total || 0;

        return {
            facturas: rows,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
        };
    }

    static async findByIdAndOrganizacion(id, organizacion_id) {
        const [rows] = await pool.query(
            `SELECT f.*,
                    c.nombre AS cliente_nombre,
                    c.nit AS cliente_nit,
                    c.dui AS cliente_dui,
                    c.nrc AS cliente_nrc,
                    c.giro AS cliente_giro,
                    c.direccion AS cliente_direccion,
                    c.telefono AS cliente_telefono,
                    u.nombre AS usuario_nombre
             FROM facturas f
             LEFT JOIN clientes c ON f.cliente_id = c.id
             LEFT JOIN usuarios u ON f.usuario_id = u.id
             WHERE f.id = ? AND f.organizacion_id = ? AND f.eliminado_en IS NULL`,
            [id, organizacion_id]
        );
        return rows[0];
    }

    static async create(data, connection = null) {
        const db = connection || pool;
        const {
            organizacion_id,
            bodega_id,
            usuario_id,
            cliente_id,
            tipo_documento,
            numero_correlativo,
            subtotal_sumas,
            descuento,
            iva_13,
            iva_0,
            iva_no_sujeto,
            retencion_1,
            percepcion_1,
            intereses_mora,
            total_pagar,
            estado = 'Emitida',
            condicion_operacion,
            plazo_credito,
            fecha_vencimiento,
            medio_pago,
            observaciones,
            uuid_dte,
            numero_control,
            cliente_nit,
            cliente_dui,
            cliente_nombre,
        } = data;

        const [result] = await db.query(
            `INSERT INTO facturas (
                organizacion_id, bodega_id, usuario_id, cliente_id,
                tipo_documento, numero_correlativo,
                subtotal_sumas, descuento, iva_13, iva_0, iva_no_sujeto,
                retencion_1, percepcion_1, intereses_mora, total_pagar,
                estado, condicion_operacion, plazo_credito, fecha_vencimiento,
                medio_pago, observaciones, uuid_dte, numero_control,
                cliente_nit, cliente_dui, cliente_nombre
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                organizacion_id,
                bodega_id || null,
                usuario_id,
                cliente_id,
                tipo_documento || 'FAF',
                numero_correlativo,
                subtotal_sumas || 0,
                descuento || 0,
                iva_13 || 0,
                iva_0 || 0,
                iva_no_sujeto || 0,
                retencion_1 || 0,
                percepcion_1 || 0,
                intereses_mora || 0,
                total_pagar || 0,
                estado,
                condicion_operacion || 'Contado',
                plazo_credito || null,
                fecha_vencimiento || null,
                medio_pago ? JSON.stringify(medio_pago) : null,
                observaciones || null,
                uuid_dte || null,
                numero_control || null,
                cliente_nit || null,
                cliente_dui || null,
                cliente_nombre || null,
            ]
        );
        return result.insertId;
    }

    static async update(id, organizacion_id, data) {
        const fields = [];
        const values = [];

        const allowed = [
            'cliente_id', 'tipo_documento', 'numero_correlativo',
            'subtotal_sumas', 'descuento', 'iva_13', 'iva_0', 'iva_no_sujeto',
            'retencion_1', 'percepcion_1', 'intereses_mora', 'total_pagar',
            'estado', 'condicion_operacion', 'plazo_credito', 'fecha_vencimiento',
            'medio_pago', 'observaciones', 'uuid_dte', 'numero_control',
            'cliente_nit', 'cliente_dui', 'cliente_nombre'
        ];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                if (key === 'medio_pago' && data[key] !== null) {
                    values.push(JSON.stringify(data[key]));
                } else {
                    values.push(data[key]);
                }
            }
        }

        if (fields.length === 0) return false;

        values.push(id, organizacion_id);
        const query = `UPDATE facturas SET ${fields.join(', ')} WHERE id = ? AND organizacion_id = ? AND eliminado_en IS NULL`;
        const [result] = await pool.query(query, values);
        return result.affectedRows > 0;
    }

    static async softDelete(id, organizacion_id) {
        const [result] = await pool.query(
            'UPDATE facturas SET estado = "Anulada", eliminado_en = NOW() WHERE id = ? AND organizacion_id = ? AND estado != "Anulada"',
            [id, organizacion_id]
        );
        return result.affectedRows > 0;
    }

     static async changeStatus(id, organizacion_id, estado) {
        const [result] = await pool.query(
            'UPDATE facturas SET estado = ? WHERE id = ? AND organizacion_id = ? AND eliminado_en IS NULL',
            [estado, id, organizacion_id]
        );
        return result.affectedRows > 0;
    }

    static async getKPIs(organizacion_id, mes, anio) {
        const [ventas] = await pool.query(
            `SELECT COALESCE(SUM(total_pagar), 0) AS total
             FROM facturas
             WHERE organizacion_id = ? AND estado IN ('Emitida','Pagada')
               AND MONTH(creado_en) = ? AND YEAR(creado_en) = ?`,
            [organizacion_id, mes, anio]
        );
        const [cuentas] = await pool.query(
            `SELECT COALESCE(SUM(total_pagar), 0) AS total
             FROM facturas
             WHERE organizacion_id = ? AND estado = 'Emitida' AND condicion_operacion = 'Credito'
               AND fecha_vencimiento IS NOT NULL`,
            [organizacion_id]
        );
        const [iva] = await pool.query(
            `SELECT COALESCE(SUM(iva_13), 0) AS total
             FROM facturas
             WHERE organizacion_id = ? AND estado IN ('Emitida','Pagada')
               AND MONTH(creado_en) = ? AND YEAR(creado_en) = ?`,
            [organizacion_id, mes, anio]
        );
        const [ventasMes] = await pool.query(
            `SELECT COALESCE(SUM(total_pagar), 0) AS total
             FROM facturas
             WHERE organizacion_id = ? AND estado IN ('Emitida','Pagada')
               AND MONTH(creado_en) = ? AND YEAR(creado_en) = ?`,
            [organizacion_id, mes, anio]
        );

        return {
            total_ventas: parseFloat(ventas[0]?.total) || 0,
            cuentas_por_cobrar: parseFloat(cuentas[0]?.total) || 0,
            iva_recaudado: parseFloat(iva[0]?.total) || 0,
            ventas_mes: parseFloat(ventasMes[0]?.total) || 0,
        };
    }

    static async getEvolucionVentas(organizacion_id, anio) {
        const [rows] = await pool.query(
            `SELECT
               MONTH(creado_en) AS mes,
               COALESCE(SUM(CASE WHEN estado IN ('Emitida','Pagada') AND condicion_operacion = 'Contado' THEN total_pagar ELSE 0 END), 0) AS ventas_contado,
               COALESCE(SUM(CASE WHEN estado IN ('Emitida','Pagada') AND condicion_operacion = 'Credito' THEN total_pagar ELSE 0 END), 0) AS ventas_credito,
               COALESCE(SUM(CASE WHEN estado = 'Pagada' THEN total_pagar ELSE 0 END), 0) AS ventas_pagadas,
               COALESCE(SUM(CASE WHEN estado IN ('Emitida','Pagada') THEN total_pagar ELSE 0 END), 0) AS total_ventas
             FROM facturas
             WHERE organizacion_id = ? AND estado != 'Anulada'
               AND YEAR(creado_en) = ?
             GROUP BY MONTH(creado_en)
             ORDER BY mes ASC`,
            [organizacion_id, anio]
        );

        const meses = Array.from({ length: 12 }, (_, i) => ({
            mes: i + 1,
            ventas_contado: 0,
            ventas_credito: 0,
            ventas_pagadas: 0,
            total_ventas: 0,
        }));
        for (const row of rows) {
            const idx = meses.findIndex(m => m.mes === row.mes);
            if (idx !== -1) {
                meses[idx].ventas_contado = parseFloat(row.ventas_contado);
                meses[idx].ventas_credito = parseFloat(row.ventas_credito);
                meses[idx].ventas_pagadas = parseFloat(row.ventas_pagadas);
                meses[idx].total_ventas = parseFloat(row.total_ventas);
            }
        }
        return meses;
    }

    static async getComparacionPagos(organizacion_id, anio) {
        const [rows] = await pool.query(
            `SELECT
               MONTH(creado_en) AS mes,
               COALESCE(SUM(CASE WHEN estado = 'Pagada' THEN total_pagar ELSE 0 END), 0) AS pagadas,
               COALESCE(SUM(CASE WHEN estado = 'Emitida' AND condicion_operacion = 'Credito' THEN total_pagar ELSE 0 END), 0) AS pendientes
             FROM facturas
             WHERE organizacion_id = ? AND estado != 'Anulada'
               AND YEAR(creado_en) = ?
             GROUP BY MONTH(creado_en)
             ORDER BY mes ASC`,
            [organizacion_id, anio]
        );

        const meses = Array.from({ length: 12 }, (_, i) => ({
            mes: i + 1,
            pagadas: 0,
            pendientes: 0,
        }));
        for (const row of rows) {
            const idx = meses.findIndex(m => m.mes === row.mes);
            if (idx !== -1) {
                meses[idx].pagadas = parseFloat(row.pagadas);
                meses[idx].pendientes = parseFloat(row.pendientes);
            }
        }
        return meses;
    }

    static async getAlertasVencimiento(organizacion_id) {
        const [rows] = await pool.query(
            `SELECT f.id, f.numero_correlativo, f.total_pagar, f.fecha_vencimiento,
                    c.nombre AS cliente_nombre
             FROM facturas f
             LEFT JOIN clientes c ON f.cliente_id = c.id
             WHERE f.organizacion_id = ?
               AND f.estado = 'Emitida'
               AND f.condicion_operacion = 'Credito'
               AND f.fecha_vencimiento IS NOT NULL
               AND f.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
             ORDER BY f.fecha_vencimiento ASC
             LIMIT 20`,
            [organizacion_id]
        );
        return rows;
    }

    static async getTopClientes(organizacion_id, anio) {
        const [rows] = await pool.query(
            `SELECT
               c.id AS cliente_id,
               c.nombre AS cliente_nombre,
               c.nit AS cliente_nit,
               COALESCE(SUM(f.total_pagar), 0) AS total_compras
             FROM clientes c
             JOIN facturas f ON c.id = f.cliente_id
             WHERE f.organizacion_id = ?
               AND f.estado IN ('Emitida','Pagada')
               AND YEAR(f.creado_en) = ?
             GROUP BY c.id, c.nombre, c.nit
             ORDER BY total_compras DESC
             LIMIT 5`,
            [organizacion_id, anio]
        );
        return rows;
    }

    static async getDistribucionTipoDocumento(organizacion_id, mes, anio) {
        const [rows] = await pool.query(
            `SELECT
               tipo_documento,
               COALESCE(SUM(total_pagar), 0) AS total
             FROM facturas
             WHERE organizacion_id = ? AND estado IN ('Emitida','Pagada')
               AND MONTH(creado_en) = ? AND YEAR(creado_en) = ?
             GROUP BY tipo_documento`,
            [organizacion_id, mes, anio]
        );
        return rows;
    }

    // Nuevo método para exportar todas las facturas de un año
    static async findAllForExport(organizacion_id, anio, mes = null) {
        let sql = `
            SELECT f.*,
                c.nombre AS cliente_nombre,
                c.nit AS cliente_nit,
                c.dui AS cliente_dui
            FROM facturas f
            LEFT JOIN clientes c ON f.cliente_id = c.id
            WHERE f.organizacion_id = ?
            AND f.eliminado_en IS NULL
            AND YEAR(f.creado_en) = ?
        `;
        const params = [organizacion_id, anio];
        if (mes) {
            sql += ' AND MONTH(f.creado_en) = ?';
            params.push(mes);
        }
        sql += ' ORDER BY f.creado_en DESC';
        const [rows] = await pool.query(sql, params);
        return rows;
    }
}

module.exports = Factura;