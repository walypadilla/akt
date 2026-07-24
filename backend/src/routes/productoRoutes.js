const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const productoController = require('../controllers/productoController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', productoController.obtenerProductos);
router.post('/', productoController.crearProducto);
router.put('/:id', productoController.actualizarProducto);
router.delete('/:id', productoController.eliminarProducto);
router.put('/:id/reactivar', productoController.reactivarProducto);
router.post('/increment-stock', productoController.incrementStock);
router.post('/decrement-stock', productoController.decrementStock);
router.get('/exportar-todos', productoController.exportarTodos);
router.get('/exportar-filtrados', productoController.exportarFiltrados);

module.exports = router;