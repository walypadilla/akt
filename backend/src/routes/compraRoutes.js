const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const compraController = require('../controllers/compraController');

const router = express.Router();
router.use(authMiddleware);

// ========== COMPRAS ==========
router.get('/compras/dashboard', compraController.obtenerDashboardCompras);
router.get('/compras/exportar/todas', compraController.exportarTodasCompras);
router.get('/compras/exportar/filtradas', compraController.exportarComprasFiltradas);
router.get('/compras/grafica/evolucion', compraController.getEvolucionGastos);
router.get('/compras/grafica/comparacion-pagos', compraController.getComparacionPagosPorMes);
router.get('/compras/grafica/top-productos', compraController.getTopProductosMes);
router.get('/compras/grafica/evolucion/exportar', compraController.exportarEvolucionGastos);
router.get('/compras/grafica/comparacion-pagos/exportar', compraController.exportarComparacionPagos);
router.get('/compras/grafica/top-productos/exportar', compraController.exportarTopProductos);

router.get('/compras/pendientes', compraController.getComprasPendientes);
router.put('/compras/:id/pagar', compraController.marcarComoPagada);
router.get('/compras', compraController.obtenerCompras);
router.get('/compras/:id', compraController.obtenerCompraPorId);
router.post('/compras', compraController.crearCompra);
router.put('/compras/:id', compraController.actualizarCompra);
router.delete('/compras/:id', compraController.cancelarCompra);
router.get('/compras/:id/pdf', compraController.generarPDFCompra);


// Dashboard individuales (opcionales)
router.get('/compras/dashboard/kpis', compraController.getKPIs);
router.get('/compras/dashboard/evolucion', compraController.getEvolucionGastos);
router.get('/compras/dashboard/distribucion', compraController.getDistribucionEgresos);
router.get('/compras/dashboard/alertas-vencimiento', compraController.getAlertasVencimiento);
router.get('/compras/dashboard/top-proveedores', compraController.getTopProveedores);
router.get('/compras/anios', compraController.getAniosDisponibles);

module.exports = router;