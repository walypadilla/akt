// backend/src/routes/detalleFacturaRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const detalleFacturaController = require('../controllers/detalleFacturaController');

const router = express.Router();
router.use(authMiddleware);

// Obtener detalles de una factura específica
router.get('/factura/:factura_id', detalleFacturaController.obtenerDetallesPorFactura);

module.exports = router;