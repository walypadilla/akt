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

    let organizacionData = null;
    
    // Si no es SUPER_ADMIN, obtener datos de la organización
    if (user.rol !== 'SUPER_ADMIN' && user.organizacion_id) {
      const [orgRows] = await pool.query(
        `SELECT id, nombre_empresa, nombre_comercial, nit, nrc, 
                direccion, telefono, telefono_whatsapp, correo_contacto, 
                tipo_contribuyente, ambiente, logo_url, estado
         FROM organizaciones WHERE id = ?`,
        [user.organizacion_id]
      );
      
      if (orgRows.length === 0 || orgRows[0].estado !== 'Activo') {
        return res.status(403).json({ message: 'Organización inactiva' });
      }
      
      organizacionData = {
        id: orgRows[0].id,
        nombre_empresa: orgRows[0].nombre_empresa,
        nombre_comercial: orgRows[0].nombre_comercial,
        nit: orgRows[0].nit,
        nrc: orgRows[0].nrc,
        direccion: orgRows[0].direccion,
        telefono: orgRows[0].telefono,
        telefono_whatsapp: orgRows[0].telefono_whatsapp,
        correo_contacto: orgRows[0].correo_contacto,
        tipo_contribuyente: orgRows[0].tipo_contribuyente,
        ambiente: orgRows[0].ambiente,
        logo_url: orgRows[0].logo_url,
        estado: orgRows[0].estado,
      };
    }

    const token = jwt.sign(
      { usuario_id: user.id, organizacion_id: user.organizacion_id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const esTemporal = user.password_temporal === 1;

    res.json({
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
        organizacion_id: user.organizacion_id,
        organizacion: organizacionData,
        es_temporal: esTemporal,
      },
      mensaje: esTemporal ? 'Contraseña temporal. Debe cambiarla.' : undefined
      
    });
    
  } catch (error) {
    console.error('❌ [login] Error:', error);
    res.status(500).json({ message: 'Error en login', error: error.message });
  }
});

module.exports = router;