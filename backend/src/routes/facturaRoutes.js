// backend/src/routes/facturaRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const facturaController = require('../controllers/facturaController');

const router = express.Router();
router.use(authMiddleware);

// Rutas existentes
router.post('/', facturaController.crearFactura);
router.get('/', facturaController.obtenerFacturas);
router.get('/ultimas', facturaController.obtenerUltimasFacturas);
router.get('/buscar', facturaController.buscarFacturas);
router.get('/:id', facturaController.obtenerFacturaPorId);
router.put('/:id/estado', facturaController.cambiarEstadoFactura);
router.put('/:id', facturaController.editarFactura);
router.put('/:id/anular', facturaController.anularFactura);

router.post('/:factura_id/detalles', facturaController.crearDetalle);
router.delete('/detalles/:id', facturaController.eliminarDetalle);

// ¡Esta es la ruta del PDF!
router.get('/:id/pdf', facturaController.generarPDF);

module.exports = router;