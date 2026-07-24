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
router.put('/empleados/:id/desactivar', empleadoController.desactivarEmpleado);
router.put('/empleados/:id/reactivar', empleadoController.reactivarEmpleado);
router.get('/empleados/exportar', empleadoController.exportarEmpleados);


// ========== PLANILLAS ==========
router.get('/planillas', planillaController.obtenerPlanillas);
router.post('/planillas/individual', planillaController.generarPlanillaIndividual);
router.post('/planillas/masiva', planillaController.generarPlanillaMasiva);
router.put('/planillas/:id/estado', planillaController.cambiarEstadoPlanilla);
router.delete('/planillas/:id', planillaController.eliminarPlanilla);
router.get('/planillas/exportar', planillaController.exportarPlanillas);
router.get('/planillas/:id/pdf', planillaController.generarBoletaPDF);
router.get('/planillas/anios', planillaController.getAniosDisponibles);
router.put('/planillas/multiple/estado', planillaController.cambiarEstadoMultiple);

// ========== AGUINALDOS Y VACACIONES ==========
router.post('/planillas/aguinaldos', planillaController.generarAguinaldos);
router.post('/planillas/vacaciones', planillaController.generarVacaciones);

// AUSENCIAS
router.post('/ausencias', planillaController.crearAusencia);
router.get('/ausencias', planillaController.obtenerAusencias);
router.delete('/ausencias/:id', planillaController.eliminarAusencia);
router.get('/ausencias/exportar', planillaController.exportarAusencias);

// HORAS EXTRAS
router.post('/horas-extras', planillaController.crearHoraExtra);
router.get('/horas-extras', planillaController.obtenerHorasExtras);
router.delete('/horas-extras/:id', planillaController.eliminarHoraExtra);
router.get('/horas-extras/exportar', planillaController.exportarHorasExtras);

module.exports = router;