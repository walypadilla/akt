// backend/src/controllers/superAdminController.js
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const Factura = require('../models/Factura');
const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table'); // Para usar el método de PDF (opcional)

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
      password_admin
    } = req.body;

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

    // Insertar organización con todos los campos
    const [orgResult] = await pool.query(
      `INSERT INTO organizaciones 
       (nombre_empresa, nombre_comercial, direccion, telefono, telefono_whatsapp, 
        nit, nrc, tipo_contribuyente, tipo_organizacion, ambiente, token_mh, llave_privada_p12, logo_url, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre_empresa.trim(),
        nombre_comercial ? nombre_comercial.trim() : '',
        direccion ? direccion.trim() : '',
        telefono ? telefono.trim() : '',
        telefono_whatsapp ? telefono_whatsapp.trim() : '',
        nit.trim(),
        nrc ? nrc.trim() : '',
        tipo_contribuyente,
        tipo_organizacion || 'Empresa Comercial',
        ambiente || 'Pruebas',
        token_mh || null,
        llave_privada_p12 || null,
        logo_url ? logo_url.trim() : '',
        'Activo'
      ]
    );
    const organizacion_id = orgResult.insertId;

    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash(password_admin, 10);
    await pool.query(
      `INSERT INTO usuarios (organizacion_id, nombre, correo, password, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        organizacion_id,
        nombre_admin ? nombre_admin.trim() : 'Administrador',
        correo_admin.trim(),
        hashedPassword,
        'Admin',
        'Activo'
      ]
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
      logo_url
    } = req.body;

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

    await pool.query(
      `UPDATE organizaciones SET
        nombre_empresa = ?, nombre_comercial = ?, direccion = ?, 
        telefono = ?, telefono_whatsapp = ?, nit = ?, nrc = ?,
        tipo_contribuyente = ?, tipo_organizacion = ?, ambiente = ?,
        token_mh = ?, llave_privada_p12 = ?, logo_url = ?
       WHERE id = ?`,
      [
        nombre_empresa ? nombre_empresa.trim() : '',
        nombre_comercial ? nombre_comercial.trim() : '',
        direccion ? direccion.trim() : '',
        telefono ? telefono.trim() : '',
        telefono_whatsapp ? telefono_whatsapp.trim() : '',
        nit ? nit.trim() : '',
        nrc ? nrc.trim() : '',
        tipo_contribuyente || 'Pequeño',
        tipo_organizacion || 'Empresa Comercial',
        ambiente || 'Pruebas',
        token_mh || null,
        llave_privada_p12 || null,
        logo_url ? logo_url.trim() : '',
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
    const [rows] = await pool.query(
      `SELECT id, nombre, correo, rol, estado, 
              DATE_FORMAT(creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en
       FROM usuarios 
       WHERE organizacion_id = ? AND rol != 'SUPER_ADMIN'
       ORDER BY creado_en DESC`,
      [organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios: ' + error.message });
  }
};

exports.crearUsuarioOrganizacion = async (req, res) => {
  try {
    const { organizacion_id } = req.params;
    const { nombre, correo, rol, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ? AND organizacion_id = ?',
      [correo, organizacion_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado para esta organización' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO usuarios (organizacion_id, nombre, correo, password, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organizacion_id, nombre, correo, hashedPassword, rol || 'Vendedor', 'Activo']
    );

    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }
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

    const [user] = await pool.query(
      'SELECT id, organizacion_id, rol FROM usuarios WHERE id = ?',
      [id]
    );
    if (user.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (user[0].rol === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No se puede modificar un SuperAdmin desde esta sección' });
    }

    if (correo) {
      const [existing] = await pool.query(
        'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
        [correo, id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: 'El correo ya está registrado por otro usuario' });
      }
    }

    await pool.query(
      `UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, estado = ?
       WHERE id = ?`,
      [nombre || user[0].nombre, correo || user[0].correo, rol || user[0].rol, estado || user[0].estado, id]
    );

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

    const hashedPassword = await bcrypt.hash(nueva_contraseña, 10);
    await pool.query(
      `UPDATE usuarios SET password = ? WHERE id = ?`,
      [hashedPassword, id]
    );

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
    const temporal = Math.random().toString(36).slice(-8) + '1A!';
    const hashedPassword = await bcrypt.hash(temporal, 10);

    await pool.query(
      `UPDATE usuarios SET password = ? WHERE id = ?`,
      [hashedPassword, id]
    );

    res.json({
      message: 'Contraseña restablecida',
      contraseña_temporal: temporal,
      es_temporal: true,
      sugerencia: 'El usuario deberá cambiar su contraseña en el próximo inicio de sesión'
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
    // 1. Ventas totales (último mes)
    const [ventasMes] = await pool.query(
      `SELECT SUM(total_pagar) AS total 
       FROM facturas 
       WHERE estado IN ('Emitida', 'Pagada') 
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = MONTH(CURRENT_DATE()) 
         AND YEAR(creado_en) = YEAR(CURRENT_DATE())`
    );
    const totalVentasMes = parseFloat(ventasMes[0].total) || 0;

    // 2. Cuentas por cobrar (solo facturas EMITIDAS - no pagadas)
    const [cuentasCobrar] = await pool.query(
      `SELECT SUM(total_pagar) AS total 
      FROM facturas 
      WHERE estado = 'Emitida' AND eliminado_en IS NULL`
    );
    const totalCuentasCobrar = parseFloat(cuentasCobrar[0].total) || 0;

    // 3. Organizaciones activas
    const [orgActivas] = await pool.query(
      `SELECT COUNT(*) AS count FROM organizaciones WHERE estado = 'Activo' AND nombre_empresa != 'SuperAdmin'`
    );
    const totalOrganizacionesActivas = parseInt(orgActivas[0].count) || 0;

    // 4. Organizaciones inactivas
    const [orgInactivas] = await pool.query(
      `SELECT COUNT(*) AS count FROM organizaciones WHERE estado = 'Inactivo' AND nombre_empresa != 'SuperAdmin'`
    );
    const totalOrganizacionesInactivas = parseInt(orgInactivas[0].count) || 0;

    // 5. Total usuarios (excluyendo SUPER_ADMIN)
    const [usuarios] = await pool.query(
      `SELECT COUNT(*) AS count FROM usuarios WHERE rol != 'SUPER_ADMIN'`
    );
    const totalUsuarios = parseInt(usuarios[0].count) || 0;

    // 6. Ingresos membresías (solo facturas PAGADAS)
    const [ingresosMembresias] = await pool.query(
      `SELECT SUM(monto) AS total 
      FROM saas_ingresos_membresias 
      WHERE MONTH(fecha_pago) = MONTH(CURRENT_DATE()) 
        AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())`
    );
    const totalIngresosMembresias = parseFloat(ingresosMembresias[0].total) || 0;

    // 7. Gastos infraestructura
    const [gastosInfra] = await pool.query(
      `SELECT SUM(monto) AS total 
       FROM saas_gastos_infraestructura 
       WHERE MONTH(fecha_gasto) = MONTH(CURRENT_DATE()) 
         AND YEAR(fecha_gasto) = YEAR(CURRENT_DATE())`
    );
    const totalGastosInfra = parseFloat(gastosInfra[0].total) || 0;

    // 8. Ventas por mes (últimos 6 meses)
    const [ventasPorMes] = await pool.query(
      `SELECT DATE_FORMAT(creado_en, '%Y-%m') AS mes, 
              SUM(total_pagar) AS total_ventas
       FROM facturas
       WHERE estado IN ('Emitida', 'Pagada') 
         AND eliminado_en IS NULL
         AND creado_en >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY mes
       ORDER BY mes ASC`
    );

    // 9. Top 5 organizaciones por facturación (este mes)
    const [topOrganizaciones] = await pool.query(
      `SELECT o.id, o.nombre_empresa, 
              COALESCE(SUM(f.total_pagar), 0) AS total_facturado
       FROM organizaciones o
       LEFT JOIN facturas f ON o.id = f.organizacion_id 
         AND f.estado IN ('Emitida', 'Pagada')
         AND f.eliminado_en IS NULL
         AND MONTH(f.creado_en) = MONTH(CURRENT_DATE())
         AND YEAR(f.creado_en) = YEAR(CURRENT_DATE())
       WHERE o.nombre_empresa != 'SuperAdmin'
       GROUP BY o.id, o.nombre_empresa
       ORDER BY total_facturado DESC
       LIMIT 5`
    );

    res.json({
      kpis: {
        ventasMes: totalVentasMes,
        cuentasCobrar: totalCuentasCobrar,
        organizacionesActivas: totalOrganizacionesActivas,
        organizacionesInactivas: totalOrganizacionesInactivas,
        totalUsuarios,
        ingresosMembresias: totalIngresosMembresias,
        gastosInfraestructura: totalGastosInfra
      },
      ventasPorMes: ventasPorMes || [],
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
    const { organizacion_id, monto, mes_pagado, anio_pagado } = req.body;

    if (!organizacion_id || !monto || !mes_pagado || !anio_pagado) {
      return res.status(400).json({ message: 'Faltan datos del pago' });
    }

    await pool.query(
      `INSERT INTO saas_ingresos_membresias 
       (organizacion_id, monto, mes_pagado, anio_pagado)
       VALUES (?, ?, ?, ?)`,
      [organizacion_id, monto, mes_pagado, anio_pagado]
    );

    await pool.query(
      `UPDATE organizaciones SET estado = 'Activo' WHERE id = ?`,
      [organizacion_id]
    );

    res.status(201).json({ message: 'Pago registrado y organización activada' });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'Error al registrar pago: ' + error.message });
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
    const [rows] = await pool.query(
      `SELECT f.*, c.nombre AS cliente_nombre, o.nombre_empresa AS organizacion_nombre
       FROM facturas f
       JOIN clientes c ON f.cliente_id = c.id
       JOIN organizaciones o ON f.organizacion_id = o.id
       WHERE f.estado = 'Emitida' AND f.eliminado_en IS NULL
       ORDER BY f.creado_en DESC`
    );
    res.json(rows);
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
    const { organizacion_id, monto, concepto } = req.body;

    if (!organizacion_id || !monto || monto <= 0) {
      return res.status(400).json({ message: 'Datos incompletos: organizacion_id y monto son obligatorios' });
    }

    const [org] = await pool.query(
      'SELECT id, nombre_empresa, nit FROM organizaciones WHERE id = ?',
      [organizacion_id]
    );
    if (org.length === 0) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }

    let cliente_id;
    const nitCliente = org[0].nit || `MEM-${organizacion_id}`;
    
    const [clienteExistente] = await pool.query(
      'SELECT id FROM clientes WHERE organizacion_id = ? AND nit = ?',
      [organizacion_id, nitCliente]
    );
    
    if (clienteExistente.length > 0) {
      cliente_id = clienteExistente[0].id;
    } else {
      const [result] = await pool.query(
        `INSERT INTO clientes (organizacion_id, nombre, nit, tipo_contribuyente)
         VALUES (?, ?, ?, ?)`,
        [organizacion_id, org[0].nombre_empresa || 'CLIENTE MEMBRESÍA', nitCliente, 'Exento']
      );
      cliente_id = result.insertId;
    }

    const [admin] = await pool.query(
      'SELECT id FROM usuarios WHERE organizacion_id = ? AND rol = "Admin" LIMIT 1',
      [organizacion_id]
    );
    const usuario_id = admin.length > 0 ? admin[0].id : 1;

    const [count] = await pool.query(
      'SELECT COUNT(*) AS total FROM facturas WHERE organizacion_id = ? AND numero_correlativo LIKE "MEM-%"',
      [organizacion_id]
    );
    const numero = `MEM-${String(count[0].total + 1).padStart(6, '0')}`;

    const subtotal = parseFloat(monto);
    const iva = subtotal * 0.13;
    const total = subtotal + iva;

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
        iva,
        0,
        0,
        0,
        total,
        'Emitida'
      ]
    );
    const factura_id = facturaResult.insertId;

    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();

    await pool.query(
      `UPDATE organizaciones SET estado = 'Activo' WHERE id = ?`,
      [organizacion_id]
    );

    res.status(201).json({
      message: 'Factura de membresía generada',
      numero_correlativo: numero,
      total: total,
      factura_id: factura_id
    });
  } catch (error) {
    console.error('Error al generar factura de membresía:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Error de duplicado: ' + error.sqlMessage });
    }
    res.status(500).json({ message: 'Error al generar factura: ' + error.message });
  }
};

