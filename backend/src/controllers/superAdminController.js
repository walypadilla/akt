// backend/src/controllers/superAdminController.js
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const Factura = require('../models/Factura');
const Usuario = require('../models/Usuario');
const Plan = require('../models/Plan')
const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table'); // Para usar el método de PDF (opcional)

// Función auxiliar para normalizar números de teléfono
function normalizarTelefono(numero) {
  if (!numero) return null;
  // Eliminar espacios, guiones, puntos
  let limpio = numero.replace(/[\s\-.]/g, '');
  // Si no tiene el prefijo +503, lo agregamos
  if (!limpio.startsWith('+')) {
    // Si solo tiene 8 dígitos, asumimos que es El Salvador
    if (/^\d{8}$/.test(limpio)) {
      return `+503${limpio}`;
    }
    // Si tiene 11 dígitos y empieza con 503 (ej: 50371409012)
    if (/^503\d{8}$/.test(limpio)) {
      return `+${limpio}`;
    }
    // Si tiene 10 dígitos y empieza con 503 (ej: 5037140901 - faltaría un dígito)
    // En ese caso, mejor lo dejamos como está y avisamos
    if (/^503\d{7}$/.test(limpio)) {
      return `+${limpio}`;
    }
    // Para cualquier otro caso, simplemente agregamos el + (puede que ya tenga código de país)
    return `+${limpio}`;
  }
  return limpio;
}

// ============================================================
// 1. ORGANIZACIONES
// ============================================================

exports.obtenerOrganizaciones = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM usuarios WHERE organizacion_id = o.id AND rol != 'SUPER_ADMIN') AS total_usuarios
       FROM organizaciones o 
       WHERE o.nombre_empresa != 'SuperAdmin'
       ORDER BY o.creado_en DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener organizaciones:', error);
    res.status(500).json({ message: 'Error al obtener organizaciones: ' + error.message });
  }
};

exports.obtenerOrganizacionPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM organizaciones WHERE id = ? AND nombre_empresa != 'SuperAdmin'`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener organización:', error);
    res.status(500).json({ message: 'Error al obtener organización: ' + error.message });
  }
};

exports.crearOrganizacion = async (req, res) => {
  try {
     const {
      nombre_empresa,
      nombre_comercial,
      direccion,
      telefono,
      telefono_whatsapp,
      nit,
      nrc,
      tipo_contribuyente,
      tipo_organizacion,
      ambiente,
      token_mh,
      llave_privada_p12,
      logo_url,
      correo_admin,
      nombre_admin,
      password_admin,
      id_departamento,
      id_municipio,
      direccion_linea,
      codigo_giro,
      plan_id = 1,
      whatsapp_activado = true,
      limite_facturas = 40,
      limite_whatsapp = 200,
    } = req.body;

    // Verificar si Multer atrapó un archivo en req.file
    let logoUrlFinal = logo_url ? logo_url.trim() : '';
    if (req.file) {
      // Guardamos la ruta relativa para poder servirla después
      logoUrlFinal = `/uploads/logos/${req.file.filename}`;
    }

    // Normalizar teléfonos
    const telefonoNormalizado = telefono ? normalizarTelefono(telefono) : '';
    const telefonoWhatsappNormalizado = telefono_whatsapp ? normalizarTelefono(telefono_whatsapp) : '';

    // Validaciones
    const errores = [];
    if (!nombre_empresa || nombre_empresa.trim() === '') errores.push('Nombre de empresa es obligatorio');
    if (!nit || nit.trim() === '') errores.push('NIT es obligatorio');
    if (!correo_admin || !correo_admin.includes('@')) errores.push('Correo administrativo válido es obligatorio');
    if (!password_admin || password_admin.length < 6) errores.push('La contraseña debe tener al menos 6 caracteres');
    if (!tipo_contribuyente) errores.push('Tipo de contribuyente es obligatorio');

    if (errores.length > 0) {
      return res.status(400).json({ message: 'Errores de validación', errores });
    }

    // Validar que el correo no exista
    const [existingUser] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo_admin]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'El correo del administrador ya está registrado' });
    }

    // Validar que el NIT no exista
    const [existingNit] = await pool.query(
      'SELECT id FROM organizaciones WHERE nit = ?',
      [nit]
    );
    if (existingNit.length > 0) {
      return res.status(400).json({ message: 'El NIT ya está registrado' });
    }

    // Validar NRC (si se proporciona) que no esté duplicado
    if (nrc && nrc.trim() !== '') {
      const [existingNrc] = await pool.query(
        'SELECT id FROM organizaciones WHERE nrc = ?',
        [nrc]
      );
      if (existingNrc.length > 0) {
        return res.status(400).json({ message: 'El NRC ya está registrado' });
      }
    }

    const ambienteMap = {
      'Pruebas': '00',
      'Producción': '01',
    };
    const ambienteDB = ambienteMap[ambiente] || '00';

    // --- NUEVO: Normalizar booleanos y enteros para evitar fallos al recibir FormData ---
    const isWhatsappActivo = whatsapp_activado === true || 
                             whatsapp_activado === 'true' || 
                             whatsapp_activado === 1 || 
                             whatsapp_activado === '1';
    const limitFacturasVal = parseInt(limite_facturas, 10) || 40;
    const limitWhatsappVal = isWhatsappActivo ? (parseInt(limite_whatsapp, 10) || 0) : 0;
    // ------------------------------------------------------------------------------------

    // Insertar organización con todos los campos incluyendo los DTE
     const [orgResult] = await pool.query(
      `INSERT INTO organizaciones 
      (nombre_empresa, nombre_comercial, direccion, telefono, telefono_whatsapp, 
        nit, nrc, tipo_contribuyente, tipo_organizacion, ambiente, 
        token_mh, llave_privada_p12, logo_url, estado,
        id_departamento, id_municipio, direccion_linea, codigo_giro,
        plan_id, whatsapp_activado, limite_facturas, limite_whatsapp) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre_empresa.trim(),
        nombre_comercial ? nombre_comercial.trim() : '',
        direccion ? direccion.trim() : '',
        telefonoNormalizado,
        telefonoWhatsappNormalizado,
        nit.trim(),
        nrc ? nrc.trim() : '',
        tipo_contribuyente,
        tipo_organizacion || 'Empresa Comercial',
        ambienteDB,
        token_mh || null,
        llave_privada_p12 || null,
        logoUrlFinal,
        'Activo',
        id_departamento || null,
        id_municipio || null,
        direccion_linea || null,
        codigo_giro || '62010',
        plan_id,
        isWhatsappActivo ? 1 : 0,
        limitFacturasVal,
        limitWhatsappVal,
      ]
    );
    const organizacion_id = orgResult.insertId;

    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash(password_admin, 10);
    await pool.query(
      `INSERT INTO usuarios (organizacion_id, nombre, correo, password, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organizacion_id, nombre_admin || 'Administrador', correo_admin.trim(), hashedPassword, 'Admin', 'Activo']
    );

    res.status(201).json({
      message: 'Organización creada exitosamente',
      organizacion_id,
      usuario_admin: correo_admin
    });
  } catch (error) {
    console.error('Error al crear organización:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'El NIT o NRC ya está registrado' });
    }
    res.status(500).json({ message: 'Error al crear organización: ' + error.message });
  }
};

// Actualizar organización (con todos los campos)
exports.actualizarOrganizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre_empresa,
      nombre_comercial,
      direccion,
      telefono,
      telefono_whatsapp,
      nit,
      nrc,
      tipo_contribuyente,
      tipo_organizacion,
      ambiente,
      token_mh,
      llave_privada_p12,
      logo_url,
      id_departamento,
      id_municipio,
      direccion_linea,
      codigo_giro,
      plan_id,
      whatsapp_activado,
      limite_facturas,
      limite_whatsapp,
    } = req.body;

    // Verificar si Multer atrapó un archivo en req.file
    let logoUrlFinal = logo_url ? logo_url.trim() : '';
    if (req.file) {
      // Si se subió un archivo nuevo, sobreescribimos con su ruta
      logoUrlFinal = `/uploads/logos/${req.file.filename}`;
    }

    // Normalizar teléfonos
    const telefonoNormalizado = telefono ? normalizarTelefono(telefono) : '';
    const telefonoWhatsappNormalizado = telefono_whatsapp ? normalizarTelefono(telefono_whatsapp) : '';

    // Verificar que la organización exista y no sea SuperAdmin
    const [org] = await pool.query(
      'SELECT id FROM organizaciones WHERE id = ? AND nombre_empresa != "SuperAdmin"',
      [id]
    );
    if (org.length === 0) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }

    // Validar que el NIT no esté duplicado (excepto esta organización)
    if (nit) {
      const [existingNit] = await pool.query(
        'SELECT id FROM organizaciones WHERE nit = ? AND id != ?',
        [nit, id]
      );
      if (existingNit.length > 0) {
        return res.status(400).json({ message: 'El NIT ya está registrado por otra organización' });
      }
    }

    // Validar NRC duplicado
    if (nrc && nrc.trim() !== '') {
      const [existingNrc] = await pool.query(
        'SELECT id FROM organizaciones WHERE nrc = ? AND id != ?',
        [nrc, id]
      );
      if (existingNrc.length > 0) {
        return res.status(400).json({ message: 'El NRC ya está registrado por otra organización' });
      }
    }

    // Mapear ambiente: 'Pruebas' -> '00', 'Producción' -> '01'
    const ambienteMap = {
      'Pruebas': '00',
      'Producción': '01',
    };
    const ambienteDB = ambienteMap[ambiente] || '00';

    // --- NUEVO: Normalizar booleanos y enteros para evitar fallos al recibir FormData ---
    const isWhatsappActivo = whatsapp_activado === true || 
                             whatsapp_activado === 'true' || 
                             whatsapp_activado === 1 || 
                             whatsapp_activado === '1';
    const limitFacturasVal = parseInt(limite_facturas, 10) || 40;
    const limitWhatsappVal = isWhatsappActivo ? (parseInt(limite_whatsapp, 10) || 0) : 0;
    // ------------------------------------------------------------------------------------

    await pool.query(
      `UPDATE organizaciones SET
        nombre_empresa = ?, nombre_comercial = ?, direccion = ?, 
        telefono = ?, telefono_whatsapp = ?, nit = ?, nrc = ?,
        tipo_contribuyente = ?, tipo_organizacion = ?, ambiente = ?,
        token_mh = ?, llave_privada_p12 = ?, logo_url = ?,
        id_departamento = ?, id_municipio = ?, direccion_linea = ?, codigo_giro = ?,
        plan_id = ?, whatsapp_activado = ?, limite_facturas = ?, limite_whatsapp = ?
      WHERE id = ?`,
      [
        nombre_empresa ? nombre_empresa.trim() : '',
        nombre_comercial ? nombre_comercial.trim() : '',
        direccion ? direccion.trim() : '',
        telefonoNormalizado,
        telefonoWhatsappNormalizado,
        nit ? nit.trim() : '',
        nrc ? nrc.trim() : '',
        tipo_contribuyente || 'Pequeño',
        tipo_organizacion || 'Empresa Comercial',
        ambienteDB,
        token_mh || null,
        llave_privada_p12 || null,
        logoUrlFinal,
        id_departamento || null,
        id_municipio || null,
        direccion_linea || null,
        codigo_giro || '62010',
        plan_id || 1,
        isWhatsappActivo ? 1 : 0,
        limitFacturasVal,
        limitWhatsappVal,
        id
      ]
    );

    res.json({ message: 'Organización actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar organización:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'El NIT o NRC ya está registrado' });
    }
    res.status(500).json({ message: 'Error al actualizar organización: ' + error.message });
  }
};

exports.cambiarEstadoOrganizacion = async (req, res) => {
  const { organizacion_id } = req.params;
  const { estado } = req.body; // 'Activo' o 'Inactivo'

  try {
    // 1. Actualizar el estado de la organización
    await pool.query('UPDATE organizaciones SET estado = ? WHERE id = ?', [estado, organizacion_id]);
    
    // 2. Actualizar el estado de todos los usuarios pertenecientes a esa organización
    await pool.query('UPDATE usuarios SET estado = ? WHERE organizacion_id = ?', [estado, organizacion_id]);

    res.json({ message: `Organización y sus usuarios marcados como ${estado}` });
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
  }
};

// ============================================================
// 2. USUARIOS DE ORGANIZACIONES
// ============================================================

exports.obtenerUsuariosPorOrganizacion = async (req, res) => {
  try {
    const { organizacion_id } = req.params;
    const usuarios = await Usuario.findAll({ organizacion_id });
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios: ' + error.message });
  }
};

exports.crearUsuarioOrganizacion = async (req, res) => {
  try {
    const { organizacion_id } = req.params;
    const { nombre, correo, rol, password } = req.body;
    // Usar el modelo
    const userId = await Usuario.create({
      organizacion_id,
      nombre,
      correo,
      password,
      rol: rol || 'Vendedor'
    });
    res.status(201).json({ message: 'Usuario creado exitosamente', id: userId });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario: ' + error.message });
  }
};

exports.crearMultiplesUsuarios = async (req, res) => {
  try {
    const { organizacion_id } = req.params;
    const { usuarios } = req.body;

    if (!usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
      return res.status(400).json({ message: 'Debe enviar al menos un usuario' });
    }

    const resultados = [];
    const errores = [];

    for (const user of usuarios) {
      try {
        const { nombre, correo, rol, password } = user;
        if (!nombre || !correo || !password) {
          errores.push({ correo, error: 'Faltan campos obligatorios' });
          continue;
        }
        if (password.length < 6) {
          errores.push({ correo, error: 'La contraseña debe tener al menos 6 caracteres' });
          continue;
        }

        const [existing] = await pool.query(
          'SELECT id FROM usuarios WHERE correo = ? AND organizacion_id = ?',
          [correo, organizacion_id]
        );
        if (existing.length > 0) {
          errores.push({ correo, error: 'El correo ya está registrado' });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          `INSERT INTO usuarios (organizacion_id, nombre, correo, password, rol, estado)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [organizacion_id, nombre, correo, hashedPassword, rol || 'Vendedor', 'Activo']
        );
        resultados.push({ correo, status: 'Creado' });
      } catch (err) {
        errores.push({ correo: user.correo || 'desconocido', error: err.message });
      }
    }

    res.status(201).json({
      message: `Usuarios creados: ${resultados.length}, errores: ${errores.length}`,
      resultados,
      errores
    });
  } catch (error) {
    console.error('Error al crear múltiples usuarios:', error);
    res.status(500).json({ message: 'Error al crear usuarios: ' + error.message });
  }
};

exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, estado } = req.body;
    await Usuario.update(id, { nombre, correo, rol, estado });
    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario: ' + error.message });
  }
};

exports.cambiarContraseñaUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nueva_contraseña, es_temporal = false } = req.body;
    if (!nueva_contraseña || nueva_contraseña.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }
    await Usuario.updatePassword(id, nueva_contraseña, es_temporal);
    res.json({
      message: 'Contraseña actualizada correctamente',
      es_temporal,
      sugerencia: es_temporal ? 'El usuario deberá cambiar su contraseña en el próximo inicio de sesión' : undefined
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error al cambiar contraseña: ' + error.message });
  }
};

exports.restablecerContraseña = async (req, res) => {
  try {
    const { id } = req.params;
    const temporal = await Usuario.resetPassword(id);
    res.json({
      message: 'Contraseña restablecida',
      contraseña_temporal: temporal,
      es_temporal: true
    });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ message: 'Error al restablecer contraseña: ' + error.message });
  }
};

exports.cambiarCorreoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_correo } = req.body;

    if (!nuevo_correo || !nuevo_correo.includes('@')) {
      return res.status(400).json({ message: 'Correo válido es obligatorio' });
    }

    const [user] = await pool.query('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
      [nuevo_correo, id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    await pool.query(
      `UPDATE usuarios SET correo = ? WHERE id = ?`,
      [nuevo_correo, id]
    );

    res.json({ message: 'Correo actualizado correctamente', nuevo_correo });
  } catch (error) {
    console.error('Error al cambiar correo:', error);
    res.status(500).json({ message: 'Error al cambiar correo: ' + error.message });
  }
};

// ============================================================
// 3. SUPERADMIN GESTIÓN
// ============================================================

exports.obtenerSuperAdmins = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, correo, estado, 
              DATE_FORMAT(creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en
       FROM usuarios 
       WHERE rol = 'SUPER_ADMIN' 
       ORDER BY creado_en DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener superadmins:', error);
    res.status(500).json({ message: 'Error al obtener superadmins: ' + error.message });
  }
};

exports.crearSuperAdmin = async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    let [orgRows] = await pool.query(
      `SELECT id FROM organizaciones WHERE nombre_empresa = 'SuperAdmin' LIMIT 1`
    );
    let organizacion_id;
    if (orgRows.length === 0) {
      const [result] = await pool.query(
        `INSERT INTO organizaciones (nombre_empresa, nit, tipo_contribuyente, estado)
         VALUES (?, ?, ?, ?)`,
        ['SuperAdmin', '0000-000000-000-0', 'Exento', 'Activo']
      );
      organizacion_id = result.insertId;
    } else {
      organizacion_id = orgRows[0].id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO usuarios (organizacion_id, nombre, correo, password, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organizacion_id, nombre, correo, hashedPassword, 'SUPER_ADMIN', 'Activo']
    );

    res.status(201).json({ message: 'SuperAdmin creado exitosamente', correo });
  } catch (error) {
    console.error('Error al crear SuperAdmin:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }
    res.status(500).json({ message: 'Error al crear SuperAdmin: ' + error.message });
  }
};

exports.actualizarSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, estado } = req.body;

    const [user] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ? AND rol = ?',
      [id, 'SUPER_ADMIN']
    );
    if (user.length === 0) {
      return res.status(404).json({ message: 'SuperAdmin no encontrado' });
    }

    if (correo) {
      const [existing] = await pool.query(
        'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
        [correo, id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: 'El correo ya está registrado' });
      }
    }

    await pool.query(
      `UPDATE usuarios SET nombre = ?, correo = ?, estado = ?
       WHERE id = ?`,
      [nombre || user[0].nombre, correo || user[0].correo, estado || user[0].estado, id]
    );

    res.json({ message: 'SuperAdmin actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar SuperAdmin:', error);
    res.status(500).json({ message: 'Error al actualizar SuperAdmin: ' + error.message });
  }
};

exports.eliminarSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_actual = req.usuario_id;

    if (parseInt(id) === usuario_actual) {
      return res.status(400).json({ message: 'No puedes desactivarte a ti mismo' });
    }

    const [user] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ? AND rol = ?',
      [id, 'SUPER_ADMIN']
    );
    if (user.length === 0) {
      return res.status(404).json({ message: 'SuperAdmin no encontrado' });
    }

    await pool.query(
      `UPDATE usuarios SET estado = 'Inactivo' WHERE id = ?`,
      [id]
    );

    res.json({ message: 'SuperAdmin desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar SuperAdmin:', error);
    res.status(500).json({ message: 'Error al desactivar SuperAdmin: ' + error.message });
  }
};

// ============================================================
// 4. DASHBOARD SUPERADMIN
// ============================================================

