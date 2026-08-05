// backend/src/routes/index.js
const express = require('express');
const authRoutes = require('./authRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const facturaRoutes = require('./facturaRoutes');
const reporteRoutes = require('./reporteRoutes');
const superAdminRoutes = require('./superAdminRoutes');
const cuentaCobrarRoutes = require('./cuentaCobrarRoutes');
const organizationDashboardRoutes = require('./organizationDashboardRoutes');
const productoRoutes = require('./productoRoutes');
const organizationRoutes = require('./organizationRoutes');
const catalogoRoutes = require('./catalogoRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const compraRoutes = require('./compraRoutes');
const clinicaRoutes = require('./clinicaRoutes');


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/facturas', facturaRoutes);
router.use('/reportes', reporteRoutes);
router.use('/superadmin', superAdminRoutes);
router.use('/cuentas-cobrar', cuentaCobrarRoutes);
router.use('/organization-dashboard', organizationDashboardRoutes);
router.use('/productos', productoRoutes);
router.use('/organization', organizationRoutes);
router.use('/catalogos', catalogoRoutes);
router.use('/inventario', inventoryRoutes);
router.use('/compras', compraRoutes);
router.use('/clinica', clinicaRoutes);

module.exports = router;