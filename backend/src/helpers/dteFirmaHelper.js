// backend/src/helpers/dteFirmaHelper.js
const forge = require('node-forge');
const { pool } = require('../config/db');

class DTEFirmaHelper {
  /**
   * Firmar un JSON DTE usando el certificado P12 de la organización
   * @param {Object} jsonData - JSON del DTE sin firmar
   * @param {number} organizacion_id - ID de la organización
   * @returns {Promise<string>} - JSON firmado (JWS)
   */
  static async firmarDTE(jsonData, organizacion_id) {
    try {
      // 1. Obtener el certificado de la organización
      const [org] = await pool.query(
        'SELECT certificado_p12_base64, password_certificado FROM organizaciones WHERE id = ?',
        [organizacion_id]
      );

      if (!org || org.length === 0) {
        throw new Error('Organización no encontrada');
      }

      if (!org[0].certificado_p12_base64) {
        throw new Error('La organización no tiene certificado P12 configurado');
      }

      // 2. Decodificar el certificado de base64
      const p12Buffer = Buffer.from(org[0].certificado_p12_base64, 'base64');
      const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, org[0].password_certificado || '');

      // 3. Obtener la clave privada y el certificado
      const keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
      const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];

      if (!keyBag || !certBag) {
        throw new Error('No se pudo extraer la clave privada o el certificado del P12');
      }

      const privateKey = keyBag[0].key;
      const certificate = certBag[0].cert;

      // 4. Convertir el JSON a string
      const jsonString = JSON.stringify(jsonData);

      // 5. Crear el JWS (JSON Web Signature)
      // El formato que espera el MH es: header.payload.signature
      // Header: algoritmo de firma
      const header = {
        alg: 'RS512', // RSA SHA-512
        typ: 'JWT',
      };

      // 6. Codificar header y payload en base64url
      const headerB64 = forge.util.encode64(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const payloadB64 = forge.util.encode64(jsonString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      // 7. Firmar
      const signatureInput = `${headerB64}.${payloadB64}`;
      const md = forge.md.sha512.create();
      md.update(signatureInput);
      const signature = privateKey.sign(md);
      const signatureB64 = forge.util.encode64(signature).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      // 8. JWS completo
      const jws = `${headerB64}.${payloadB64}.${signatureB64}`;

      // 9. Retornar el JSON firmado
      return {
        ...jsonData,
        firmaElectronica: jws,
      };

    } catch (error) {
      console.error('❌ Error al firmar DTE:', error.message);
      throw new Error(`Error al firmar DTE: ${error.message}`);
    }
  }
}

module.exports = DTEFirmaHelper;