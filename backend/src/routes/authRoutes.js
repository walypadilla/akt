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
                tipo_contribuyente, ambiente, logo_url, estado,
                tipo_organizacion, id_departamento, id_municipio, 
                direccion_linea, codigo_giro, whatsapp_activado,
                citas_activado, dte_activado, 
                plan_id, limite_facturas, limite_whatsapp
         FROM organizaciones WHERE id = ?`,
        [user.organizacion_id]
      );

      if (orgRows.length === 0 || orgRows[0].estado !== 'Activo') {
        return res.status(403).json({ message: 'Organización inactiva' });
      }

      const org = orgRows[0];
      organizacionData = {
        id: org.id,
        nombre_empresa: org.nombre_empresa,
        nombre_comercial: org.nombre_comercial,
        nit: org.nit,
        nrc: org.nrc,
        direccion: org.direccion,
        telefono: org.telefono,
        telefono_whatsapp: org.telefono_whatsapp,
        correo_contacto: org.correo_contacto,
        tipo_contribuyente: org.tipo_contribuyente,
        ambiente: org.ambiente,
        logo_url: org.logo_url,
        estado: org.estado,
        tipo_organizacion: org.tipo_organizacion,
        id_departamento: org.id_departamento,
        id_municipio: org.id_municipio,
        direccion_linea: org.direccion_linea,
        codigo_giro: org.codigo_giro,
        whatsapp_activado: org.whatsapp_activado,
        citas_activado: org.citas_activado,
        dte_activado: org.dte_activado,
        plan_id: org.plan_id,
        limite_facturas: org.limite_facturas,
        limite_whatsapp: org.limite_whatsapp,
      };
    }

    const token = jwt.sign(
      { usuario_id: user.id, organizacion_id: user.organizacion_id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
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