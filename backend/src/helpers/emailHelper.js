// backend/src/helpers/emailHelper.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } = require('../config/config');

class EmailHelper {
  constructor() {
    this.apiKey = BREVO_API_KEY;
    this.senderEmail = BREVO_SENDER_EMAIL;
    this.senderName = BREVO_SENDER_NAME || 'Sistema de Facturación';
    
    if (!this.apiKey) {
      console.warn('⚠️ BREVO_API_KEY no configurada en .env');
    }
  }

  /**
   * Enviar correo con la factura en formato PDF
   */
  async sendFacturaEmail({
    toEmail,
    toName,
    subject,
    htmlContent,
    pdfBuffer,
    pdfName = 'factura.pdf',
    organization = null,
    extraAttachments = []
  }) {
    try {
      if (!this.apiKey) {
        throw new Error('BREVO_API_KEY no configurada');
      }

      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const apiKey = apiInstance.apiClient.authentications['api-key'];
      apiKey.apiKey = this.apiKey;

      const senderName = organization 
        ? `${organization.nombre_empresa} - Facturación`
        : this.senderName;

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      
      sendSmtpEmail.sender = {
        name: senderName,
        email: this.senderEmail,
      };

      sendSmtpEmail.to = [{
        email: toEmail,
        name: toName || 'Cliente',
      }];

      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlContent;

      // Adjuntar PDF principal
      if (pdfBuffer) {
        const pdfBase64 = pdfBuffer.toString('base64');
        sendSmtpEmail.attachment = [{
          content: pdfBase64,
          name: pdfName,
        }];
      }

      // Adjuntar archivos adicionales (JSON)
      for (const att of extraAttachments) {
        if (att && att.content) {
          const contentBase64 = att.content.toString('base64');
          sendSmtpEmail.attachment.push({
            content: contentBase64,
            name: att.name || 'adjunto',
            contentType: att.contentType || 'application/octet-stream',
          });
        }
      }

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      return {
        success: true,
        messageId: result.messageId,
        response: result,
      };

    } catch (error) {
      console.error('❌ Error al enviar correo con Brevo:', error);
      return {
        success: false,
        error: error.message,
        response: error.response?.body || error,
      };
    }
  }

  /**
   * Generar el contenido HTML del correo
   */
  generarHTMLFactura(factura, cliente, organizacion, pdfUrl, mensajePersonalizado = '') {
    const fecha = new Date(factura.creado_en).toLocaleDateString('es-SV');
    const fechaVencimiento = factura.fecha_vencimiento 
      ? new Date(factura.fecha_vencimiento).toLocaleDateString('es-SV')
      : 'No aplica';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #1a1a2e; font-size: 24px; margin: 0; }
          .header .empresa { color: #8b5cf6; font-size: 18px; margin: 5px 0 0; }
          .detalles { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .detalles p { margin: 5px 0; }
          .detalles .label { font-weight: bold; color: #555; }
          .total { text-align: center; font-size: 28px; font-weight: bold; color: #8b5cf6; padding: 15px; background: #f0f0ff; border-radius: 8px; margin: 15px 0; }
          .boton { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0; }
          .footer { text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; }
          .mensaje { background: #fff3cd; padding: 12px; border-radius: 5px; margin: 15px 0; color: #856404; border: 1px solid #ffc107; }
          .estado { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .estado.emitida { background: #cce5ff; color: #004085; }
          .estado.pagada { background: #d4edda; color: #155724; }
          .estado.anulada { background: #f8d7da; color: #721c24; }
          .estado.borrador { background: #e2e3e5; color: #383d41; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧾 Factura Electrónica</h1>
            <div class="empresa">${organizacion?.nombre_empresa || 'Nuestra Empresa'}</div>
            <p style="color: #666; margin: 5px 0;">${organizacion?.nit ? `NIT: ${organizacion.nit}` : ''}</p>
          </div>

          <div class="detalles">
            <p><span class="label">N° Factura:</span> ${factura.numero_correlativo}</p>
            <p><span class="label">Cliente:</span> ${cliente.nombre}</p>
            <p><span class="label">Fecha:</span> ${fecha}</p>
            <p><span class="label">Vencimiento:</span> ${fechaVencimiento}</p>
            <p><span class="label">Condición:</span> ${factura.condicion_operacion || 'Contado'}</p>
            <p><span class="label">Estado:</span> <span class="estado ${factura.estado.toLowerCase()}">${factura.estado}</span></p>
            ${factura.uuid_dte ? `<p><span class="label">UUID DTE:</span> <small>${factura.uuid_dte}</small></p>` : ''}
          </div>

          ${mensajePersonalizado ? `<div class="mensaje">📝 ${mensajePersonalizado}</div>` : ''}

          <div class="total">
            $${parseFloat(factura.total_pagar).toFixed(2)}
          </div>

          <div style="text-align: center;">
            <a href="${pdfUrl}" class="boton">📄 Descargar Factura (PDF)</a>
          </div>

          <p style="text-align: center; color: #666; font-size: 14px; margin: 15px 0;">
            Este es un comprobante electrónico válido según la normativa vigente.
          </p>

          <div class="footer">
            <p>Este correo fue enviado automáticamente. Por favor, no responder a este mensaje.</p>
            <p>© ${new Date().getFullYear()} - Sistema de Facturación</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailHelper();