const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const reporteController = require('../controllers/reporteController');

const router = express.Router();
router.use(authMiddleware);

router.get('/dashboard', reporteController.obtenerDatosGraficas);
router.get('/libro-iva', reporteController.exportarLibroIva);
router.get('/kpis', reporteController.obtenerKPIs);
router.get('/anios-disponibles', reporteController.obtenerAñosDisponibles);

module.exports = router;