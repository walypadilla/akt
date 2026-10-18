const Medico = require('../../models/Medico');
const Usuario = require('../../models/Usuario');
const { pool } = require('../../config/db');

/**
 * Listar todos los médicos de la organización
 * GET /organization/medicos
 */
exports.listar = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { activo, anio, mes } = req.query;
    const soloActivos = activo !== 'false';
    const anioActual = new Date().getFullYear();
    const anioFiltro = anio ? parseInt(anio) : anioActual;
    const mesFiltro = mes ? parseInt(mes) : null;

    const medicos = await Medico.findAllWithStats(
      organizacion_id,
      anioFiltro,
      mesFiltro,
      soloActivos
    );
    res.json(medicos);
  } catch (error) {
    console.error('Error al listar médicos:', error);
    res.status(500).json({ message: 'Error al listar médicos' });
  }
};

/**
 * Obtener un médico por ID
 * GET /organization/medicos/:id
 */
exports.obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const medico = await Medico.findById(id, organizacion_id);
    if (!medico) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    res.json(medico);
  } catch (error) {
    console.error('Error al obtener médico:', error);
    res.status(500).json({ message: 'Error al obtener médico' });
  }
};

/**
 * Crear un nuevo médico (asociado a un usuario existente)
 * POST /organization/medicos
 */
exports.crear = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { usuario_id, especialidad, numero_licencia } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ message: 'Debe seleccionar un usuario' });
    }
    if (!especialidad) {
      return res.status(400).json({ message: 'La especialidad es obligatoria' });
    }

    const usuario = await Usuario.findById(usuario_id);
    if (!usuario || usuario.organizacion_id !== organizacion_id) {
      return res.status(404).json({ message: 'Usuario no encontrado en esta organización' });
    }
    if (usuario.rol !== 'Medico') {
      return res.status(400).json({ message: 'El usuario no tiene rol de Médico' });
    }

    const existente = await Medico.findByUsuarioId(usuario_id, organizacion_id);
    if (existente) {
      return res.status(400).json({ message: 'Este usuario ya está registrado como médico' });
    }

    const id = await Medico.create({
      organizacion_id,
      usuario_id,
      especialidad,
      numero_licencia,
    });

    res.status(201).json({ message: 'Médico creado', id });
  } catch (error) {
    console.error('Error al crear médico:', error);
    res.status(500).json({ message: 'Error al crear médico' });
  }
};

/**
 * Actualizar datos de un médico
 * PUT /organization/medicos/:id
 */
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { especialidad, numero_licencia } = req.body;

    const medico = await Medico.findById(id, organizacion_id);
    if (!medico) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    await Medico.update(id, organizacion_id, { especialidad, numero_licencia });
    res.json({ message: 'Médico actualizado' });
  } catch (error) {
    console.error('Error al actualizar médico:', error);
    res.status(500).json({ message: 'Error al actualizar médico' });
  }
};

/**
 * Desactivar un médico
 * DELETE /organization/medicos/:id
 */
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const medico = await Medico.findById(id, organizacion_id);
    if (!medico) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    await Medico.update(id, organizacion_id, { activo: false });
    res.json({ message: 'Médico desactivado' });
  } catch (error) {
    console.error('Error al desactivar médico:', error);
    res.status(500).json({ message: 'Error al desactivar médico' });
  }
};

/**
 * Reactivar un médico
 * PUT /organization/medicos/:id/reactivar
 */
exports.reactivar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const medico = await Medico.findById(id, organizacion_id);
    if (!medico) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    await Medico.update(id, organizacion_id, { activo: true });
    res.json({ message: 'Médico reactivado' });
  } catch (error) {
    console.error('Error al reactivar médico:', error);
    res.status(500).json({ message: 'Error al reactivar médico' });
  }
};

// ============================================================
// EXPORTACIONES Y DETALLES
// ============================================================

/**
 * Exportar todos los médicos (CSV)
 * GET /organization/medicos/exportar/todos
 */
exports.exportarTodos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const medicos = await Medico.findAll(organizacion_id, false);

    if (medicos.length === 0) {
      return res.status(404).json({ message: 'No hay médicos para exportar' });
    }

    const data = medicos.map(m => ({
      'Nombre': m.nombre,
      'Correo': m.correo || '',
      'Especialidad': m.especialidad || '',
      'Número de Licencia': m.numero_licencia || '',
      'Estado': m.activo === 1 ? 'Activo' : 'Inactivo',
    }));

    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n';
    csv += headers.join(';') + '\n';
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }

    const filename = `medicos_todos_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar médicos:', error);
    res.status(500).json({ message: 'Error al exportar médicos' });
  }
};

/**
 * Exportar médicos filtrados (CSV)
 * GET /organization/medicos/exportar/filtrados
 */
exports.exportarFiltrados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search, activo, anio, mes } = req.query;

    const anioFiltro = anio ? parseInt(anio) : new Date().getFullYear();
    const mesFiltro = mes ? parseInt(mes) : null;
    const medicos = await Medico.findAllWithStats(organizacion_id, anioFiltro, mesFiltro, false);

    let filtered = medicos;
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.nombre.toLowerCase().includes(term) ||
        (m.especialidad && m.especialidad.toLowerCase().includes(term))
      );
    }
    if (activo === 'true') {
      filtered = filtered.filter(m => m.activo === 1);
    } else if (activo === 'false') {
      filtered = filtered.filter(m => m.activo === 0);
    }

    if (filtered.length === 0) {
      return res.status(404).json({ message: 'No hay médicos con los filtros aplicados' });
    }

    const data = filtered.map(m => ({
      'Nombre': m.nombre,
      'Correo': m.correo || '',
      'Especialidad': m.especialidad || '',
      'Número de Licencia': m.numero_licencia || '',
      'Estado': m.activo === 1 ? 'Activo' : 'Inactivo',
    }));

    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n';
    csv += headers.join(';') + '\n';
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }

    const filename = `medicos_filtrados_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar médicos filtrados:', error);
    res.status(500).json({ message: 'Error al exportar médicos filtrados' });
  }
};

/**
 * Obtener detalle de un médico con sus consultas y facturas
 * GET /organization/medicos/:id/detalle
 * Query: anio, mes (opcional)
 */
exports.obtenerDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { anio, mes } = req.query;

    const medico = await Medico.findById(id, organizacion_id);
    if (!medico) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    const anioFiltro = anio ? parseInt(anio) : null;
    const mesFiltro = mes ? parseInt(mes) : null;

    const consultas = await Medico.getDetalleConConsultas(id, organizacion_id, anioFiltro, mesFiltro);

    // Solo suma las facturas cuyo estado es Pagada
    const totalFacturado = consultas.reduce((acc, c) => {
      if (c.factura_estado === 'Pagada') {
        return acc + (parseFloat(c.factura_total) || 0);
      }
      return acc;
    }, 0);

    const anios = await Medico.getAniosDisponibles(id, organizacion_id);
    const meses = anioFiltro ? await Medico.getMesesDisponibles(id, organizacion_id, anioFiltro) : [];

    const totalConsultas = consultas.length;
    const consultasConFactura = consultas.filter(c => c.factura_id).length;

    res.json({
      medico,
      consultas,
      resumen: {
        totalConsultas,
        consultasConFactura,
        totalFacturado,
        aniosDisponibles: anios,
        mesesDisponibles: meses,
      },
    });
  } catch (error) {
    console.error('Error al obtener detalle del médico:', error);
    res.status(500).json({ message: 'Error al obtener detalle', error: error.message });
  }
};

/**
 * Exportar consultas filtradas de un médico a CSV
 * GET /organization/medicos/:id/exportar-consultas
 */
exports.exportarDetalleConsultas = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { anio, mes } = req.query;

    const medico = await Medico.findById(id, organizacion_id);
    if (!medico) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    const anioFiltro = anio ? parseInt(anio) : null;
    const mesFiltro = mes ? parseInt(mes) : null;

    const consultas = await Medico.getDetalleConConsultas(id, organizacion_id, anioFiltro, mesFiltro);

    if (consultas.length === 0) {
      return res.status(404).json({ message: 'No hay consultas con los filtros seleccionados' });
    }

    const data = consultas.map(c => ({
      'Fecha': c.fecha_consulta ? new Date(c.fecha_consulta).toLocaleDateString('es-SV') : '',
      'Paciente': c.paciente_nombre || 'N/A',
      'Motivo': c.motivo || '',
      'N° Factura': c.factura_numero || 'Sin Factura',
      'Estado Factura': c.factura_estado || '-',
      'Total Factura': c.factura_total ? `$${parseFloat(c.factura_total).toFixed(2)}` : '$0.00',
    }));

    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n';
    csv += headers.join(';') + '\n';
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }

    const filename = `consultas_${medico.nombre.replace(/\s+/g, '_')}_${anioFiltro || 'todos'}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar consultas del médico:', error);
    res.status(500).json({ message: 'Error al exportar consultas del médico' });
  }
};

/**
 * Obtener años disponibles general
 * GET /organization/medicos/anios-disponibles
 */
exports.getAniosDisponibles = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(`
      SELECT DISTINCT YEAR(fecha_consulta) AS anio FROM consultas WHERE organizacion_id = ? AND fecha_consulta IS NOT NULL
      UNION
      SELECT DISTINCT YEAR(creado_en) FROM facturas WHERE organizacion_id = ? AND creado_en IS NOT NULL
      ORDER BY anio DESC
    `, [organizacion_id, organizacion_id]);
    const anios = rows.map(r => r.anio);
    res.json(anios.length ? anios : [new Date().getFullYear()]);
  } catch (error) {
    console.error('Error al obtener años disponibles:', error);
    res.status(500).json({ message: 'Error al obtener años' });
  }
};

/**
 * Usuarios con rol "Medico" que aún no tienen registro en `medicos`.
 * GET /organization/medicos/usuarios-disponibles
 */
exports.getMedicosDisponibles = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT u.id, u.nombre, u.correo
       FROM usuarios u
       WHERE u.organizacion_id = ?
         AND u.estado = 1
         AND u.rol = 'Medico'
         AND u.id NOT IN (
           SELECT usuario_id FROM medicos
           WHERE organizacion_id = ? AND estado = 1
         )
       ORDER BY u.nombre ASC`,
      [organizacion_id, organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener usuarios disponibles:', error);
    res.status(500).json({ message: 'Error al obtener usuarios disponibles' });
  }
};
