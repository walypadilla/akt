const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const proveedorController = require('../controllers/proveedorController');

const router = express.Router();
router.use(authMiddleware);

// ========== PROVEEDORES ==========
router.get('/proveedores', proveedorController.obtenerProveedores);
router.get('/proveedores/:id', proveedorController.obtenerProveedorPorId);
router.post('/proveedores', proveedorController.crearProveedor);
router.put('/proveedores/:id', proveedorController.actualizarProveedor);
router.delete('/proveedores/:id', proveedorController.eliminarProveedor);
router.put('/proveedores/:id/reactivar', proveedorController.reactivarProveedor);
router.get('/proveedores/exportar', proveedorController.exportarProveedores);
router.get('/proveedores/:id/pdf', proveedorController.generarProveedorPDF);

module.exports = router;