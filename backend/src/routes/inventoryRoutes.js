// backend/src/routes/inventarioRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();
router.use(authMiddleware);

// ========== DASHBOARD ==========
router.get('/dashboard', inventoryController.getInventoryDashboard);

// ========== BODEGAS ==========
router.get('/bodegas', inventoryController.findAllWarehouses);
router.post('/bodegas', inventoryController.createWarehouse);
router.put('/bodegas/:id', inventoryController.updateWarehouse);
router.delete('/bodegas/:id', inventoryController.deleteWarehouse);

// ========== CATEGORÍAS ==========
router.get('/categorias', inventoryController.getCategorias);
router.post('/categorias', inventoryController.createCategoria);
router.put('/categorias/:id', inventoryController.updateCategoria);
router.delete('/categorias/:id', inventoryController.deleteCategoria);

// ========== MARCAS ==========
router.get('/marcas', inventoryController.getMarcas);
router.post('/marcas', inventoryController.createMarca);
router.put('/marcas/:id', inventoryController.updateMarca);
router.delete('/marcas/:id', inventoryController.deleteMarca);

// ========== ETIQUETAS ==========
router.get('/etiquetas', inventoryController.getEtiquetas);
router.post('/etiquetas', inventoryController.createEtiqueta);
router.put('/etiquetas/:id', inventoryController.updateEtiqueta);
router.delete('/etiquetas/:id', inventoryController.deleteEtiqueta);

// ========== ASIGNAR ETIQUETAS A PRODUCTOS ==========
router.post('/productos/etiquetas', inventoryController.asignarEtiquetaAProducto);
router.delete('/productos/etiquetas', inventoryController.eliminarEtiquetaDeProducto);
router.get('/productos/:producto_id/etiquetas', inventoryController.getEtiquetasDeProducto);

// ========== PRODUCTOS ==========
router.get('/productos', inventoryController.getProductos);
router.get('/productos/:id', inventoryController.getProductoById);
router.post('/productos', inventoryController.createProducto);
router.put('/productos/:id', inventoryController.updateProducto);
router.delete('/productos/:id', inventoryController.deleteProducto);

// ========== MOVIMIENTOS ==========
router.get('/movimientos', inventoryController.getMovimientos);
router.get('/kardex/:producto_id', inventoryController.getKardex);

// ========== AJUSTES ==========
router.post('/ajustes', inventoryController.createAjuste);
router.get('/ajustes', inventoryController.getAjustes);

// ========== REPORTES ==========
router.get('/reportes/pareto', inventoryController.getPareto);
router.get('/reportes/lento-movimiento', inventoryController.getLentoMovimiento);
router.get('/reportes/valoracion', inventoryController.getValoracionInventario);
router.get('/reportes/toma-fisica', inventoryController.getTomaFisica);
router.get('/reportes/exportar/:tipo', inventoryController.exportarReporte);

// ========== KITS ==========
router.get('/kits/:producto_kit_id', inventoryController.getKitComponentes);
router.post('/kits', inventoryController.addKitComponente);
router.delete('/kits/:id', inventoryController.removeKitComponente);

// ========== COSTOS ==========
router.get('/costos/:producto_id', inventoryController.getCostosHistoricos);
router.post('/costos', inventoryController.registrarCostoHistorico);

// ========== ALERTAS Y KPIs ==========
router.get('/alertas', inventoryController.getAlertasStock);
router.get('/kpis', inventoryController.getKPIsInventario);
router.get('/proyeccion/:producto_id', inventoryController.getProyeccionAgotamiento);
router.get('/proyeccion-masiva', inventoryController.getProyeccionAgotamientoMasiva);

module.exports = router;