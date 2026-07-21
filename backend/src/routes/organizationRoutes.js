// backend/src/routes/organizationRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');

// Controladores (asegúrate de que existan todos)
const clienteController = require('../controllers/clienteController');
const facturaController = require('../controllers/facturaController');
const compraController = require('../controllers/compraController');
const empleadoController = require('../controllers/empleadoController');
const planillaController = require('../controllers/planillaController');
const proveedorController = require('../controllers/proveedorController');

const router = express.Router();
router.use(authMiddleware);

// ========== CLIENTES ==========
router.get('/clientes', clienteController.obtenerClientes);
router.get('/clientes/:id', clienteController.obtenerClientePorId);
router.post('/clientes', clienteController.crearCliente);
router.put('/clientes/:id', clienteController.actualizarCliente);
router.delete('/clientes/:id', clienteController.eliminarCliente);

// ========== PROVEEDORES ==========
router.get('/proveedores', proveedorController.obtenerProveedores);
router.get('/proveedores/:id', proveedorController.obtenerProveedorPorId);
router.post('/proveedores', proveedorController.crearProveedor);
router.put('/proveedores/:id', proveedorController.actualizarProveedor);
router.delete('/proveedores/:id', proveedorController.eliminarProveedor);

// ========== FACTURAS ==========
router.get('/facturas', facturaController.obtenerFacturas);
router.get('/facturas/:id', facturaController.obtenerFacturaPorId);
router.post('/facturas', facturaController.crearFactura);
router.put('/facturas/:id', facturaController.editarFactura);
router.put('/facturas/:id/estado', facturaController.cambiarEstadoFactura);
router.put('/facturas/:id/anular', facturaController.anularFactura);
router.get('/facturas/:id/pdf', facturaController.generarPDF);

// ========== COMPRAS ==========
router.get('/compras', compraController.obtenerCompras);
router.get('/compras/:id', compraController.obtenerCompraPorId);
router.post('/compras', compraController.crearCompra);
router.put('/compras/:id', compraController.actualizarCompra);
router.delete('/compras/:id', compraController.eliminarCompra);

// ========== EMPLEADOS ==========
router.get('/empleados', empleadoController.obtenerEmpleados);
router.get('/empleados/:id', empleadoController.obtenerEmpleadoPorId);
router.post('/empleados', empleadoController.crearEmpleado);
router.put('/empleados/:id', empleadoController.actualizarEmpleado);
router.delete('/empleados/:id', empleadoController.eliminarEmpleado);

// ========== PLANILLAS ==========
router.get('/planillas', planillaController.obtenerPlanillas);
router.post('/planillas/calcular', planillaController.calcularPlanilla);
router.put('/planillas/:id', planillaController.actualizarPlanilla);
router.delete('/planillas/:id', planillaController.eliminarPlanilla);

// ========== RUTA ADICIONAL: PLANILLA MASIVA ==========
router.post('/planillas/masiva', planillaController.generarPlanillaMasiva);

module.exports = router;