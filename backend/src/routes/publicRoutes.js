// backend/src/routes/publicRoutes.js
const express = require('express');
const examenController = require('../controllers/clinica/examenController');
const vacunaController = require('../controllers/clinica/vacunaController.js');
const { publicRateLimit } = require('../middleware/publicRateLimit');

const router = express.Router();

// Rutas públicas SIN autenticación
// Rate limit: 30 requests por minuto por IP
router.get(
  '/examenes/:token',
  publicRateLimit(30, 60 * 1000),
  examenController.getInfoResultadoPublico
);

router.get(
  '/examenes/:token/pdf',
  publicRateLimit(30, 60 * 1000),
  examenController.getResultadoPublico
);

// Cartillas de vacunación
router.get('/cartilla/:token', publicRateLimit(30, 60 * 1000), vacunaController.getCartillaPublica);
router.get('/cartilla/:token/pdf', publicRateLimit(30, 60 * 1000), vacunaController.getPDFCartillaPublica);

module.exports = router;