// ============================================================
// 9. GESTIÓN DE FACTURAS PARA SUPERADMIN (sin filtro de organización)
// ============================================================

// Descargar PDF de cualquier factura (para SuperAdmin)
exports.descargarPDFFactura = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener factura con datos del cliente y organización (Tu código original)
    const [facturaRows] = await pool.query(
      `SELECT f.*, 
              c.nombre AS cliente_nombre, c.nit AS cliente_nit, 
              c.nrc AS cliente_nrc, c.dui AS cliente_dui, 
              c.direccion AS cliente_direccion,
              c.telefono AS cliente_telefono, c.correo AS cliente_correo,
              u.nombre AS usuario_nombre, 
              o.nombre_empresa AS organizacion_nombre,
              o.direccion AS organizacion_direccion,
              o.telefono AS organizacion_telefono
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

    // 2. Obtener configuración del SaaS (emisor) (Tu código original)
    const [configRows] = await pool.query(
      'SELECT * FROM configuracion_saas WHERE id = 1'
    );
    const config = configRows.length > 0 ? configRows[0] : {
      nombre_empresa: 'Mi SaaS de Facturación S.A. de C.V.',
      nit: '0614-000000-000-0',
      nrc: '123456-7',
      direccion: 'San Salvador, El Salvador',
      telefono: '2222-0000',
      correo: 'info@misaas.com'
    };

    // 3. Generar PDF con diseño profesional (ESTILO DTE EL SALVADOR)
    // Reducimos los márgenes para aprovechar el espacio como en los DTE
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura_${factura.numero_correlativo}.pdf`);
      res.send(pdfData);
    });

    const textColor = '#333333';
    const borderColor = '#cccccc';

    // --- ENCABEZADO DTE ---
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
    doc.text('DOCUMENTO TRIBUTARIO ELECTRÓNICO', { align: 'center' });
    doc.fontSize(14).text('FACTURA', { align: 'center' });
    doc.moveDown(0.5);

    // Simulación de los datos del DTE a la derecha
    const headerRightX = 350;
    let headerY = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).text('Código de Generación:', headerRightX, headerY);
    doc.font('Helvetica').text(factura.codigo_generacion || 'B45AE813-BD3C-4785-AIDC-63670489A172', headerRightX, doc.y);
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').text('Número de Control:', headerRightX, doc.y);
    doc.font('Helvetica').text(factura.numero_control || 'DTE-01-S003P001-000000000003318', headerRightX, doc.y);
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').text('Sello de Recepción:', headerRightX, doc.y);
    doc.font('Helvetica').text(factura.sello_recepcion || '2026A4EA05F4354B498F...', headerRightX, doc.y);
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').text('Fecha y Hora de Generación:', headerRightX, doc.y);
    const fechaGeneracion = new Date(factura.creado_en).toLocaleString('es-SV', { timeZone: 'America/El_Salvador' });
    doc.font('Helvetica').text(fechaGeneracion, headerRightX, doc.y);

    // --- DATOS DEL EMISOR ---
    // Volvemos a la izquierda para el emisor
    doc.y = headerY; 
    doc.font('Helvetica-Bold').fontSize(9).text('Emisor', 30, doc.y);
    doc.font('Helvetica-Bold').fontSize(8).text(config.nombre_empresa.toUpperCase());
    doc.font('Helvetica').fontSize(8);
    doc.text(`NIT: ${config.nit}`);
    if (config.nrc) doc.text(`NRC: ${config.nrc}`);
    if (config.direccion) doc.text(`Dirección: ${config.direccion}`, { width: 300 });
    if (config.telefono) doc.text(`Número de teléfono: ${config.telefono}`);
    if (config.correo) doc.text(`Correo electrónico: ${config.correo}`);
    
    doc.moveDown(1);
    const emisorBottomY = Math.max(doc.y, headerY + 80); // Asegurar espacio

    // Línea separadora
    doc.strokeColor(borderColor).lineWidth(1).moveTo(30, emisorBottomY).lineTo(565, emisorBottomY).stroke();
    doc.y = emisorBottomY + 10;

    // --- DATOS DEL RECEPTOR ---
    doc.font('Helvetica-Bold').fontSize(9).text('Receptor');
    doc.font('Helvetica-Bold').fontSize(8).text((factura.cliente_nombre || 'CONSUMIDOR FINAL').toUpperCase());
    doc.font('Helvetica').fontSize(8);
    
    // Mostramos DUI o NIT según disponibilidad
    if (factura.cliente_dui) {
      doc.text(`Tipo de Documento de Identificación: DUI`);
      doc.text(`Número de Documento de Identificación: ${factura.cliente_dui}`);
    } else if (factura.cliente_nit) {
      doc.text(`Tipo de Documento de Identificación: NIT`);
      doc.text(`Número de Documento de Identificación: ${factura.cliente_nit}`);
    }
    
    if (factura.cliente_direccion) doc.text(`Dirección: ${factura.cliente_direccion}`, { width: 300 });
    if (factura.cliente_correo) doc.text(`Correo electrónico: ${factura.cliente_correo}`);
    if (factura.cliente_telefono) doc.text(`Teléfono: ${factura.cliente_telefono}`);

    doc.moveDown(1);

    // --- TABLA DE PRODUCTOS ---
    const concepto = factura.concepto || 'Membresía';
    const subtotal = parseFloat(factura.subtotal_sumas);
    const iva = parseFloat(factura.iva_13) || 0;
    const total = parseFloat(factura.total_pagar);

    const tableData = {
      headers: ['Nº', 'Código', 'Descripción', 'Cantidad', 'Unidad', 'Precio Unitario', 'Ventas gravadas'],
      rows: [
        [
          '1',
          'MEM-001',
          concepto,
          '1.00',
          'UNIDAD',
          `$${subtotal.toFixed(2)}`,
          `$${subtotal.toFixed(2)}`
        ]
      ]
    };

    const tableOptions = {
      width: 535,
      x: 30,
      y: doc.y,
      columns: [
        { header: 'Nº', width: 25, align: 'center' },
        { header: 'Código', width: 60, align: 'left' },
        { header: 'Descripción', width: 200, align: 'left' },
        { header: 'Cantidad', width: 50, align: 'center' },
        { header: 'Unidad', width: 50, align: 'center' },
        { header: 'Precio Unitario', width: 70, align: 'right' },
        { header: 'Ventas gravadas', width: 80, align: 'right' }
      ],
      padding: 5,
      headerBackgroundColor: '#f3f4f6', // Un gris muy sutil
      headerColor: '#000000',
      borderColor: borderColor,
      borderWidth: 0.5,
      textColor: textColor,
      headerFont: 'Helvetica-Bold',
      headerFontSize: 7,
      font: 'Helvetica',
      fontSize: 7
    };

    doc.table(tableData, tableOptions);
    doc.moveDown(1);

    // --- TOTALES Y VALOR EN LETRAS ---
    const startTotalsY = doc.y;

    // Valor en letras (Izquierda)
    doc.font('Helvetica-Bold').fontSize(8).text('Valor en letras:', 30, startTotalsY);
    const numeroEnLetras = numberToWords(total).toUpperCase(); 
    const centavos = Math.round((total % 1) * 100).toString().padStart(2, '0');
    doc.font('Helvetica').text(`${numeroEnLetras} DÓLARES CON ${centavos}/100`, 30, startTotalsY + 12, { width: 250 });

    // Bloque de Totales (Derecha)
    const totalLabelX = 350;
    const totalValueX = 500;
    let currentY = startTotalsY;

    const addTotalRow = (label, value, isBold = false) => {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      doc.text(label, totalLabelX, currentY, { width: 140, align: 'left' });
      doc.text(`$${parseFloat(value).toFixed(2)}`, totalValueX, currentY, { width: 65, align: 'right' });
      currentY += 12;
    };

    addTotalRow('Suma Total de Operaciones:', subtotal);
    addTotalRow('Monto global Desc. y Rebajas:', factura.descuento || 0);
    addTotalRow('Sub-Total:', subtotal - (factura.descuento || 0));
    
    // Si manejas IVA retenido u otros impuestos, agrégalos aquí
    if (iva > 0) addTotalRow('IVA (13%):', iva);
    if (parseFloat(factura.retencion_1) > 0) addTotalRow('IVA Retenido:', factura.retencion_1);
    if (parseFloat(factura.percepcion_1) > 0) addTotalRow('Percepción (1%):', factura.percepcion_1);
    
    doc.moveDown(0.5);
    currentY += 5;
    
    // Línea antes del total final
    doc.strokeColor(borderColor).lineWidth(1).moveTo(totalLabelX, currentY - 3).lineTo(565, currentY - 3).stroke();
    
    addTotalRow('Monto Total de la Operación:', total, true);
    addTotalRow('Total a pagar:', total, true);

    // --- PIE DE PÁGINA ---
    doc.moveDown(3);
    const footerY = doc.y + 20;
    doc.strokeColor(borderColor).lineWidth(1).moveTo(30, footerY).lineTo(565, footerY).stroke();
    
    doc.fontSize(7).fillColor('#666666');
    doc.text(`Condición de la operación: Contado`, 30, footerY + 5);
    doc.text(`Generado por: ${factura.usuario_nombre} | Organización: ${factura.organizacion_nombre}`, { align: 'center' });
    
    // Finalizar PDF
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar PDF: ' + error.message });
  }
};

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

    // Obtener la factura actual
    const [facturaRows] = await pool.query(
      'SELECT id, estado, organizacion_id, total_pagar, numero_correlativo FROM facturas WHERE id = ? AND eliminado_en IS NULL',
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

    // Solo procesamos si la factura es de membresía (MEM-)
    const esMembresia = factura.numero_correlativo.startsWith('MEM-');

    // Si cambia de Emitida a Pagada y es membresía → registrar ingreso
    if (factura.estado === 'Emitida' && estado === 'Pagada' && esMembresia) {
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();
      // Verificar si ya existe un ingreso para esta organización en este mes (evitar duplicados)
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
      }
    }

    // Si cambia de Pagada a Emitida y es membresía → eliminar ingreso
    if (factura.estado === 'Pagada' && estado === 'Emitida' && esMembresia) {
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();
      await pool.query(
        'DELETE FROM saas_ingresos_membresias WHERE organizacion_id = ? AND mes_pagado = ? AND anio_pagado = ?',
        [factura.organizacion_id, mesActual, anioActual]
      );
    }

    // Actualizar estado de la factura
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
    const [rows] = await pool.query(
      `SELECT i.id, i.monto, i.mes_pagado, i.anio_pagado, i.fecha_pago,
              o.nombre_empresa AS organizacion_nombre,
              f.numero_correlativo AS factura_numero,
              f.estado AS factura_estado
       FROM saas_ingresos_membresias i
       JOIN organizaciones o ON i.organizacion_id = o.id
       LEFT JOIN facturas f ON f.organizacion_id = i.organizacion_id 
         AND f.numero_correlativo LIKE 'MEM-%' 
         AND MONTH(f.creado_en) = i.mes_pagado 
         AND YEAR(f.creado_en) = i.anio_pagado
       WHERE f.estado = 'Pagada' OR f.estado IS NULL
       ORDER BY i.fecha_pago DESC`
    );
    // Filtrar en caso de que alguna factura esté anulada (si f.estado = 'Anulada' no se incluye)
    const ingresos = rows
      .filter(row => row.factura_estado !== 'Anulada')
      .map(row => ({
        id: row.id,
        fecha: row.fecha_pago,
        organizacion_nombre: row.organizacion_nombre,
        concepto: 'Membresía',
        monto: row.monto,
        factura_numero: row.factura_numero || 'MEM-' + String(row.id).padStart(6, '0')
      }));

    res.json(ingresos);
  } catch (error) {
    console.error('Error en obtenerDetalleIngresos:', error);
    res.status(500).json({ message: 'Error al obtener detalle de ingresos: ' + error.message });
  }
};

// Obtener facturas anuladas
exports.obtenerFacturasCanceladas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, c.nombre AS cliente_nombre, o.nombre_empresa AS organizacion_nombre
       FROM facturas f
       JOIN clientes c ON f.cliente_id = c.id
       JOIN organizaciones o ON f.organizacion_id = o.id
       WHERE f.estado = 'Anulada' AND f.eliminado_en IS NULL
       ORDER BY f.creado_en DESC`
    );
    res.json(rows);
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

    // Total de gastos
    const [totalRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM saas_gastos_infraestructura'
    );
    const total = totalRows[0].total;

    // Lista de gastos con paginación
    const [rows] = await pool.query(
      `SELECT id, proveedor, monto, descripcion, fecha_gasto AS fecha
       FROM saas_gastos_infraestructura
       ORDER BY fecha_gasto DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

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