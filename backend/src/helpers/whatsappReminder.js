const cron = require('node-cron');
const { pool } = require('../config/db');
const { enviarWhatsApp } = require('./whatsappHelper');
const { verificarLimite, incrementarConsumo } = require('./consumoHelper');

// Ejecutar cada 30 minutos
cron.schedule('*/30 * * * *', async () => {
  try {
    const ahora = new Date();
    const enDosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    const enUnaHora = new Date(ahora.getTime() + 1 * 60 * 60 * 1000);

    // Buscar citas programadas que estén entre 1 y 2 horas antes
    const sql = `
      SELECT c.*,
             p.nombre AS paciente_nombre,
             p.cliente_id,
             cl.nombre AS cliente_nombre,
             cl.telefono_whatsapp,
             u.nombre AS medico_nombre,
             o.whatsapp_activado,
             o.id AS organizacion_id
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN clientes cl ON p.cliente_id = cl.id
      JOIN medicos m ON c.medico_id = m.id
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN organizaciones o ON c.organizacion_id = o.id
      WHERE c.estado = 'Programada'
        AND c.recordatorio_enviado = FALSE
        AND o.whatsapp_activado = 1
        AND c.fecha_hora BETWEEN ? AND ?
    `;
    const [rows] = await pool.query(sql, [enUnaHora, enDosHoras]);

    for (const cita of rows) {
      if (cita.telefono_whatsapp) {
        const limiteCheck = await verificarLimite(cita.organizacion_id, 'whatsapp');
        if (limiteCheck.allowed) {
          const fechaFormateada = new Date(cita.fecha_hora).toLocaleString('es-SV');
          const mensaje = `Recordatorio: su cita para ${cita.paciente_nombre} es en 2 horas (${fechaFormateada}). Atenderá ${cita.medico_nombre}.`;
          await enviarWhatsApp(cita.telefono_whatsapp, mensaje, cita.organizacion_id, 'Recordatorio_Cita', cita.id);

          // Marcar como enviado
          await pool.query(
            'UPDATE citas SET recordatorio_enviado = TRUE WHERE id = ?',
            [cita.id]
          );

          await incrementarConsumo(cita.organizacion_id, 'whatsapp');
        }
      }
    }
  } catch (error) {
    console.error('Error en cron de recordatorios:', error);
  }
});

console.log('🕐 Cron de recordatorios WhatsApp iniciado (cada 30 min)');