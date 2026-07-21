const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const clienteController = require('../controllers/clienteController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', clienteController.obtenerClientes);
router.get('/:id', clienteController.obtenerClientePorId);
router.post('/', clienteController.crearCliente);
router.put('/:id', clienteController.actualizarCliente);
router.delete('/:id', clienteController.eliminarCliente);

module.exports = router;