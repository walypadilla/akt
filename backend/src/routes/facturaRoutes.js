// backend/src/routes/facturaRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const facturaController = require('../controllers/facturaController');

const router = express.Router();
router.use(authMiddleware);

// Rutas existentes
router.get('/facturas/dashboard', facturaController.obtenerDashboardFacturacion);
router.get('/facturas/anios', facturaController.getAniosDisponibles);
router.get('/facturas/exportar/filtradas', facturaController.exportarFacturasFiltradas);
router.get('/facturas/exportar/todas', facturaController.exportarTodasFacturas);
router.get('/facturas/grafica/evolucion/exportar', facturaController.exportarEvolucionVentas);
router.get('/facturas/grafica/comparacion-pagos/exportar', facturaController.exportarComparacionPagos);
router.get('/facturas/grafica/distribucion/exportar', facturaController.exportarDistribucionTipoDocumento);
router.get('/facturas/grafica/top-clientes/exportar', facturaController.exportarTopClientes);
// Envío WhatsApp
router.post('/facturas/:id/whatsapp', facturaController.enviarFacturaWhatsApp);
// CRUD
router.get('/facturas', facturaController.obtenerFacturas);
router.get('/facturas/:id', facturaController.obtenerFacturaPorId);
router.post('/facturas', facturaController.crearFactura);
router.put('/facturas/:id', facturaController.editarFactura);
router.put('/facturas/:id/estado', facturaController.cambiarEstadoFactura);
router.put('/facturas/:id/anular', facturaController.anularFactura);
router.get('/facturas/:id/pdf', facturaController.generarPDFFactura);


module.exports = router;