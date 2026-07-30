// backend/src/helpers/mhAuthHelper.js
const axios = require('axios');
const { pool } = require('../config/db');

class MHAuthHelper {
  /**
   * Obtener token de autenticación del Ministerio de Hacienda
   * @param {number} organizacion_id - ID de la organización
   * @returns {Promise<string>} - Token JWT
   */
  static async obtenerTokenMH(organizacion_id) {
    try {
      // 1. Verificar si ya hay un token vigente en la BD
      const [rows] = await pool.query(
        `SELECT token, fecha_expiracion FROM tokens_mh 
         WHERE organizacion_id = ? AND fecha_expiracion > NOW() 
         ORDER BY creado_en DESC LIMIT 1`,
        [organizacion_id]
      );

      if (rows.length > 0) {
        // Token vigente, devolverlo
        return rows[0].token;
      }

      // 2. No hay token vigente, obtener uno nuevo
      const [org] = await pool.query(
        'SELECT nit, password_api_mh, ambiente FROM organizaciones WHERE id = ?',
        [organizacion_id]
      );

      if (!org || org.length === 0) {
        throw new Error('Organización no encontrada');
      }

      const { nit, password_api_mh, ambiente } = org[0];

      if (!password_api_mh) {
        throw new Error('La organización no tiene configurada la contraseña de API del MH');
      }

      // Determinar URL según ambiente
      const baseUrl = ambiente === '01' 
        ? 'https://api.dtes.mh.gob.sv' 
        : 'https://apitest.dtes.mh.gob.sv';

      // 3. Hacer login al MH
      const response = await axios({
        method: 'POST',
        url: `${baseUrl}/seguridad/auth`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SaaS-Facturacion/1.0',
        },
        data: new URLSearchParams({
          user: nit.replace(/-/g, ''),
          pwd: password_api_mh,
        }).toString(),
      });

      if (response.data.status !== 'OK') {
        throw new Error(response.data.message || 'Error al autenticar en el MH');
      }

      const token = response.data.body.token;

      // 4. Guardar token en la base de datos (expira en 24 horas)
      const fechaExpiracion = new Date();
      fechaExpiracion.setHours(fechaExpiracion.getHours() + 24);

      await pool.query(
        `INSERT INTO tokens_mh (organizacion_id, token, fecha_expiracion) 
         VALUES (?, ?, ?)`,
        [organizacion_id, token, fechaExpiracion]
      );

      return token;

    } catch (error) {
      console.error('❌ Error al obtener token MH:', error.message);
      throw new Error(`Error de autenticación con MH: ${error.message}`);
    }
  }

  /**
   * Obtener la URL base del MH según el ambiente de la organización
   */
  static async getBaseUrl(organizacion_id) {
    const [org] = await pool.query(
      'SELECT ambiente FROM organizaciones WHERE id = ?',
      [organizacion_id]
    );
    if (!org || org.length === 0) {
      throw new Error('Organización no encontrada');
    }
    return org[0].ambiente === '01'
      ? 'https://api.dtes.mh.gob.sv'
      : 'https://apitest.dtes.mh.gob.sv';
  }
}

module.exports = MHAuthHelper;