exports.obtenerDashboardSuperAdmin = async (req, res) => {
  try {
    const { periodo = 'mes', anio, mes } = req.query;
    
    // Determinar año y mes (si no se envían, usar el actual)
    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;
    const anioSeleccionado = anio ? parseInt(anio) : añoActual;
    const mesSeleccionado = mes ? parseInt(mes) : mesActual;

    // Determinar rango de fechas según el periodo
    let fechaInicio;
    let fechaFin = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
    let labelPeriodo = '';
    let periodoAnteriorInicio; // para comparaciones
    let periodoAnteriorFin;

    switch (periodo) {
      case '6meses':
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 1);
        fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0); // último día del mes seleccionado
        labelPeriodo = `Últimos 6 meses (${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()})`;
        // Periodo anterior para comparación: 6 meses antes
        periodoAnteriorInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 12, 1);
        periodoAnteriorFin = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 0);
        break;
      case 'trimestre':
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 3, 1);
        fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);
        labelPeriodo = `Último trimestre (${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()})`;
        periodoAnteriorInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 1);
        periodoAnteriorFin = new Date(anioSeleccionado, mesSeleccionado - 1 - 3, 0);
        break;
      case 'anual':
        fechaInicio = new Date(anioSeleccionado, 0, 1);
        fechaFin = new Date(anioSeleccionado, 11, 31);
        labelPeriodo = `Año ${anioSeleccionado}`;
        periodoAnteriorInicio = new Date(anioSeleccionado - 1, 0, 1);
        periodoAnteriorFin = new Date(anioSeleccionado - 1, 11, 31);
        break;
      case 'mes':
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
        fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);
        labelPeriodo = `Mes ${mesSeleccionado}/${anioSeleccionado}`;
        // Para mes, comparación con el mes anterior
        let mesAnterior = mesSeleccionado - 1;
        let anioAnterior = anioSeleccionado;
        if (mesAnterior === 0) { mesAnterior = 12; anioAnterior = anioSeleccionado - 1; }
        periodoAnteriorInicio = new Date(anioAnterior, mesAnterior - 1, 1);
        periodoAnteriorFin = new Date(anioAnterior, mesAnterior, 0);
        break;
      default:
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 1);
        labelPeriodo = `Últimos 6 meses`;
        periodoAnteriorInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 12, 1);
        periodoAnteriorFin = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 0);
    }

    // ============================
    // 1. KPIs para el periodo actual
    // ============================

    // 1.1 Ventas totales en el periodo
    const [ventasPeriodo] = await pool.query(
      `SELECT SUM(total_pagar) AS total 
      FROM facturas 
      WHERE estado = 'Pagada'
        AND eliminado_en IS NULL
        AND creado_en >= ? AND creado_en <= ?`,
      [fechaInicio, fechaFin]
    );
    const totalVentasPeriodo = parseFloat(ventasPeriodo[0].total) || 0;

    // 1.2 Cuentas por cobrar (SIEMPRE GLOBAL: todas las facturas EMITIDAS sin importar el periodo)
    const [cuentasCobrar] = await pool.query(
      `SELECT SUM(total_pagar) AS total 
       FROM facturas 
       WHERE estado = 'Emitida' AND eliminado_en IS NULL`
    );
    const totalCuentasCobrar = parseFloat(cuentasCobrar[0].total) || 0;

    // 1.3 Organizaciones activas e inactivas
    const [orgActivas] = await pool.query(
      `SELECT COUNT(*) AS count FROM organizaciones WHERE estado = 'Activo' AND nombre_empresa != 'SuperAdmin'`
    );
    const totalOrganizacionesActivas = parseInt(orgActivas[0].count) || 0;

    const [orgInactivas] = await pool.query(
      `SELECT COUNT(*) AS count FROM organizaciones WHERE estado = 'Inactivo' AND nombre_empresa != 'SuperAdmin'`
    );
    const totalOrganizacionesInactivas = parseInt(orgInactivas[0].count) || 0;

    // 1.4 Total usuarios (excluyendo SUPER_ADMIN)
    const [usuarios] = await pool.query(
      `SELECT COUNT(*) AS count FROM usuarios WHERE rol != 'SUPER_ADMIN'`
    );
    const totalUsuarios = parseInt(usuarios[0].count) || 0;

    // 1.5 Ingresos membresías en el periodo
    const [ingresosMembresias] = await pool.query(
      `SELECT SUM(monto) AS total 
       FROM saas_ingresos_membresias 
       WHERE fecha_pago >= ? AND fecha_pago <= ?`,
      [fechaInicio, fechaFin]
    );
    const totalIngresosMembresias = parseFloat(ingresosMembresias[0].total) || 0;

    // 1.6 Gastos infraestructura en el periodo
    const [gastosInfra] = await pool.query(
      `SELECT SUM(monto) AS total 
       FROM saas_gastos_infraestructura 
       WHERE fecha_gasto >= ? AND fecha_gasto <= ?`,
      [fechaInicio, fechaFin]
    );
    const totalGastosInfra = parseFloat(gastosInfra[0].total) || 0;

    // 1.7 Ventas del mes actual (para mostrar en KPI)
    const [ventasMesActual] = await pool.query(
      `SELECT COUNT(*) AS total
      FROM facturas
      WHERE estado = 'Pagada'
        AND eliminado_en IS NULL
        AND MONTH(creado_en) = ? AND YEAR(creado_en) = ?`,
      [mesSeleccionado, anioSeleccionado]
    );
    const totalVentasMesActual = parseInt(ventasMesActual[0].total) || 0;

    // 1.8 Ingresos del mes actual (para mostrar en KPI)
    const [ingresosMesActual] = await pool.query(
      `SELECT SUM(monto) AS total
       FROM saas_ingresos_membresias
       WHERE MONTH(fecha_pago) = ? AND YEAR(fecha_pago) = ?`,
      [mesSeleccionado, anioSeleccionado]
    );
    const totalIngresosMesActual = parseFloat(ingresosMesActual[0].total) || 0;

    // ============================
    // 2. Comparaciones con periodo anterior (variaciones)
    // ============================

    // 2.1 Ventas en periodo anterior
    const [ventasPeriodoAnterior] = await pool.query(
      `SELECT SUM(total_pagar) AS total 
       FROM facturas 
       WHERE estado IN ('Emitida', 'Pagada') 
         AND eliminado_en IS NULL
         AND creado_en >= ? AND creado_en <= ?`,
      [periodoAnteriorInicio, periodoAnteriorFin]
    );
    const totalVentasPeriodoAnterior = parseFloat(ventasPeriodoAnterior[0].total) || 0;

    const variacionMes = totalVentasPeriodoAnterior > 0
      ? ((totalVentasPeriodo - totalVentasPeriodoAnterior) / totalVentasPeriodoAnterior * 100)
      : 0;

    // 2.2 Ingresos en periodo anterior
    const [ingresosPeriodoAnterior] = await pool.query(
      `SELECT SUM(monto) AS total 
       FROM saas_ingresos_membresias 
       WHERE fecha_pago >= ? AND fecha_pago <= ?`,
      [periodoAnteriorInicio, periodoAnteriorFin]
    );
    const totalIngresosPeriodoAnterior = parseFloat(ingresosPeriodoAnterior[0].total) || 0;

    const variacionIngresos = totalIngresosPeriodoAnterior > 0
      ? ((totalIngresosMembresias - totalIngresosPeriodoAnterior) / totalIngresosPeriodoAnterior * 100)
      : 0;

    // ============================
    // 3. Top 5 organizaciones por facturación (en el periodo)
    // ============================
    const [topOrganizaciones] = await pool.query(
      `SELECT o.id, o.nombre_empresa, 
              COALESCE(SUM(f.total_pagar), 0) AS total_facturado
       FROM organizaciones o
       LEFT JOIN facturas f ON o.id = f.organizacion_id 
         AND f.estado IN ('Emitida', 'Pagada')
         AND f.eliminado_en IS NULL
         AND f.creado_en >= ? AND f.creado_en <= ?
       WHERE o.nombre_empresa != 'SuperAdmin'
       GROUP BY o.id, o.nombre_empresa
       ORDER BY total_facturado DESC
       LIMIT 5`,
      [fechaInicio, fechaFin]
    );

    // ============================
    // 4. DATOS PARA GRÁFICAS (según periodo)
    // ============================

    let datosMensuales = [];
    let datosDiarios = [];

    if (periodo === 'mes') {
      // ----- PERIODO: MES (datos diarios) -----
      const [ventasDiarias] = await pool.query(
        `SELECT DAY(creado_en) AS dia, 
                SUM(total_pagar) AS total_ventas
         FROM facturas
         WHERE estado IN ('Emitida', 'Pagada') 
           AND eliminado_en IS NULL
           AND YEAR(creado_en) = ? AND MONTH(creado_en) = ?
         GROUP BY dia
         ORDER BY dia ASC`,
        [anioSeleccionado, mesSeleccionado]
      );

      const [gastosDiarios] = await pool.query(
        `SELECT DAY(fecha_gasto) AS dia,
                SUM(monto) AS total_gastos
         FROM saas_gastos_infraestructura
         WHERE YEAR(fecha_gasto) = ? AND MONTH(fecha_gasto) = ?
         GROUP BY dia
         ORDER BY dia ASC`,
        [anioSeleccionado, mesSeleccionado]
      );

      // Combinar en un objeto por día (1-31)
      const diasMap = {};
      for (let d = 1; d <= 31; d++) {
        diasMap[d] = { dia: d, ventas: 0, gastos: 0 };
      }
      ventasDiarias.forEach(item => {
        if (diasMap[item.dia]) diasMap[item.dia].ventas = item.total_ventas || 0;
      });
      gastosDiarios.forEach(item => {
        if (diasMap[item.dia]) diasMap[item.dia].gastos = item.total_gastos || 0;
      });
      datosDiarios = Object.values(diasMap).filter(d => d.ventas > 0 || d.gastos > 0);

    } else {
      // ----- PERIODOS: 6 meses, trimestre, anual (datos mensuales) -----
      const [ventasPorMes] = await pool.query(
        `SELECT DATE_FORMAT(creado_en, '%Y-%m') AS mes, 
                SUM(total_pagar) AS total_ventas
         FROM facturas
         WHERE estado IN ('Emitida', 'Pagada') 
           AND eliminado_en IS NULL
           AND creado_en >= ? AND creado_en <= ?
         GROUP BY mes
         ORDER BY mes ASC`,
        [fechaInicio, fechaFin]
      );

      const [gastosPorMes] = await pool.query(
        `SELECT DATE_FORMAT(fecha_gasto, '%Y-%m') AS mes,
                SUM(monto) AS total_gastos
         FROM saas_gastos_infraestructura
         WHERE fecha_gasto >= ? AND fecha_gasto <= ?
         GROUP BY mes
         ORDER BY mes ASC`,
        [fechaInicio, fechaFin]
      );

      // Combinar ventas y gastos por mes
      const mesesMap = {};
      ventasPorMes.forEach(item => {
        mesesMap[item.mes] = { mes: item.mes, ventas: item.total_ventas, gastos: 0 };
      });
      gastosPorMes.forEach(item => {
        if (mesesMap[item.mes]) {
          mesesMap[item.mes].gastos = item.total_gastos;
        } else {
          mesesMap[item.mes] = { mes: item.mes, ventas: 0, gastos: item.total_gastos };
        }
      });
      datosMensuales = Object.values(mesesMap).sort((a, b) => a.mes.localeCompare(b.mes));
    }

    // ============================
    // 5. RESPONDER
    // ============================
    res.json({
      periodo: {
        tipo: periodo,
        label: labelPeriodo,
        anio: anioSeleccionado,
        mes: mesSeleccionado
      },
      kpis: {
        ventasPeriodo: totalVentasPeriodo,
        ventasMes: totalVentasMesActual,
        variacionMes: parseFloat(variacionMes.toFixed(2)),
        cuentasCobrar: totalCuentasCobrar,
        organizacionesActivas: totalOrganizacionesActivas,
        organizacionesInactivas: totalOrganizacionesInactivas,
        totalUsuarios,
        ingresosMembresias: totalIngresosMembresias,
        ingresosMes: totalIngresosMesActual,
        variacionIngresos: parseFloat(variacionIngresos.toFixed(2)),
        gastosInfraestructura: totalGastosInfra
      },
      datosMensuales,
      datosDiarios,
      topOrganizaciones: topOrganizaciones || []
    });
  } catch (error) {
    console.error('Error al obtener dashboard SuperAdmin:', error);
    res.status(500).json({ message: 'Error al obtener dashboard: ' + error.message });
  }
};

