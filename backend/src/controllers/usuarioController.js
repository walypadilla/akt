// backend/src/controllers/usuarioController.js
const Usuario = require('../models/Usuario');
const { pool } = require('../config/db');

// ========== OBTENER USUARIOS ==========
exports.obtenerUsuarios = async (req, res) => {
  try {
    const { organizacion_id, rol } = req.query; // ← Agregar rol
    const filters = {};
    if (organizacion_id) filters.organizacion_id = parseInt(organizacion_id);
    if (rol) filters.rol = rol; // ← Nueva condición

    // Si el usuario NO es SuperAdmin, solo puede ver usuarios de su organización
    if (req.rol !== 'SUPER_ADMIN') {
      filters.organizacion_id = req.organizacion_id;
    }

    const usuarios = await Usuario.findAll(filters);
    res.json(usuarios);
  } catch (error) {
    console.error('❌ [obtenerUsuarios] Error:', error);
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

// ========== OBTENER USUARIO POR ID ==========
exports.obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    // Verificar que el usuario pertenezca a la organización del usuario autenticado (si no es SuperAdmin)
    if (req.rol !== 'SUPER_ADMIN' && usuario.organizacion_id !== req.organizacion_id) {
      return res.status(403).json({ message: 'No tiene permiso para ver este usuario' });
    }
    res.json(usuario);
  } catch (error) {
    console.error('❌ [obtenerUsuarioPorId] Error:', error);
    res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
  }
};

// ========== CREAR USUARIO ==========
exports.crearUsuario = async (req, res) => {
  try {
    const { organizacion_id, nombre, correo, password, rol } = req.body;

    // Validaciones
    if (!nombre || !correo || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar que el correo no exista
    const exists = await Usuario.existsEmail(correo);
    if (exists) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    // Si el usuario no es SuperAdmin, solo puede crear en su organización
    let orgId = organizacion_id;
    if (req.rol !== 'SUPER_ADMIN') {
      orgId = req.organizacion_id;
    }

    const userId = await Usuario.create({
      organizacion_id: orgId,
      nombre,
      correo,
      password,
      rol: rol || 'Vendedor'
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      id: userId,
      correo
    });
  } catch (error) {
    console.error('❌ [crearUsuario] Error:', error);
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
};

// ========== ACTUALIZAR USUARIO ==========
exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, estado } = req.body;

    // Obtener usuario actual
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar permisos
    if (req.rol !== 'SUPER_ADMIN' && usuario.organizacion_id !== req.organizacion_id) {
      return res.status(403).json({ message: 'No tiene permiso para modificar este usuario' });
    }

    // No permitir modificar SuperAdmin desde esta sección
    if (usuario.rol === 'SUPER_ADMIN' && req.rol !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No puede modificar un SuperAdmin' });
    }

    // Verificar duplicado de correo
    if (correo && correo !== usuario.correo) {
      const exists = await Usuario.existsEmail(correo, id);
      if (exists) {
        return res.status(400).json({ message: 'El correo ya está registrado por otro usuario' });
      }
    }

    await Usuario.update(id, { nombre, correo, rol, estado });
    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('❌ [actualizarUsuario] Error:', error);
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
};

// ========== ELIMINAR USUARIO (Inactivar) ==========
exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // No permitir eliminar SuperAdmin
    if (usuario.rol === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No puede eliminar un SuperAdmin' });
    }

    // Verificar permisos
    if (req.rol !== 'SUPER_ADMIN' && usuario.organizacion_id !== req.organizacion_id) {
      return res.status(403).json({ message: 'No tiene permiso para eliminar este usuario' });
    }

    await Usuario.updateStatus(id, 'Inactivo');
    res.json({ message: 'Usuario inactivado correctamente' });
  } catch (error) {
    console.error('❌ [eliminarUsuario] Error:', error);
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
};

// ========== CAMBIAR CONTRASEÑA ==========
exports.cambiarContraseña = async (req, res) => {
  try {
    const { id } = req.params;
    const { nueva_contraseña, es_temporal = false } = req.body;

    if (!nueva_contraseña || nueva_contraseña.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar permisos
    if (req.rol !== 'SUPER_ADMIN' && usuario.organizacion_id !== req.organizacion_id) {
      return res.status(403).json({ message: 'No tiene permiso para cambiar la contraseña de este usuario' });
    }

    await Usuario.updatePassword(id, nueva_contraseña, es_temporal);
    res.json({
      message: 'Contraseña actualizada correctamente',
      es_temporal,
      sugerencia: es_temporal ? 'El usuario deberá cambiar su contraseña en el próximo inicio de sesión' : undefined
    });
  } catch (error) {
    console.error('❌ [cambiarContraseña] Error:', error);
    res.status(500).json({ message: 'Error al cambiar contraseña', error: error.message });
  }
};

// ========== RESTABLECER CONTRASEÑA (generar temporal) ==========
exports.restablecerContraseña = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar permisos
    if (req.rol !== 'SUPER_ADMIN' && usuario.organizacion_id !== req.organizacion_id) {
      return res.status(403).json({ message: 'No tiene permiso para restablecer la contraseña de este usuario' });
    }

    const temporal = await Usuario.resetPassword(id);
    res.json({
      message: 'Contraseña restablecida',
      contraseña_temporal: temporal,
      es_temporal: true,
      sugerencia: 'El usuario deberá cambiar su contraseña en el próximo inicio de sesión'
    });
  } catch (error) {
    console.error('❌ [restablecerContraseña] Error:', error);
    res.status(500).json({ message: 'Error al restablecer contraseña', error: error.message });
  }
};