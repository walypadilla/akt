const Factura = require('../models/Factura');
const { pool } = require('../config/db');

// obtener cuentas por cobrar
exports.obtenerCuentasCobrar = async (req, res) => {
    try {
        const { organizacion_id } = req;
        // Facturas con estado 'Emitida' (no pagadas) y que no estén eliminadas
        const [rows] = await pool.query(
            `SELECT f.*, c.nombre AS cliente_nombre, c.telefono
             FROM facturas f
             JOIN clientes c ON f.cliente_id = c.id
             WHERE f.organizacion_id = ? 
               AND f.estado = 'Emitida'
               AND f.eliminado_en IS NULL
             ORDER BY f.creado_en ASC`,
            [organizacion_id]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener cuentas por cobrar' });
    }
};

// cambiar estado como pagada
exports.marcarComoPagada = async (req, res) => {
    try {
        const { id } = req.params;
        const { organizacion_id } = req;
        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }
        if (factura.estado === 'Pagada') {
            return res.status(400).json({ message: 'Ya está pagada' });
        }
        await Factura.update(id, organizacion_id, { estado: 'Pagada' });
        // Aquí podríamos registrar fecha_pago si agregamos columna
        res.json({ message: 'Factura marcada como pagada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al procesar pago' });
    }
};