// ============================================================
// 5. MEMBRESÍAS Y GASTOS
// ============================================================

exports.registrarPagoMembresia = async (req, res) => {
  try {
    console.log('📌 [PAGO] Iniciando registro de pago (sin factura)');
    console.log('📌 [PAGO] Body:', req.body);

    const { organizacion_id, monto, mes_pagado, anio_pagado } = req.body;

    // Validaciones
    if (!organizacion_id || !monto || !mes_pagado || !anio_pagado) {
      return res.status(400).json({ message: 'Faltan datos del pago' });
    }

    // Insertar ingreso
    await pool.query(
      `INSERT INTO saas_ingresos_membresias 
       (organizacion_id, monto, mes_pagado, anio_pagado)
       VALUES (?, ?, ?, ?)`,
      [organizacion_id, monto, mes_pagado, anio_pagado]
    );
    console.log('✅ [PAGO] Ingreso registrado');

    // Activar organización
    await pool.query(
      `UPDATE organizaciones SET estado = 'Activo' WHERE id = ?`,
      [organizacion_id]
    );
    console.log('✅ [PAGO] Organización activada');

    res.status(201).json({ 
      message: 'Pago registrado y organización activada',
      organizacion_id,
      monto,
      mes: mes_pagado,
      anio: anio_pagado
    });

  } catch (error) {
    console.error('❌ [PAGO] Error:', error);
    res.status(500).json({ 
      message: 'Error al registrar pago', 
      error: error.message 
    });
  }
};

exports.registrarGastoSaaS = async (req, res) => {
  try {
    const { proveedor, monto, descripcion, fecha_gasto } = req.body;

    if (!proveedor || !monto || !fecha_gasto) {
      return res.status(400).json({ message: 'Faltan datos del gasto' });
    }

    await pool.query(
      `INSERT INTO saas_gastos_infraestructura 
       (proveedor, monto, descripcion, fecha_gasto)
       VALUES (?, ?, ?, ?)`,
      [proveedor, monto, descripcion || '', fecha_gasto]
    );

    res.status(201).json({ message: 'Gasto registrado' });
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    res.status(500).json({ message: 'Error al registrar gasto: ' + error.message });
  }
};

exports.obtenerContabilidadSaaS = async (req, res) => {
  try {
    const { anio } = req.query || new Date().getFullYear();

    const [ingresos] = await pool.query(
      `SELECT anio_pagado AS anio, mes_pagado AS mes, SUM(monto) AS total
       FROM saas_ingresos_membresias
       WHERE anio_pagado = ?
       GROUP BY anio_pagado, mes_pagado
       ORDER BY mes ASC`,
      [anio]
    );

    const [gastos] = await pool.query(
      `SELECT YEAR(fecha_gasto) AS anio, MONTH(fecha_gasto) AS mes, SUM(monto) AS total
       FROM saas_gastos_infraestructura
       WHERE YEAR(fecha_gasto) = ?
       GROUP BY YEAR(fecha_gasto), MONTH(fecha_gasto)
       ORDER BY mes ASC`,
      [anio]
    );

    const map = {};
    ingresos.forEach(i => {
      const key = `${i.anio}-${String(i.mes).padStart(2,'0')}`;
      map[key] = { anio: i.anio, mes: i.mes, ingresos: i.total, gastos: 0 };
    });
    gastos.forEach(g => {
      const key = `${g.anio}-${String(g.mes).padStart(2,'0')}`;
      if (map[key]) {
        map[key].gastos = g.total;
      } else {
        map[key] = { anio: g.anio, mes: g.mes, ingresos: 0, gastos: g.total };
      }
    });

    const detalle = Object.values(map).map(item => ({
      ...item,
      utilidad: (item.ingresos || 0) - (item.gastos || 0)
    }));

    const totalIngresos = detalle.reduce((acc, r) => acc + r.ingresos, 0);
    const totalGastos = detalle.reduce((acc, r) => acc + r.gastos, 0);
    const utilidadNeta = totalIngresos - totalGastos;

    res.json({
      detalle,
      totalIngresos,
      totalGastos,
      utilidadNeta
    });
  } catch (error) {
    console.error('Error al obtener contabilidad:', error);
    res.status(500).json({ message: 'Error al obtener contabilidad: ' + error.message });
  }
};

// ============================================================
// 6. CONTABILIDAD DETALLADA
// ============================================================

exports.obtenerContabilidadDetallada = async (req, res) => {
  try {
    const { anio } = req.query || new Date().getFullYear();
    const year = anio || new Date().getFullYear();

    // Ingresos por mes (membresías) con detalle de cada pago
    const [ingresos] = await pool.query(
      `SELECT mes_pagado AS mes, 
              SUM(monto) AS total,
              GROUP_CONCAT(CONCAT('$', monto, ' (', DATE_FORMAT(fecha_pago, '%d/%m/%Y'), ')') SEPARATOR ', ') AS detalle
       FROM saas_ingresos_membresias
       WHERE anio_pagado = ?
       GROUP BY mes_pagado
       ORDER BY mes_pagado ASC`,
      [year]
    );

    // Gastos por mes (infraestructura) con detalle de cada gasto
    const [gastos] = await pool.query(
      `SELECT MONTH(fecha_gasto) AS mes, 
              SUM(monto) AS total,
              GROUP_CONCAT(CONCAT(proveedor, ': $', monto, ' (', DATE_FORMAT(fecha_gasto, '%d/%m/%Y'), ')') SEPARATOR ', ') AS detalle
       FROM saas_gastos_infraestructura
       WHERE YEAR(fecha_gasto) = ?
       GROUP BY MONTH(fecha_gasto)
       ORDER BY mes ASC`,
      [year]
    );

    // Combinar resultados
    const meses = Array.from({ length: 12 }, (_, i) => i + 1);
    const detalle = meses.map(mes => {
      const ingreso = ingresos.find(i => i.mes === mes);
      const gasto = gastos.find(g => g.mes === mes);
      return {
        mes,
        nombre_mes: new Date(year, mes - 1).toLocaleString('es', { month: 'long' }),
        ingresos: ingreso ? parseFloat(ingreso.total) : 0,
        detalle_ingresos: ingreso ? ingreso.detalle : 'Sin ingresos',
        gastos: gasto ? parseFloat(gasto.total) : 0,
        detalle_gastos: gasto ? gasto.detalle : 'Sin gastos',
        utilidad: (ingreso ? parseFloat(ingreso.total) : 0) - (gasto ? parseFloat(gasto.total) : 0)
      };
    });

    const totalIngresos = detalle.reduce((acc, m) => acc + m.ingresos, 0);
    const totalGastos = detalle.reduce((acc, m) => acc + m.gastos, 0);

    res.json({
      detalle,
      totales: {
        ingresos: totalIngresos,
        gastos: totalGastos,
        utilidad: totalIngresos - totalGastos
      },
      anio: year
    });
  } catch (error) {
    console.error('Error al obtener contabilidad detallada:', error);
    res.status(500).json({ message: 'Error al obtener contabilidad: ' + error.message });
  }
};

// ============================================================
// 7. FACTURAS POR ORGANIZACIÓN
// ============================================================

