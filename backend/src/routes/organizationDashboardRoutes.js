// backend/src/routes/organizationDashboardRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const organizationDashboardController = require('../controllers/organizationDashboardController');

const router = express.Router();
router.use(authMiddleware);

// Dashboard completo con filtros (periodo, año, mes)
router.get('/', organizationDashboardController.getDashboardCompleto);

// O si prefieres mantener los endpoints separados, puedes dejar:
router.get('/kpis', organizationDashboardController.getKPIs);
router.get('/monthly', organizationDashboardController.getMonthlyData);
router.get('/top-clients', organizationDashboardController.getTopClients);

module.exports = router;