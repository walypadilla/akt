// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const {pool} = require('../config/db');
const {JWT_SECRET} = require('../config/config')

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario_id = decoded.usuario_id;
    req.organizacion_id = decoded.organizacion_id;
    req.rol = decoded.rol;

    if (req.rol === 'SUPER_ADMIN') {
      return next();
    }

    const [rows] = await pool.query(
      'SELECT estado FROM organizaciones WHERE id = ?',
      [req.organizacion_id]
    );

    if (rows.length === 0 || rows[0].estado !== 'Activo') {
      console.log(' [authMiddleware] Organización inactiva o no existe');
      return res.status(403).json({ 
        message: 'Suscripción vencida o inactiva. Contacte al administrador.' 
      });
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    return res.status(500).json({ message: 'Error en autenticación' });
  }
};

// Middleware para verificar rol SUPER_ADMIN
const isSuperAdmin = (req, res, next) => {
    if (req.rol !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Acceso denegado: se requiere rol SUPER_ADMIN' });
    }
    next();
};

module.exports = { authMiddleware, isSuperAdmin };