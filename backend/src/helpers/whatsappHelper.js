const twilio = require('twilio');
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER
} = require('../config/config');
const { pool } = require('../config/db');

async function enviarWhatsApp(numero, mensaje, organizacion_id = null, tipo = null, referencia_id = null) {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.warn('⚠️ Twilio no configurado');
      return false;
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const numeroFormateado = numero.startsWith('+') ? numero : `+503${numero}`;

    const message = await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${numeroFormateado}`,
      body: mensaje,
    });

    // Registrar en log
    if (organizacion_id) {
      await pool.query(
        `INSERT INTO whatsapp_log
         (organizacion_id, telefono_destino, mensaje, tipo, referencia_id, estado)
         VALUES (?, ?, ?, ?, ?, 'Enviado')`,
        [organizacion_id, numeroFormateado, mensaje, tipo || 'Recordatorio_Cita', referencia_id]
      );
    }

    return true;
  } catch (error) {
    console.error('❌ Error al enviar WhatsApp:', error.message);

    // Registrar fallo
    if (organizacion_id) {
      await pool.query(
        `INSERT INTO whatsapp_log
         (organizacion_id, telefono_destino, mensaje, tipo, referencia_id, estado)
         VALUES (?, ?, ?, ?, ?, 'Fallido')`,
        [organizacion_id, numero, mensaje, tipo || 'Recordatorio_Cita', referencia_id]
      );
    }

    return false;
  }
}

module.exports = { enviarWhatsApp };