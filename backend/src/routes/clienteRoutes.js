// backend/src/routes/clienteRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const clienteController = require('../controllers/clienteController');

const router = express.Router();
router.use(authMiddleware);

// ✅ Rutas ESPECÍFICAS primero (literales antes de :id)
router.get('/clientes/anios', clienteController.getAniosDisponibles);
router.get('/clientes/exportar/todos', clienteController.exportarTodosClientes);
router.get('/clientes/exportar/filtrados', clienteController.exportarClientesFiltrados);
router.get('/clientes/grafica/por-mes', clienteController.getClientesPorMes);
router.get('/clientes/grafica/top', clienteController.getTopClientes);
router.get('/clientes/grafica/por-mes/exportar', clienteController.exportarGraficaClientesPorMes);
router.get('/clientes/grafica/top/exportar', clienteController.exportarTopClientes);

// ✅ CRUD
router.get('/clientes', clienteController.obtenerClientes);
router.post('/clientes', clienteController.crearCliente);

// ⚠️ Rutas con :id SIEMPRE al final
router.get('/clientes/:id', clienteController.obtenerClientePorId);
router.put('/clientes/:id', clienteController.actualizarCliente);
router.delete('/clientes/:id', clienteController.eliminarCliente);
router.put('/clientes/:id/reactivar', clienteController.reactivarCliente);
router.get('/clientes/:id/pdf', clienteController.generarClientePDF);

module.exports = router;