// backend/src/helpers/consumoHelper.js
const { pool } = require('../config/db');

async function incrementarConsumo(organizacion_id, tipo, cantidad = 1) {
  const mes = new Date().getMonth() + 1;
  const anio = new Date().getFullYear();
  const columna = tipo === 'factura' ? 'facturas_generadas' : 'whatsapp_enviados';

  await pool.query(
    `INSERT INTO consumo_mensual_organizacion (organizacion_id, mes, anio, ${columna})
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE ${columna} = ${columna} + ?`,
    [organizacion_id, mes, anio, cantidad, cantidad]
  );
}

async function verificarLimite(organizacion_id, tipo) {
  const mes = new Date().getMonth() + 1;
  const anio = new Date().getFullYear();
  const columna = tipo === 'factura' ? 'limite_facturas_mensuales' : 'limite_whatsapp_mensual';
  const tablaConsumo = tipo === 'factura' ? 'facturas_generadas' : 'whatsapp_enviados';

  const [org] = await pool.query(
    `SELECT o.id, p.${columna} AS limite 
     FROM organizaciones o 
     JOIN planes p ON o.plan_id = p.id 
     WHERE o.id = ?`,
    [organizacion_id]
  );

  if (!org || org.length === 0) return { allowed: false, message: 'Organización no encontrada' };

  const limite = org[0].limite;

  // Obtener consumo actual
  const [consumo] = await pool.query(
    `SELECT ${tablaConsumo} AS total 
     FROM consumo_mensual_organizacion 
     WHERE organizacion_id = ? AND mes = ? AND anio = ?`,
    [organizacion_id, mes, anio]
  );

  const total = consumo.length > 0 ? parseInt(consumo[0].total) : 0;

  if (total >= limite) {
    return { allowed: false, message: `Límite mensual de ${tipo}s alcanzado (${limite})` };
  }

  return { allowed: true, total, limite };
}

module.exports = { incrementarConsumo, verificarLimite };