exports.obtenerFacturasPorOrganizacion = async (req, res) => {
  try {
    const { organizacion_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const estado = req.query.estado; // nuevo filtro opcional

    let sql = 'SELECT COUNT(*) AS total FROM facturas WHERE organizacion_id = ? AND eliminado_en IS NULL';
    let params = [organizacion_id];
    if (estado) {
      sql += ' AND estado = ?';
      params.push(estado);
    }
    const [totalRows] = await pool.query(sql, params);
    const total = totalRows[0].total;

    let sqlSelect = `
      SELECT f.*, c.nombre AS cliente_nombre, u.nombre AS usuario_nombre
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN usuarios u ON f.usuario_id = u.id
      WHERE f.organizacion_id = ? AND f.eliminado_en IS NULL
    `;
    let selectParams = [organizacion_id];
    if (estado) {
      sqlSelect += ' AND f.estado = ?';
      selectParams.push(estado);
    }
    sqlSelect += ' ORDER BY f.creado_en DESC LIMIT ? OFFSET ?';
    selectParams.push(limit, offset);

    const [rows] = await pool.query(sqlSelect, selectParams);

    res.json({
      facturas: rows,
      paginacion: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener facturas por organización:', error);
    res.status(500).json({ message: 'Error al obtener facturas: ' + error.message });
  }
};

// Obtener todas las facturas EMITIDAS (sin filtrar por organización)
exports.obtenerFacturasEmitidasGlobal = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const organizacion_id = req.query.organizacion_id;
    const mes = req.query.mes;
    const anio = req.query.anio;

    let sqlCount = `
      SELECT COUNT(*) AS total
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN organizaciones o ON f.organizacion_id = o.id
      WHERE f.estado = 'Emitida' AND f.eliminado_en IS NULL
    `;
    let sqlSelect = `
      SELECT f.*, c.nombre AS cliente_nombre, o.nombre_empresa AS organizacion_nombre, o.id AS organizacion_id
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN organizaciones o ON f.organizacion_id = o.id
      WHERE f.estado = 'Emitida' AND f.eliminado_en IS NULL
    `;
    let params = [];
    let whereClauses = [];

    if (organizacion_id) {
      whereClauses.push('f.organizacion_id = ?');
      params.push(parseInt(organizacion_id));
    }
    if (mes && anio) {
      whereClauses.push('MONTH(f.creado_en) = ? AND YEAR(f.creado_en) = ?');
      params.push(parseInt(mes), parseInt(anio));
    } else if (anio) {
      whereClauses.push('YEAR(f.creado_en) = ?');
      params.push(parseInt(anio));
    }

    if (whereClauses.length > 0) {
      const whereStr = ' AND ' + whereClauses.join(' AND ');
      sqlCount += whereStr;
      sqlSelect += whereStr;
    }

    // Obtener total
    const [totalRows] = await pool.query(sqlCount, params);
    const total = totalRows[0].total;

    // Obtener datos paginados
    sqlSelect += ' ORDER BY f.creado_en DESC LIMIT ? OFFSET ?';
    const selectParams = [...params, limit, offset];
    const [rows] = await pool.query(sqlSelect, selectParams);

    res.json({
      facturas: rows,
      paginacion: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener facturas emitidas globales:', error);
    res.status(500).json({ message: 'Error al obtener facturas emitidas: ' + error.message });
  }
};

// ============================================================
// 8. GENERAR FACTURA DE MEMBRESÍA
// ============================================================

exports.generarFacturaMembresia = async (req, res) => {
  try {

    const { organizacion_id, detalles } = req.body;

    // ========== 1. VALIDACIONES BÁSICAS ==========
    if (!organizacion_id) {
      return res.status(400).json({ message: 'organizacion_id es obligatorio' });
    }
    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ message: 'Debe enviar al menos un concepto/producto' });
    }

    // ========== 2. BUSCAR ORGANIZACIÓN ==========
    const [org] = await pool.query(
      'SELECT id, nombre_empresa, nit FROM organizaciones WHERE id = ?',
      [organizacion_id]
    );
    if (org.length === 0) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }
    console.log('✅ [FACTURA] Organización encontrada:', org[0]);

    // ========== 3. BUSCAR/CREAR CLIENTE (con ON DUPLICATE KEY) ==========
    const nitCliente = org[0].nit || `MEM-${organizacion_id}`;
    const nombreCliente = org[0].nombre_empresa || 'CLIENTE MEMBRESÍA';

    let cliente_id;
    try {
      const [result] = await pool.query(
        `INSERT INTO clientes (organizacion_id, nombre, nit, tipo_contribuyente)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
        [organizacion_id, nombreCliente, nitCliente, 'Exento']
      );

      if (result.insertId) {
        cliente_id = result.insertId;
      } else {
        const [existing] = await pool.query(
          'SELECT id FROM clientes WHERE organizacion_id = ? AND nit = ?',
          [organizacion_id, nitCliente]
        );
        if (existing.length > 0) {
          cliente_id = existing[0].id;
          console.log('✅ [FACTURA] Cliente recuperado, ID:', cliente_id);
        } else {
          throw new Error('No se pudo recuperar el cliente después del duplicado');
        }
      }
    } catch (error) {
      console.error('❌ [FACTURA] Error al insertar/recuperar cliente:', error);
      return res.status(500).json({
        message: 'Error al crear/recuperar cliente',
        detalle: error.message
      });
    }

    // ========== 4. OBTENER USUARIO ADMIN ==========
    const [admin] = await pool.query(
      'SELECT id FROM usuarios WHERE organizacion_id = ? AND rol = "Admin" LIMIT 1',
      [organizacion_id]
    );
    const usuario_id = admin.length > 0 ? admin[0].id : 1;
    console.log('📌 [FACTURA] Usuario admin ID:', usuario_id);

    // ========== 5. VALIDAR PRODUCTOS Y CALCULAR TOTALES ==========
    let subtotal = 0;
    const detallesValidos = [];

    for (const detalle of detalles) {
      const { producto_id, cantidad, precio_unitario } = detalle;
      if (!producto_id || !cantidad || cantidad <= 0) {
        return res.status(400).json({ message: 'Cada detalle debe tener producto_id y cantidad > 0' });
      }

      // Verificar que el producto exista
      const [producto] = await pool.query(
        'SELECT id, nombre, precio_unitario FROM productos WHERE id = ?',
        [producto_id]
      );
      if (producto.length === 0) {
        return res.status(400).json({ message: `Producto con ID ${producto_id} no encontrado` });
      }

      // Usar el precio del producto si no se envió
      const precio = precio_unitario || producto[0].precio_unitario;
      const subtotalItem = precio * cantidad;
      subtotal += subtotalItem;

      detallesValidos.push({
        producto_id,
        cantidad,
        precio_unitario: precio,
        subtotal: subtotalItem,
        iva: subtotalItem * 0.13,
      });
    }

    // ========== 6. GENERAR NÚMERO CORRELATIVO ==========
    const [count] = await pool.query(
      `SELECT COUNT(*) AS total FROM facturas 
       WHERE organizacion_id = ? AND numero_correlativo LIKE 'MEM-%'`,
      [organizacion_id]
    );
    const numero = `MEM-${String(count[0].total + 1).padStart(6, '0')}`;
    console.log('📌 [FACTURA] Número correlativo:', numero);

    // ========== 7. CALCULAR IVA Y TOTAL ==========
    const ivaTotal = subtotal * 0.13;
    const total = subtotal + ivaTotal;

    // ========== 8. INSERTAR FACTURA (ESTADO EMITIDA) ==========
    const [facturaResult] = await pool.query(
      `INSERT INTO facturas 
       (organizacion_id, usuario_id, cliente_id, tipo_documento, numero_correlativo,
        subtotal_sumas, descuento, iva_13, retencion_1, percepcion_1, intereses_mora, total_pagar, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizacion_id,
        usuario_id,
        cliente_id,
        'FAF',
        numero,
        subtotal,
        0,
        ivaTotal,
        0,
        0,
        0,
        total,
        'Emitida'
      ]
    );
    const factura_id = facturaResult.insertId;

    // ========== 9. INSERTAR DETALLES DE FACTURA ==========
    const detalleModel = require('../models/DetalleFactura');
    await detalleModel.createMany(factura_id, detallesValidos);

    // ========== 10. ACTIVAR ORGANIZACIÓN ==========
    await pool.query(
      'UPDATE organizaciones SET estado = ? WHERE id = ?',
      ['Activo', organizacion_id]
    );
    console.log('✅ [FACTURA] Organización activada');

    // ========== 11. NO REGISTRAR INGRESO (se hará al pagar) ==========
    // Eliminado el INSERT en saas_ingresos_membresias

    // ========== 12. RESPONDER ==========
    res.status(201).json({
      message: 'Factura de membresía generada exitosamente',
      numero_correlativo: numero,
      total: total,
      factura_id: factura_id,
      cliente_id: cliente_id,
      fecha: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [FACTURA] Error en generarFacturaMembresia:', error);
    res.status(500).json({
      message: 'Error al generar factura de membresía',
      error: error.message,
      sqlError: error.sqlMessage || null
    });
  }
};

// ============================================================
// 9. GESTIÓN DE FACTURAS PARA SUPERADMIN (sin filtro de organización)
// ============================================================

// Descargar PDF de cualquier factura (para SuperAdmin)
exports.descargarPDFFactura = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener factura con datos del cliente y organización
    const [facturaRows] = await pool.query(
      `SELECT f.*, 
              c.nombre AS cliente_nombre, c.nit AS cliente_nit, 
              c.nrc AS cliente_nrc, c.dui AS cliente_dui, 
              c.direccion AS cliente_direccion,
              c.telefono AS cliente_telefono, c.correo AS cliente_correo,
              u.nombre AS usuario_nombre, 
              o.nombre_empresa AS organizacion_nombre,
              o.direccion AS organizacion_direccion,
              o.telefono AS organizacion_telefono,
              o.nit AS organizacion_nit,
              o.nrc AS organizacion_nrc
       FROM facturas f
       JOIN clientes c ON f.cliente_id = c.id
       JOIN usuarios u ON f.usuario_id = u.id
       JOIN organizaciones o ON f.organizacion_id = o.id
       WHERE f.id = ? AND f.eliminado_en IS NULL`,
      [id]
    );

    if (facturaRows.length === 0) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const factura = facturaRows[0];

    // 2. Obtener detalles de la factura (productos)
    const detalleModel = require('../models/DetalleFactura');
    const detalles = await detalleModel.findByFacturaId(id);

    // 3. Obtener configuración del SaaS (emisor)
    const [configRows] = await pool.query(
      'SELECT * FROM configuracion_saas WHERE id = 1'
    );
    const config = configRows.length > 0 ? configRows[0] : {
      nombre_empresa: 'Mi SaaS de Facturación S.A. de C.V.',
      nit: '0614-000000-000-0',
      nrc: '123456-7',
      direccion: 'San Salvador, El Salvador',
      telefono: '2222-0000',
      correo: 'info@misaas.com',
      logo_url: ''
    };

    // 4. Generar PDF con PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura_${factura.numero_correlativo}.pdf`);
      res.send(pdfData);
    });

    // ============================================================
    // DISEÑO DEL PDF REPARADO (TUS COLORES ORIGINALES)
    // ============================================================

    const primaryColor = '#1a1a2e';
    const textColor = '#333333';
    const lightGray = '#f5f5f5';
    const borderColor = '#dddddd';

    // ---------- ENCABEZADO ----------
    if (config.logo_url) {
      try {
        doc.image(config.logo_url, 40, 40, { width: 80 });
      } catch (e) {
        // Continuar si no hay logo válido
      }
    }

    // Título principal
    doc.font('Helvetica-Bold').fontSize(24).fillColor(primaryColor);
    doc.text('FACTURA', 40, 40, { align: 'right' });
    doc.fontSize(10).fillColor('#666666');
    doc.text(`N° ${factura.numero_correlativo}`, 40, doc.y - 5, { align: 'right' });
    
    // CORRECCIÓN: "Fecha de Creación" con el campo 'creado_en'
    const fechaFormateada = new Date(factura.creado_en).toLocaleDateString('es-SV');
    doc.text(`Fecha de Creación: ${fechaFormateada}`, { align: 'right' });

    // ---------- DATOS DEL EMISOR ----------
    doc.moveDown(2);
    const emisorTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
    doc.text('EMISOR', 40, emisorTop);
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    doc.text(config.nombre_empresa.toUpperCase());
    doc.text(`NIT: ${config.nit}`);
    if (config.nrc) doc.text(`NRC: ${config.nrc}`);
    if (config.direccion) doc.text(config.direccion);
    if (config.telefono) doc.text(`Tel: ${config.telefono}`);
    if (config.correo) doc.text(`Email: ${config.correo}`);

    // ---------- DATOS DEL RECEPTOR ----------
    doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
    doc.text('RECEPTOR', 300, emisorTop);
    doc.font('Helvetica').fontSize(9).fillColor('#555555');
    doc.text(factura.cliente_nombre.toUpperCase(), 300, doc.y);
    if (factura.cliente_nit) doc.text(`NIT: ${factura.cliente_nit}`);
    if (factura.cliente_dui) doc.text(`DUI: ${factura.cliente_dui}`);
    if (factura.cliente_direccion) doc.text(factura.cliente_direccion);
    if (factura.cliente_telefono) doc.text(`Tel: ${factura.cliente_telefono}`);
    if (factura.cliente_correo) doc.text(`Email: ${factura.cliente_correo}`);

    doc.moveDown(2);

    // ---------- TABLA DE PRODUCTOS (ARREGLO DE ANCHOS PARA EVITAR MONTÓN) ----------
    const tableTop = doc.y + 10;
    
    // Rediseñamos los márgenes de las columnas para darle 75px limpios al TOTAL y subtotal
    const colX = [40, 80, 290, 365, 440, 500]; 
    const colWidths = [40, 210, 75, 75, 60, 55];

    // Cabecera de la tabla (Fondo oscuro original)
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    doc.rect(40, tableTop, 515, 20).fill(primaryColor);
    doc.fillColor('#ffffff');
    doc.text('CANT.', colX[0] + 5, tableTop + 5);
    doc.text('DESCRIPCIÓN', colX[1] + 10, tableTop + 5);
    doc.text('PRECIO UNIT.', colX[2], tableTop + 5, { width: colWidths[2], align: 'right' });
    doc.text('SUBTOTAL', colX[3], tableTop + 5, { width: colWidths[3], align: 'right' });
    doc.text('IVA', colX[4], tableTop + 5, { width: colWidths[4], align: 'right' });
    doc.text('TOTAL', colX[5], tableTop + 5, { width: colWidths[5], align: 'right' });

    // Filas de productos
    doc.fillColor('#333333');
    let rowY = tableTop + 25;
    let totalSinIva = 0;
    let totalIva = 0;

    detalles.forEach((item, index) => {
      const cantidad = parseInt(item.cantidad) || 0;
      const precio = parseFloat(item.precio_unitario) || 0;
      const subtotal = cantidad * precio;
      const iva = parseFloat(item.iva) || subtotal * 0.13;
      const totalItem = subtotal + iva;

      totalSinIva += subtotal;
      totalIva += iva;

      // Fila con color alterno original
      if (index % 2 === 0) {
        doc.rect(40, rowY - 3, 515, 18).fill(lightGray);
        doc.fillColor('#333333');
      }

      doc.font('Helvetica').fontSize(8.5);
      doc.text(cantidad.toString(), colX[0] + 5, rowY);
      doc.text(item.producto_nombre || 'Pago de Membresia', colX[1] + 10, rowY, { width: 200, truncate: true });
      doc.text(`$${precio.toFixed(2)}`, colX[2], rowY, { width: colWidths[2], align: 'right' });
      doc.text(`$${subtotal.toFixed(2)}`, colX[3], rowY, { width: colWidths[3], align: 'right' });
      doc.text(`$${iva.toFixed(2)}`, colX[4], rowY, { width: colWidths[4], align: 'right' });
      doc.text(`$${totalItem.toFixed(2)}`, colX[5], rowY, { width: colWidths[5], align: 'right' });

      rowY += 20;
    });

    // ---------- TOTALES (REPARADOS SIN TEXTO PARADO) ----------
    const totalsY = rowY + 15;
    const totalGeneral = totalSinIva + totalIva;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
    doc.text('Subtotal:', 380, totalsY, { width: 90, align: 'right' });
    doc.text(`$${totalSinIva.toFixed(2)}`, 475, totalsY, { width: 80, align: 'right' });

    doc.text('IVA (13%):', 380, totalsY + 15, { width: 90, align: 'right' });
    doc.text(`$${totalIva.toFixed(2)}`, 475, totalsY + 15, { width: 80, align: 'right' });

    // Bloque azul oscuro del total corregido en anchura
    doc.rect(370, totalsY + 32, 185, 25).fill(primaryColor);
    doc.fillColor('#ffffff');
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('TOTAL', 385, totalsY + 40);
    doc.text(`$${totalGeneral.toFixed(2)}`, 475, totalsY + 40, { width: 75, align: 'right' });

    // ---------- VALOR EN LETRAS ----------
    doc.fillColor('#333333');
    doc.font('Helvetica').fontSize(8.5);
    const centavos = Math.round((totalGeneral % 1) * 100).toString().padStart(2, '0');
    doc.text(`Son: ${numeroALetras(totalGeneral)} DÓLARES CON ${centavos}/100`, 40, totalsY + 80);

    // ---------- NUEVO PIE DE PÁGINA (ESTILO SOLICITADO) ----------
    const footerY = 750; // Posición fija al fondo de la página
    
    // Línea divisoria gris claro
    doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
    
    // Textos del pie actualizados
    doc.fillColor('#9ca3af').fontSize(8);
    doc.text(`Generado automáticamente por: ${factura.usuario_nombre || 'Yadiel'} | Organización Vinculada: ${factura.organizacion_nombre || 'Empresa de prueba01'}`, 40, footerY + 10);
    doc.text('Condición de pago: Contado | Documento emitido de manera electrónica.', 40, footerY + 22);

    doc.end();

  } catch (error) {
    console.error('❌ [descargarPDFFactura] Error:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
};

// Función auxiliar para convertir número a letras
function numeroALetras(num) {
  // Implementación básica (puedes mejorarla)
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const entero = Math.floor(num);
  const centavos = Math.round((num % 1) * 100);

  if (entero === 0) return 'CERO';

  let partes = [];
  const miles = Math.floor(entero / 1000);
  const resto = entero % 1000;

  if (miles > 0) {
    if (miles === 1) partes.push('MIL');
    else partes.push(numeroALetras(miles) + ' MIL');
  }

  if (resto > 0) {
    const c = Math.floor(resto / 100);
    const d = Math.floor((resto % 100) / 10);
    const u = resto % 10;

    let str = '';
    if (c > 0) str += centenas[c] + ' ';
    if (d > 0) str += decenas[d] + ' ';
    if (u > 0) str += unidades[u];

    partes.push(str.trim());
  }

  return partes.join(' ').trim();
}


// Función auxiliar (asegúrate de implementarla o usar un paquete como 'numero-a-letras')
function numberToWords(num) {
  // Aquí deberías colocar la lógica real para convertir.
  // Por ahora, solo retorna el número truncado para el ejemplo
  return Math.floor(num).toString(); 
}

// Cambiar estado de cualquier factura (para SuperAdmin)
exports.cambiarEstadoFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['Borrador', 'Emitida', 'Pagada', 'Anulada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const [facturaRows] = await pool.query(
      'SELECT id, estado, organizacion_id, total_pagar, numero_correlativo FROM facturas WHERE id = ? AND eliminado_en IS NULL',
      [id]
    );
    if (facturaRows.length === 0) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const factura = facturaRows[0];
    const estadoActual = factura.estado;

    if (estadoActual === 'Anulada') {
      return res.status(400).json({ message: 'No se puede modificar una factura anulada' });
    }

    if (estadoActual === estado) {
      return res.status(400).json({ message: `La factura ya está en estado ${estado}` });
    }

    const esMembresia = factura.numero_correlativo.startsWith('MEM-');
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();

    // ========== LÓGICA DE INGRESOS Y CUENTAS POR COBRAR ==========
    let ingresoEliminado = false;
    let ingresoAgregado = false;

    // Emitida → Pagada
    if (estadoActual === 'Emitida' && estado === 'Pagada') {
      if (esMembresia) {
        const [existing] = await pool.query(
          'SELECT id FROM saas_ingresos_membresias WHERE organizacion_id = ? AND mes_pagado = ? AND anio_pagado = ?',
          [factura.organizacion_id, mesActual, anioActual]
        );
        if (existing.length === 0) {
          await pool.query(
            `INSERT INTO saas_ingresos_membresias (organizacion_id, monto, mes_pagado, anio_pagado)
             VALUES (?, ?, ?, ?)`,
            [factura.organizacion_id, factura.total_pagar, mesActual, anioActual]
          );
          ingresoAgregado = true;
        }
      }
    }

    // Pagada → Emitida
    else if (estadoActual === 'Pagada' && estado === 'Emitida') {
      if (esMembresia) {
        const result = await pool.query(
          'DELETE FROM saas_ingresos_membresias WHERE organizacion_id = ? AND mes_pagado = ? AND anio_pagado = ?',
          [factura.organizacion_id, mesActual, anioActual]
        );
        if (result.affectedRows > 0) ingresoEliminado = true;
      }
    }

    // Cualquier estado → Anulada
    else if (estado === 'Anulada') {
      if (estadoActual === 'Pagada' && esMembresia) {
        const result = await pool.query(
          'DELETE FROM saas_ingresos_membresias WHERE organizacion_id = ? AND mes_pagado = ? AND anio_pagado = ?',
          [factura.organizacion_id, mesActual, anioActual]
        );
        if (result.affectedRows > 0) ingresoEliminado = true;
      }
    }

    // ========== ACTUALIZAR ESTADO ==========
    await pool.query(
      'UPDATE facturas SET estado = ? WHERE id = ?',
      [estado, id]
    );

    // ========== OBTENER KPIs ACTUALIZADOS PARA EL FRONTEND ==========
    // Recalcular KPIs para devolverlos en la respuesta
    const [kpis] = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(total_pagar), 0) FROM facturas WHERE estado IN ('Emitida', 'Pagada') AND eliminado_en IS NULL) AS ventasPeriodo,
        (SELECT COUNT(*) FROM facturas WHERE estado = 'Pagada' AND eliminado_en IS NULL) AS ventasMes,
        (SELECT COALESCE(SUM(total_pagar), 0) FROM facturas WHERE estado = 'Emitida' AND eliminado_en IS NULL) AS cuentasCobrar,
        (SELECT COALESCE(SUM(monto), 0) FROM saas_ingresos_membresias) AS ingresosMembresias,
        (SELECT COUNT(*) FROM usuarios WHERE rol != 'SUPER_ADMIN') AS totalUsuarios,
        (SELECT COUNT(*) FROM organizaciones WHERE estado = 'Activo' AND nombre_empresa != 'SuperAdmin') AS organizacionesActivas
    `);

    res.json({
      message: `Factura cambiada a ${estado}`,
      estado_anterior: estadoActual,
      estado_nuevo: estado,
      kpis: kpis[0] || {}
    });

  } catch (error) {
    console.error('❌ [cambiarEstadoFactura] Error:', error);
    res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
  }
};



// Obtener configuración del SaaS
exports.obtenerConfiguracionSaaS = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM configuracion_saas WHERE id = 1');
    res.json(rows[0] || {});
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

// Actualizar configuración del SaaS
exports.actualizarConfiguracionSaaS = async (req, res) => {
  try {
    const { nombre_empresa, nombre_comercial, nit, nrc, direccion, telefono, correo, logo_url } = req.body;
    await pool.query(
      `UPDATE configuracion_saas SET 
        nombre_empresa = ?, nombre_comercial = ?, nit = ?, nrc = ?, 
        direccion = ?, telefono = ?, correo = ?, logo_url = ?
       WHERE id = 1`,
      [nombre_empresa, nombre_comercial, nit, nrc, direccion, telefono, correo, logo_url]
    );
    res.json({ message: 'Configuración actualizada' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ message: 'Error al actualizar configuración' });
  }
};

// ============================================================
// NUEVO: CUENTAS POR COBRAR (facturas emitidas)
// ============================================================
exports.obtenerCuentasCobrar = async (req, res) => {
  try {
    // Total de cuentas por cobrar (facturas EMITIDAS)
    const [totalRows] = await pool.query(
      `SELECT SUM(total_pagar) AS total 
       FROM facturas 
       WHERE estado = 'Emitida' AND eliminado_en IS NULL`
    );
    const total = parseFloat(totalRows[0].total) || 0;

    // Lista de facturas EMITIDAS (no pagadas)
    const [facturas] = await pool.query(
      `SELECT f.id, f.numero_correlativo, f.total_pagar, f.creado_en,
              c.nombre AS cliente_nombre, o.nombre_empresa AS organizacion_nombre
       FROM facturas f
       JOIN clientes c ON f.cliente_id = c.id
       JOIN organizaciones o ON f.organizacion_id = o.id
       WHERE f.estado = 'Emitida' AND f.eliminado_en IS NULL
       ORDER BY f.creado_en ASC`
    );

    res.json({ total, facturas });
  } catch (error) {
    console.error('Error en obtenerCuentasCobrar:', error);
    res.status(500).json({ message: 'Error al obtener cuentas por cobrar: ' + error.message });
  }
};

// ============================================================
// NUEVO: LISTADO DE INGRESOS CON DETALLE
// ============================================================
exports.obtenerDetalleIngresos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const mes = req.query.mes ? parseInt(req.query.mes) : null;
    const anio = req.query.anio ? parseInt(req.query.anio) : null;

    let sqlWhere = 'WHERE 1=1';
    const params = [];

    if (mes && anio) {
      sqlWhere += ' AND mes_pagado = ? AND anio_pagado = ?';
      params.push(mes, anio);
    } else if (anio) {
      sqlWhere += ' AND anio_pagado = ?';
      params.push(anio);
    }

    // Contar total
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM saas_ingresos_membresias ${sqlWhere}`,
      params
    );
    const total = totalRows[0].total || 0;

    // Obtener datos con JOIN para obtener nombre de organización
    const sqlSelect = `
      SELECT 
        i.id,
        i.fecha_pago AS fecha,
        i.monto,
        i.mes_pagado,
        i.anio_pagado,
        i.descripcion,
        i.organizacion_id,
        o.nombre_empresa AS organizacion_nombre,
        CASE 
          WHEN i.organizacion_id IS NULL THEN 'pago_directo'
          ELSE 'factura'
        END AS origen,
        CASE 
          WHEN i.organizacion_id IS NULL THEN 'Pago directo'
          ELSE 'Factura de membresía'
        END AS concepto
      FROM saas_ingresos_membresias i
      LEFT JOIN organizaciones o ON i.organizacion_id = o.id
      ${sqlWhere}
      ORDER BY i.fecha_pago DESC
      LIMIT ? OFFSET ?
    `;

    const selectParams = [...params, limit, offset];
    const [rows] = await pool.query(sqlSelect, selectParams);

    // Formatear respuesta
    const ingresos = rows.map(row => ({
      id: row.id,
      fecha: row.fecha,
      monto: parseFloat(row.monto),
      origen: row.origen,
      concepto: row.concepto,
      organizacion_nombre: row.organizacion_nombre || 'N/A',
      factura_numero: null, // Ya no es necesario porque la factura se registra como ingreso
      mes_pagado: row.mes_pagado,
      anio_pagado: row.anio_pagado,
      descripcion: row.descripcion || null,
    }));

    res.json({
      ingresos,
      paginacion: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ [obtenerDetalleIngresos] Error:', error);
    res.status(500).json({
      message: 'Error al obtener detalle de ingresos',
      error: error.message
    });
  }
};

