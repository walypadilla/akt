// backend/src/routes/catalogoRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const catalogoController = require('../controllers/catalogoController');

const router = express.Router();
router.use(authMiddleware);

router.get('/departamentos', catalogoController.obtenerDepartamentos);
router.get('/departamentos/:id_departamento', catalogoController.obtenerDepartamentoPorId);
router.get('/municipios/:id_departamento', catalogoController.obtenerMunicipios);
router.get('/municipios/:id_departamento/:id_municipio', catalogoController.obtenerMunicipioPorId);
router.get('/actividades', catalogoController.obtenerActividades);
router.get('/actividades/:codigo_giro', catalogoController.obtenerActividadPorCodigo);

module.exports = router;