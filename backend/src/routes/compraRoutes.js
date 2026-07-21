const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const compraController = require('../controllers/compraController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', compraController.obtenerCompras);
router.get('/:id', compraController.obtenerCompraPorId);
router.post('/', compraController.crearCompra);
router.put('/:id', compraController.actualizarCompra);
router.delete('/:id', compraController.eliminarCompra);

module.exports = router;