// Obtener facturas anuladas
exports.obtenerFacturasCanceladas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const organizacion_id = req.query.organizacion_id;
    const mes = req.query.mes;
    const anio = req.query.anio;

    let sqlCount = `
      SELECT COUNT(*) AS total
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN organizaciones o ON f.organizacion_id = o.id
      WHERE f.estado = 'Anulada' AND f.eliminado_en IS NULL
    `;
    let sqlSelect = `
      SELECT f.*, c.nombre AS cliente_nombre, o.nombre_empresa AS organizacion_nombre, o.id AS organizacion_id
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      JOIN organizaciones o ON f.organizacion_id = o.id
      WHERE f.estado = 'Anulada' AND f.eliminado_en IS NULL
    `;
    let params = [];
    let whereClauses = [];

    if (organizacion_id) {
      whereClauses.push('f.organizacion_id = ?');
      params.push(parseInt(organizacion_id));
    }
    if (mes && anio) {
      whereClauses.push('MONTH(f.creado_en) = ? AND YEAR(f.creado_en) = ?');
      params.push(parseInt(mes), parseInt(anio));
    } else if (anio) {
      whereClauses.push('YEAR(f.creado_en) = ?');
      params.push(parseInt(anio));
    }

    if (whereClauses.length > 0) {
      const whereStr = ' AND ' + whereClauses.join(' AND ');
      sqlCount += whereStr;
      sqlSelect += whereStr;
    }

    // Obtener total
    const [totalRows] = await pool.query(sqlCount, params);
    const total = totalRows[0].total;

    // Obtener datos paginados
    sqlSelect += ' ORDER BY f.creado_en DESC LIMIT ? OFFSET ?';
    const selectParams = [...params, limit, offset];
    const [rows] = await pool.query(sqlSelect, selectParams);

    res.json({
      facturas: rows,
      paginacion: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error en obtenerFacturasCanceladas:', error);
    res.status(500).json({ message: 'Error al obtener facturas canceladas: ' + error.message });
  }
};
// ============================================================
// NUEVO: LISTADO DE GASTOS CON DETALLE
// ============================================================
exports.obtenerDetalleGastos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const mes = req.query.mes;
    const anio = req.query.anio;

    let sqlCount = 'SELECT COUNT(*) AS total FROM saas_gastos_infraestructura';
    let sqlSelect = `
      SELECT id, proveedor, monto, descripcion, fecha_gasto AS fecha
      FROM saas_gastos_infraestructura
    `;
    let whereClauses = [];
    let params = [];

    if (mes && anio) {
      whereClauses.push('MONTH(fecha_gasto) = ? AND YEAR(fecha_gasto) = ?');
      params.push(parseInt(mes), parseInt(anio));
    } else if (anio) {
      whereClauses.push('YEAR(fecha_gasto) = ?');
      params.push(parseInt(anio));
    }

    if (whereClauses.length > 0) {
      const whereStr = ' WHERE ' + whereClauses.join(' AND ');
      sqlCount += whereStr;
      sqlSelect += whereStr;
    }

    // Obtener total
    const [totalRows] = await pool.query(sqlCount, params);
    const total = totalRows[0].total;

    // Obtener datos paginados
    sqlSelect += ' ORDER BY fecha_gasto DESC LIMIT ? OFFSET ?';
    const selectParams = [...params, limit, offset];
    const [rows] = await pool.query(sqlSelect, selectParams);

    res.json({
      gastos: rows,
      paginacion: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error en obtenerDetalleGastos:', error);
    res.status(500).json({ message: 'Error al obtener detalle de gastos: ' + error.message });
  }
};

