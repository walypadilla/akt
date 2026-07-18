// backend/scripts/createSuperAdmin.js
const bcrypt = require('bcrypt');
const { pool, testConnection } = require('./src/config/db');

async function createSuperAdmin() {
  console.log('🔄 Verificando conexión a la base de datos...');

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ No se pudo conectar a la base de datos.');
    process.exit(1);
  }

  try {
    // 1. Verificar organización
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
      console.log('✅ Organización SuperAdmin creada con ID:', organizacion_id);
    } else {
      organizacion_id = orgRows[0].id;
      console.log('✅ Organización SuperAdmin ya existe con ID:', organizacion_id);
    }

    // 2. Verificar usuario
    const [userRows] = await pool.query(
      `SELECT id FROM usuarios WHERE correo = 'superadmin@localhost.com' LIMIT 1`
    );

    if (userRows.length > 0) {
      console.log('⚠️ El usuario SuperAdmin ya existe.');
      process.exit(0);
    }

    // 3. Crear usuario
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    await pool.query(
      `INSERT INTO usuarios (organizacion_id, nombre, correo, password, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organizacion_id, 'SuperAdmin', 'superadmin@localhost.com', hashedPassword, 'SUPER_ADMIN', 'Activo']
    );

    console.log('✅ Usuario SuperAdmin creado exitosamente:');
    console.log('   Correo: superadmin@localhost.com');
    console.log('   Contraseña: Admin123!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear SuperAdmin:', error);
    process.exit(1);
  }
}

createSuperAdmin();