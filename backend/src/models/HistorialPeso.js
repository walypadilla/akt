const { pool } = require('../config/db');

class HistorialPeso {
  /** Inserta un registro (desde consulta o manual) */
  static async crear(data) {
    const {
      organizacion_id, paciente_id, peso, origen = 'Manual',
      consulta_id = null, usuario_id = null, observaciones = null,
      fecha_registro = null,
    } = data;

    const [r] = await pool.query(
      `INSERT INTO historial_pesos
        (organizacion_id, paciente_id, peso, origen, consulta_id, usuario_id, observaciones, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
      [organizacion_id, paciente_id, peso, origen, consulta_id, usuario_id, observaciones, fecha_registro]
    );
    return r.insertId;
  }

  /**
   * Upsert inteligente desde una consulta: si ya existe un registro
   * vinculado a esa consulta lo actualiza, si no lo crea.
   * Lo usan crear() y actualizar() del consultaController.
   */
  static async upsertDesdeConsulta({
    organizacion_id, paciente_id, consulta_id, peso, usuario_id, fecha_registro,
  }) {
    const pesoNum = Number(peso);
    if (!pesoNum || pesoNum <= 0) return null;

    const [existe] = await pool.query(
      `SELECT id FROM historial_pesos
        WHERE consulta_id = ? AND organizacion_id = ? LIMIT 1`,
      [consulta_id, organizacion_id]
    );

    if (existe.length > 0) {
      await pool.query(
        `UPDATE historial_pesos
            SET peso = ?, fecha_registro = COALESCE(?, fecha_registro)
          WHERE id = ?`,
        [pesoNum, fecha_registro, existe[0].id]
      );
      return existe[0].id;
    }

    return this.crear({
      organizacion_id, paciente_id, peso: pesoNum,
      origen: 'Consulta', consulta_id, usuario_id, fecha_registro,
    });
  }

  /** Historial completo (para gráfica) */
  static async listarPorPaciente(paciente_id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT hp.id, hp.peso, hp.fecha_registro, hp.origen, hp.consulta_id,
              hp.observaciones, u.nombre AS usuario_nombre
         FROM historial_pesos hp
         LEFT JOIN usuarios u ON u.id = hp.usuario_id
        WHERE hp.paciente_id = ? AND hp.organizacion_id = ?
        ORDER BY hp.fecha_registro ASC, hp.id ASC`,
      [paciente_id, organizacion_id]
    );
    return rows;
  }

  static async eliminar(id, organizacion_id) {
    const [r] = await pool.query(
      `DELETE FROM historial_pesos WHERE id = ? AND organizacion_id = ?`,
      [id, organizacion_id]
    );
    return r.affectedRows > 0;
  }

  /** Lista de pacientes con su último peso y clasificación KPI */
  static async listarPacientesKPI(organizacion_id, filtro = 'todos') {
    const [rows] = await pool.query(
      `SELECT
         p.id, p.nombre, p.apellidos, p.especie, p.raza, p.genero,
         p.peso AS peso_actual, p.peso_ideal_min, p.peso_ideal_max,
         p.codigo_expediente,
         c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
         COALESCE(hp.peso, p.peso)               AS ultimo_peso,
         hp.fecha_registro                        AS ultima_fecha,
         CASE
           WHEN p.peso_ideal_min IS NULL OR p.peso_ideal_max IS NULL THEN 'sin_clasificar'
           WHEN COALESCE(hp.peso, p.peso) > p.peso_ideal_max THEN 'sobrepeso'
           WHEN COALESCE(hp.peso, p.peso) < p.peso_ideal_min THEN 'bajo'
           ELSE 'ideal'
         END AS clasificacion
       FROM pacientes p
       LEFT JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN (
         SELECT paciente_id, peso, fecha_registro,
                ROW_NUMBER() OVER (
                  PARTITION BY paciente_id
                  ORDER BY fecha_registro DESC, id DESC
                ) AS rn
           FROM historial_pesos
          WHERE organizacion_id = ?
       ) hp ON hp.paciente_id = p.id AND hp.rn = 1
       WHERE p.organizacion_id = ? AND p.tipo_paciente = 'Mascota' AND p.activo = 1
       ORDER BY p.nombre ASC`,
      [organizacion_id, organizacion_id]
    );

    if (filtro === 'todos') return rows;
    return rows.filter((r) => r.clasificacion === filtro);
  }

  static async contadoresKPI(organizacion_id) {
    const pacientes = await this.listarPacientesKPI(organizacion_id, 'todos');
    return {
      total:          pacientes.length,
      ideal:          pacientes.filter((p) => p.clasificacion === 'ideal').length,
      sobrepeso:      pacientes.filter((p) => p.clasificacion === 'sobrepeso').length,
      bajo:           pacientes.filter((p) => p.clasificacion === 'bajo').length,
      sin_clasificar: pacientes.filter((p) => p.clasificacion === 'sin_clasificar').length,
    };
  }

  static async actualizarPesoIdeal(paciente_id, organizacion_id, min, max) {
    const [r] = await pool.query(
      `UPDATE pacientes SET peso_ideal_min = ?, peso_ideal_max = ?
        WHERE id = ? AND organizacion_id = ?`,
      [min, max, paciente_id, organizacion_id]
    );
    return r.affectedRows > 0;
  }
}

module.exports = HistorialPeso;