// ============================================================
// MODIFICAR: Cambiar estado de factura (registrar ingreso al pagar)
// ============================================================
exports.cambiarEstadoFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['Borrador', 'Emitida', 'Pagada', 'Anulada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    // Verificar que la factura exista
    const [facturaRows] = await pool.query(
      'SELECT id, estado, organizacion_id, total_pagar FROM facturas WHERE id = ? AND eliminado_en IS NULL',
      [id]
    );
    if (facturaRows.length === 0) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const factura = facturaRows[0];

    // Si ya está anulada, no se puede cambiar
    if (factura.estado === 'Anulada') {
      return res.status(400).json({ message: 'No se puede modificar una factura anulada' });
    }

    // Si cambia de Emitida a Pagada, registrar ingreso
    if (factura.estado === 'Emitida' && estado === 'Pagada') {
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();
      await pool.query(
        `INSERT INTO saas_ingresos_membresias (organizacion_id, monto, mes_pagado, anio_pagado)
         VALUES (?, ?, ?, ?)`,
        [factura.organizacion_id, factura.total_pagar, mesActual, anioActual]
      );
    }

    // Si cambia de Pagada a Emitida, eliminar el ingreso (o marcarlo)
    if (factura.estado === 'Pagada' && estado === 'Emitida') {
      // Eliminar el último ingreso asociado (por simplicidad, eliminamos el más reciente para esa organización en el mes actual)
      await pool.query(
        `DELETE FROM saas_ingresos_membresias 
         WHERE organizacion_id = ? 
         AND MONTH(fecha_pago) = MONTH(CURRENT_DATE()) 
         AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())
         ORDER BY fecha_pago DESC LIMIT 1`,
        [factura.organizacion_id]
      );
    }

    await pool.query(
      'UPDATE facturas SET estado = ? WHERE id = ?',
      [estado, id]
    );

    res.json({ message: `Factura cambiada a ${estado}` });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ message: 'Error al cambiar estado: ' + error.message });
  }
};

