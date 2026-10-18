// backend/src/routes/superAdminRoutes.js
const express = require('express');
const { authMiddleware, isSuperAdmin } = require('../middleware/authMiddleware');
const superAdminController = require('../controllers/superAdminController');
const {upload} = require('../middleware/uploadMiddleware');


const router = express.Router();
router.use(authMiddleware);
router.use(isSuperAdmin);

// Organizaciones
router.get('/organizaciones', superAdminController.obtenerOrganizaciones);
router.get('/organizaciones/:id', superAdminController.obtenerOrganizacionPorId);
router.post('/organizaciones', upload.single('logo'), superAdminController.crearOrganizacion);
router.put('/organizaciones/:id', upload.single('logo'), superAdminController.actualizarOrganizacion);
router.put('/organizaciones/:organizacion_id/estado', superAdminController.cambiarEstadoOrganizacion);
router.post('/organizaciones/:id/logo', upload.single('logo'), superAdminController.subirLogoOrganizacion);

// Usuarios de organizaciones
router.get('/organizaciones/:organizacion_id/usuarios', superAdminController.obtenerUsuariosPorOrganizacion);
router.post('/organizaciones/:organizacion_id/usuarios', superAdminController.crearUsuarioOrganizacion);
router.post('/organizaciones/:organizacion_id/usuarios/multiples', superAdminController.crearMultiplesUsuarios);
router.put('/usuarios/:id', superAdminController.actualizarUsuario);
router.put('/usuarios/:id/password', superAdminController.cambiarContraseñaUsuario);
router.post('/usuarios/:id/restablecer', superAdminController.restablecerContraseña);
router.put('/usuarios/:id/correo', superAdminController.cambiarCorreoUsuario);

// SuperAdmins
router.get('/superadmins', superAdminController.obtenerSuperAdmins);
router.post('/superadmins', superAdminController.crearSuperAdmin);
router.put('/superadmins/:id', superAdminController.actualizarSuperAdmin);
router.delete('/superadmins/:id', superAdminController.eliminarSuperAdmin);

// Dashboard
router.get('/dashboard', superAdminController.obtenerDashboardSuperAdmin);
router.get('/consumo-global', superAdminController.obtenerConsumoGlobal);
router.get('/planes', superAdminController.obtenerPlanes);

// Membresías y contabilidad
router.post('/pago-membresia', superAdminController.registrarPagoMembresia);
router.post('/gasto-saas', superAdminController.registrarGastoSaaS);
router.get('/contabilidad', superAdminController.obtenerContabilidadSaaS);
router.get('/contabilidad-detallada', superAdminController.obtenerContabilidadDetallada);
router.get('/cuentas-cobrar', superAdminController.obtenerCuentasCobrar);
router.get('/ingresos-detalle', superAdminController.obtenerDetalleIngresos);
router.get('/gastos-detalle', superAdminController.obtenerDetalleGastos);
router.get('/get/facturas-canceladas', superAdminController.obtenerFacturasCanceladas);
router.get('/facturas/emitidas', superAdminController.obtenerFacturasEmitidasGlobal);

// Facturas por organización
router.get('/organizaciones/:organizacion_id/facturas', superAdminController.obtenerFacturasPorOrganizacion);
router.post('/factura-membresia', superAdminController.generarFacturaMembresia);
router.get('/facturas/:id/pdf', superAdminController.descargarPDFFactura);
router.put('/facturas/:id/estado', superAdminController.cambiarEstadoFactura);

// cambiar informacion de organizacion
router.get('/configuracion', superAdminController.obtenerConfiguracionSaaS);
router.put('/configuracion', superAdminController.actualizarConfiguracionSaaS);

// cancelacion de facturas 
router.put('/facturas/:id/cancelar', superAdminController.cancelarFactura);
router.delete('/gastos/:id', superAdminController.cancelarGasto);
router.delete('/ingresos/:id', superAdminController.eliminarIngreso);

module.exports = router;