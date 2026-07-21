// backend/src/routes/usuarioRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ========== GESTIÓN DE USUARIOS (para SuperAdmin) ==========
router.get('/', usuarioController.obtenerUsuarios);
router.get('/:id', usuarioController.obtenerUsuarioPorId);
router.post('/', usuarioController.crearUsuario);
router.put('/:id', usuarioController.actualizarUsuario);
router.delete('/:id', usuarioController.eliminarUsuario);

// ========== CONTRASEÑAS ==========
router.put('/:id/password', usuarioController.cambiarContraseña);
router.post('/:id/reset-password', usuarioController.restablecerContraseña);

module.exports = router;