exports.cancelarFactura = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la factura actual
    const [facturaRows] = await pool.query(
      'SELECT id, estado, organizacion_id, total_pagar, numero_correlativo FROM facturas WHERE id = ? AND eliminado_en IS NULL',
      [id]
    );
    if (facturaRows.length === 0) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    const factura = facturaRows[0];

    // Si ya está anulada, no hacer nada
    if (factura.estado === 'Anulada') {
      return res.status(400).json({ message: 'La factura ya está anulada' });
    }

    // Si estaba Pagada, eliminar el ingreso correspondiente
    if (factura.estado === 'Pagada') {
      await pool.query(
        'DELETE FROM saas_ingresos_membresias WHERE organizacion_id = ? AND MONTH(fecha_pago) = MONTH(CURRENT_DATE()) AND YEAR(fecha_pago) = YEAR(CURRENT_DATE()) AND monto = ?',
        [factura.organizacion_id, factura.total_pagar]
      );
    }

    // Cambiar estado a Anulada
    await pool.query(
      'UPDATE facturas SET estado = ? WHERE id = ?',
      ['Anulada', id]
    );

    res.json({ 
      message: `Factura ${factura.numero_correlativo} anulada correctamente`,
      factura_id: id
    });
  } catch (error) {
    console.error('Error al cancelar factura:', error);
    res.status(500).json({ message: 'Error al cancelar factura: ' + error.message });
  }
};

exports.cancelarGasto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el gasto exista
    const [gastoRows] = await pool.query(
      'SELECT id FROM saas_gastos_infraestructura WHERE id = ?',
      [id]
    );
    if (gastoRows.length === 0) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }

    // Eliminar el gasto
    await pool.query(
      'DELETE FROM saas_gastos_infraestructura WHERE id = ?',
      [id]
    );

    res.json({ message: 'Gasto cancelado correctamente' });
  } catch (error) {
    console.error('Error al cancelar gasto:', error);
    res.status(500).json({ message: 'Error al cancelar gasto: ' + error.message });
  }
};

// eliminar ingreso
exports.eliminarIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    // Verificar que el ingreso exista y sea un pago directo (no asociado a factura)
    const [ingreso] = await pool.query(
      'SELECT id, organizacion_id FROM saas_ingresos_membresias WHERE id = ?',
      [id]
    );
    if (ingreso.length === 0) {
      return res.status(404).json({ message: 'Ingreso no encontrado' });
    }
    // Eliminar el ingreso
    await pool.query('DELETE FROM saas_ingresos_membresias WHERE id = ?', [id]);
    res.json({ message: 'Ingreso eliminado' });
  } catch (error) {
    console.error('Error al eliminar ingreso:', error);
    res.status(500).json({ message: 'Error al eliminar ingreso', error: error.message });
  }
};

// Añadir esta función al controlador
exports.subirLogoOrganizacion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await pool.query(
      'UPDATE organizaciones SET logo_url = ? WHERE id = ? AND nombre_empresa != "SuperAdmin"',
      [logoUrl, id]
    );
    res.json({ message: 'Logo actualizado', logoUrl });
  } catch (error) {
    console.error('Error al subir logo:', error);
    res.status(500).json({ message: 'Error al subir logo' });
  }
};

exports.obtenerPlanes = async (req, res) => {
  try {
    const planes = await Plan.findAll();
    res.json(planes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener planes' });
  }
};

exports.asignarPlanOrganizacion = async (req, res) => {
  const { id } = req.params;
  const { plan_id } = req.body;
  const usuario_id = req.usuario_id;

  try {
    // Obtener plan actual
    const [org] = await pool.query('SELECT plan_id FROM organizaciones WHERE id = ?', [id]);
    const planAnterior = org[0]?.plan_id;

    await pool.query(
      'UPDATE organizaciones SET plan_id = ?, fecha_inicio_plan = CURDATE() WHERE id = ?',
      [plan_id, id]
    );

    // Registrar historial
    if (planAnterior && planAnterior !== plan_id) {
      await pool.query(
        `INSERT INTO historial_cambios_plan (organizacion_id, plan_anterior_id, plan_nuevo_id, usuario_id)
         VALUES (?, ?, ?, ?)`,
        [id, planAnterior, plan_id, usuario_id]
      );
    }

    res.json({ message: 'Plan actualizado' });
  } catch (error) {
    console.error('Error al asignar plan:', error);
    res.status(500).json({ message: 'Error al asignar plan' });
  }
};

exports.obtenerConsumoMensual = async (req, res) => {
  const { id } = req.params;
  const { mes, anio } = req.query;
  const mesActual = mes || new Date().getMonth() + 1;
  const anioActual = anio || new Date().getFullYear();

  try {
    // Obtener plan de la organización
    const [org] = await pool.query(
      `SELECT o.plan_id, p.limite_facturas_mensuales, p.limite_whatsapp_mensual 
       FROM organizaciones o 
       JOIN planes p ON o.plan_id = p.id 
       WHERE o.id = ?`,
      [id]
    );

    // Obtener consumo actual
    let [consumo] = await pool.query(
      `SELECT facturas_generadas, whatsapp_enviados 
       FROM consumo_mensual_organizacion 
       WHERE organizacion_id = ? AND mes = ? AND anio = ?`,
      [id, mesActual, anioActual]
    );

    if (!consumo || consumo.length === 0) {
      consumo = { facturas_generadas: 0, whatsapp_enviados: 0 };
    } else {
      consumo = consumo[0];
    }

    res.json({
      plan: org[0],
      consumo,
      restantes: {
        facturas: Math.max(0, org[0].limite_facturas_mensuales - consumo.facturas_generadas),
        whatsapp: Math.max(0, org[0].limite_whatsapp_mensual - consumo.whatsapp_enviados),
      }
    });
  } catch (error) {
    console.error('Error al obtener consumo:', error);
    res.status(500).json({ message: 'Error al obtener consumo' });
  }
};

exports.obtenerConsumoGlobal = async (req, res) => {
  try {
    const { anio } = req.query;
    const year = anio || new Date().getFullYear();

    const [rows] = await pool.query(`
      SELECT 
        o.id AS organizacion_id,
        o.nombre_empresa,
        c.mes,
        c.anio,
        c.facturas_generadas,
        c.whatsapp_enviados,
        p.limite_facturas_mensuales,
        p.limite_whatsapp_mensual
      FROM consumo_mensual_organizacion c
      JOIN organizaciones o ON c.organizacion_id = o.id
      JOIN planes p ON o.plan_id = p.id
      WHERE c.anio = ?
      ORDER BY o.id, c.mes
    `, [year]);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener consumo global:', error);
    res.status(500).json({ message: 'Error al obtener consumo' });
  }
};

exports.obtenerPlanes = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM planes WHERE activo = 1 ORDER BY precio');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener planes' });
  }
};
