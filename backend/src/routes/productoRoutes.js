const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const productoController = require('../controllers/productoController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', productoController.obtenerProductos);
router.post('/', productoController.crearProducto);
router.put('/:id', productoController.actualizarProducto);
router.delete('/:id', productoController.eliminarProducto);

module.exports = router;