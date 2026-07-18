const {pool} = require('../config/db');

class Factura {
    // --- Métodos existentes ---
    static async create(data) { /* igual que antes */ }
    static async findByOrganizacion(organizacion_id) { /* igual */ }
    static async findByIdAndOrganizacion(id, organizacion_id) { /* igual */ }
    static async update(id, organizacion_id, data) { /* igual */ }
    static async softDelete(id, organizacion_id) { /* igual */ }
    static async getForReport(organizacion_id, mes, anio, tipo_documento = null) { /* igual */ }

    // --- Nuevos métodos ---
    static async findLatestByOrganizacion(organizacion_id, limit = 14) {
        const [rows] = await pool.query(
            `SELECT f.*, c.nombre AS cliente_nombre, c.nit, c.telefono
             FROM facturas f
             JOIN clientes c ON f.cliente_id = c.id
             WHERE f.organizacion_id = ? AND f.eliminado_en IS NULL
             ORDER BY f.creado_en DESC
             LIMIT ?`,
            [organizacion_id, limit]
        );
        return rows;
    }

    static async searchByFilters(organizacion_id, filters) {
        let sql = `
            SELECT f.*, c.nombre AS cliente_nombre, c.nit, c.telefono
            FROM facturas f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE f.organizacion_id = ? AND f.eliminado_en IS NULL
        `;
        const params = [organizacion_id];
        if (filters.cliente_id) {
            sql += ' AND f.cliente_id = ?';
            params.push(filters.cliente_id);
        }
        if (filters.monto_min) {
            sql += ' AND f.total_pagar >= ?';
            params.push(filters.monto_min);
        }
        if (filters.monto_max) {
            sql += ' AND f.total_pagar <= ?';
            params.push(filters.monto_max);
        }
        if (filters.mes) {
            sql += ' AND MONTH(f.creado_en) = ?';
            params.push(filters.mes);
        }
        if (filters.anio) {
            sql += ' AND YEAR(f.creado_en) = ?';
            params.push(filters.anio);
        }
        if (filters.estado) {
            sql += ' AND f.estado = ?';
            params.push(filters.estado);
        }
        if (filters.tipo_documento) {
            sql += ' AND f.tipo_documento = ?';
            params.push(filters.tipo_documento);
        }
        sql += ' ORDER BY f.creado_en DESC';
        const [rows] = await pool.query(sql, params);
        return rows;
    }
    static async findByIdAndOrganizacion(id, organizacion_id) {
        const [rows] = await pool.query(
        `SELECT f.*, c.nombre AS cliente_nombre, c.nit, c.nrc, c.giro, c.tipo_contribuyente
        FROM facturas f
        JOIN clientes c ON f.cliente_id = c.id
        WHERE f.id = ? AND f.organizacion_id = ? AND f.eliminado_en IS NULL`,
        [id, organizacion_id]
        ) ;
        return rows[0];
    }
}

module.exports = Factura;