// backend/src/helpers/whatsappHelper.js
const twilio = require('twilio');
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER,
} = require('../config/config');
const { pool } = require('../config/db');

// Tipos permitidos por el ENUM de la BD
const TIPOS_PERMITIDOS = [
  'Recordatorio_Cita',
  'Factura',
  'Examen_Listo',
  'Examen_Resultado',
  'Mensaje_General',
  'Otro',
];

function normalizarTipo(tipo) {
  if (!tipo || !TIPOS_PERMITIDOS.includes(tipo)) return 'Otro';
  return tipo;
}

async function registrarLog(organizacion_id, telefono, mensaje, tipo, referencia_id, estado) {
  try {
    await pool.query(
      `INSERT INTO whatsapp_log
       (organizacion_id, telefono_destino, mensaje, tipo, referencia_id, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        organizacion_id,
        telefono,
        mensaje,
        normalizarTipo(tipo),
        referencia_id,
        estado,
      ]
    );
  } catch (logError) {
    console.error('⚠️ No se pudo registrar en whatsapp_log:', logError.message);
  }
}

async function enviarWhatsApp(numero, mensaje, organizacion_id = null, tipo = null, referencia_id = null) {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.warn('⚠️ Twilio no configurado');
      return { success: false, error: 'Twilio no configurado' };
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const numeroFormateado = numero.startsWith('+') ? numero : `+503${numero}`;

    const message = await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${numeroFormateado}`,
      body: mensaje,
    });

    if (organizacion_id) {
      await registrarLog(
        organizacion_id,
        numeroFormateado,
        mensaje,
        tipo,
        referencia_id,
        'Enviado'
      );
    }

    return { success: true, sid: message.sid, to: numeroFormateado };
  } catch (error) {
    console.error('❌ Error al enviar WhatsApp:', error.message);

    if (organizacion_id) {
      await registrarLog(
        organizacion_id,
        numero,
        mensaje,
        tipo,
        referencia_id,
        'Fallido'
      );
    }

    return { success: false, error: error.message };
  }
}

module.exports = { enviarWhatsApp };