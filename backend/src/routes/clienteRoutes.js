const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const clienteController = require('../controllers/clienteController');

const router = express.Router();
router.use(authMiddleware);

// ========== CLIENTES ==========
router.get('/clientes', clienteController.obtenerClientes);
router.get('/clientes/:id', clienteController.obtenerClientePorId);
router.post('/clientes', clienteController.crearCliente);
router.put('/clientes/:id', clienteController.actualizarCliente);
router.delete('/clientes/:id', clienteController.eliminarCliente);
router.put('/clientes/:id/reactivar', clienteController.reactivarCliente);
router.get('/clientes/exportar/todos', clienteController.exportarTodosClientes);
router.get('/clientes/exportar/filtrados', clienteController.exportarClientesFiltrados);
router.get('/clientes/:id/pdf', clienteController.generarClientePDF);

// Gráficas
router.get('/clientes/grafica/por-mes', clienteController.getClientesPorMes);
router.get('/clientes/grafica/top', clienteController.getTopClientes);
router.get('/clientes/grafica/por-mes/exportar', clienteController.exportarGraficaClientesPorMes);
router.get('/clientes/grafica/top/exportar', clienteController.exportarTopClientes);

// Años disponibles
router.get('/clientes/anios', clienteController.getAniosDisponibles);

module.exports = router;