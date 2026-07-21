// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');

// Login
router.post('/login', async (req, res) => {
  try {
    const { correo, password } = req.body;
    const user = await Usuario.verifyPassword(correo, password);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (user.estado !== 'Activo') {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }

    // Verificar organización (si no es SUPER_ADMIN)
    if (user.rol !== 'SUPER_ADMIN' && user.organizacion_id) {
      const [orgRows] = await pool.query(
        'SELECT estado, nombre_empresa FROM organizaciones WHERE id = ?',
        [user.organizacion_id]
      );
      if (orgRows.length === 0 || orgRows[0].estado !== 'Activo') {
        return res.status(403).json({ message: 'Organización inactiva' });
      }
      // Guardar nombre de la organización para el frontend
      user.organizacion_nombre = orgRows[0].nombre_empresa;
    }

    const token = jwt.sign(
      { usuario_id: user.id, organizacion_id: user.organizacion_id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    //  Detectar si es contraseña temporal
    const esTemporal = user.password_temporal === 1;

    res.json({
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
        organizacion_id: user.organizacion_id,
        organizacion_nombre: user.organizacion_nombre || null,
        es_temporal: esTemporal,
      },
      mensaje: esTemporal ? 'Contraseña temporal. Debe cambiarla.' : undefined
    });
  } catch (error) {
    console.error(' [login] Error:', error);
    res.status(500).json({ message: 'Error en login', error: error.message });
  }
});

module.exports = router;