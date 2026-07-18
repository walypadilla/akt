// backend/src/config/db.js
const mysql = require('mysql2/promise');
const { DB_HOST, DB_USER, PASSWORD_DB, NAME_DB } = require('./config');

// Verificar variables de entorno
if (!DB_HOST || !DB_USER || !PASSWORD_DB || !NAME_DB) {
  console.error('❌ Faltan variables de entorno:');
  console.error('DB_HOST:', DB_HOST);
  console.error('DB_USER:', DB_USER);
  console.error('PASSWORD_DB:', PASSWORD_DB ? '***' : 'undefined');
  console.error('NAME_DB:', NAME_DB);
  throw new Error('Variables de entorno incompletas');
}

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: PASSWORD_DB,
  database: NAME_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a la base de datos exitosa');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };