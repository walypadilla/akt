const express = require('express');
const authRoutes = require('./authRoutes');
const facturaRoutes = require('./facturaRoutes');
const nominaRoutes = require('./nominaRoutes');
const reporteRoutes = require('./reporteRoutes');
const superAdminRoutes = require('./superAdminRoutes');
const cuentaCobrarRoutes = require('./cuentaCobrarRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/facturas', facturaRoutes);
router.use('/nomina', nominaRoutes);
router.use('/reportes', reporteRoutes);
router.use('/superadmin', superAdminRoutes);
router.use('/cuentas-cobrar', cuentaCobrarRoutes);

module.exports = router;