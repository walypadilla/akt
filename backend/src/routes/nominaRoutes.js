const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const nominaController = require('../controllers/nominaController');

const router = express.Router();
router.use(authMiddleware);

router.post('/calcular', nominaController.calcularPlanillaMensual);
router.get('/', nominaController.obtenerPlanillas);

module.exports = router;