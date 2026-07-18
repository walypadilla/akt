const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {pool} = require('../config/db');

// Registro de usuario (solo para SUPER_ADMIN o durante instalación)
router.post('/register', async (req, res) => {
    try {
        const { organizacion_id, nombre, correo, password, rol } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            `INSERT INTO usuarios (organizacion_id, nombre, correo, password, rol)
             VALUES (?, ?, ?, ?, ?)`,
            [organizacion_id, nombre, correo, hashedPassword, rol || 'Vendedor']
        );
        res.status(201).json({ message: 'Usuario creado', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar usuario' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;
        const [rows] = await pool.query(
            `SELECT u.*, o.estado AS organizacion_estado
             FROM usuarios u
             JOIN organizaciones o ON u.organizacion_id = o.id
             WHERE u.correo = ?`,
            [correo]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        const user = rows[0];
        if (user.estado !== 'Activo') {
            return res.status(403).json({ message: 'Usuario inactivo' });
        }
        // Verificar estado de la organización (excepto SUPER_ADMIN)
        if (user.rol !== 'SUPER_ADMIN' && user.organizacion_estado !== 'Activo') {
            return res.status(403).json({ message: 'Organización inactiva. Contacte al administrador.' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        const token = jwt.sign(
            { usuario_id: user.id, organizacion_id: user.organizacion_id, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.json({ token, usuario: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en login' });
    }
});

module.exports = router;