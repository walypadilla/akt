// backend/src/controllers/detalleFacturaController.js
const { pool } = require('../config/db');
const DetalleFactura = require('../models/DetalleFactura');

/**
 * Obtener todos los detalles de una factura específica
 */
exports.obtenerDetallesPorFactura = async (req, res) => {
  try {
    const { factura_id } = req.params;
    const { organizacion_id } = req;

    // Verificar que la factura pertenezca a la organización
    const [factura] = await pool.query(
      'SELECT id FROM facturas WHERE id = ? AND organizacion_id = ? AND eliminado_en IS NULL',
      [factura_id, organizacion_id]
    );
    if (factura.length === 0) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const detalles = await DetalleFactura.findByFacturaId(factura_id);
    res.json(detalles);
  } catch (error) {
    console.error('❌ [obtenerDetallesPorFactura] Error:', error);
    res.status(500).json({ message: 'Error al obtener detalles de factura', error: error.message });
  }
};