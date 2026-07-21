const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const proveedorController = require('../controllers/proveedorController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', proveedorController.obtenerProveedores);
router.get('/:id', proveedorController.obtenerProveedorPorId);
router.post('/', proveedorController.crearProveedor);
router.put('/:id', proveedorController.actualizarProveedor);
router.delete('/:id', proveedorController.eliminarProveedor);

module.exports = router;