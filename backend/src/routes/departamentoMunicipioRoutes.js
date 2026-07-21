const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const departamentoController = require('../controllers/departamentoController');

const router = express.Router();
router.use(authMiddleware);

router.get('/departamentos', departamentoController.obtenerDepartamentos);
router.get('/municipios/:id_departamento', departamentoController.obtenerMunicipios);

module.exports = router;