// backend/src/helpers/whatsappReminder.js
const cron = require('node-cron');
const { pool } = require('../config/db');
const { enviarWhatsApp } = require('./whatsappHelper');
const { verificarLimite, incrementarConsumo } = require('./consumoHelper');

cron.schedule('0 */2 * * *', async () => { // cada 2 horas
  try {
    const ahora = new Date();
    const enDosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    const sql = `
      SELECT c.*, p.cliente_id, cl.telefono_whatsapp, cl.nombre AS cliente_nombre, pa.nombre AS paciente_nombre
      FROM citas c
      JOIN pacientes pa ON c.paciente_id = pa.id
      JOIN clientes cl ON pa.cliente_id = cl.id
      WHERE c.estado = 'Programada' 
        AND c.fecha_hora BETWEEN ? AND ?
        AND c.recordatorio_enviado = FALSE
    `;
    const [rows] = await pool.query(sql, [ahora, enDosHoras]);
    for (const cita of rows) {
      if (cita.telefono_whatsapp) {
        const mensaje = `Recordatorio: su cita para ${cita.paciente_nombre} es en 2 horas (${new Date(cita.fecha_hora).toLocaleString()}).`;
        await enviarWhatsApp(cita.telefono_whatsapp, mensaje);
        await pool.query('UPDATE citas SET recordatorio_enviado = TRUE WHERE id = ?', [cita.id]);
        await incrementarConsumo(cita.organizacion_id, 'whatsapp');
      }
    }
  } catch (error) {
    console.error('Error en cron de recordatorios:', error);
  }
});