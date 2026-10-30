const HistorialPeso = require('../../models/HistorialPeso');

// ============ KPIs ============
exports.kpis = async (req, res) => {
  try {
    const data = await HistorialPeso.contadoresKPI(req.organizacion_id);
    res.json(data);
  } catch (e) {
    console.error('Error KPIs peso:', e);
    res.status(500).json({ message: 'Error al obtener KPIs' });
  }
};

// ============ Pacientes con último peso ============
exports.listarPacientes = async (req, res) => {
  try {
    const { filtro = 'todos' } = req.query;
    const data = await HistorialPeso.listarPacientesKPI(req.organizacion_id, filtro);
    res.json(data);
  } catch (e) {
    console.error('Error listar pacientes peso:', e);
    res.status(500).json({ message: 'Error al listar pacientes' });
  }
};

// ============ Historial de un paciente ============
exports.historialPaciente = async (req, res) => {
  try {
    const data = await HistorialPeso.listarPorPaciente(req.params.id, req.organizacion_id);
    res.json(data);
  } catch (e) {
    console.error('Error historial peso:', e);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
};

// ============ Registro manual rápido ============
exports.registroRapido = async (req, res) => {
  try {
    const { paciente_id, peso, observaciones, fecha_registro } = req.body;

    if (!paciente_id || !peso || Number(peso) <= 0) {
      return res.status(400).json({ message: 'Paciente y peso (>0) requeridos' });
    }

    const id = await HistorialPeso.crear({
      organizacion_id: req.organizacion_id,
      paciente_id,
      peso: Number(peso),
      origen: 'Manual',
      usuario_id: req.usuario_id,
      observaciones,
      fecha_registro,
    });

    res.status(201).json({ id, message: 'Peso registrado' });
  } catch (e) {
    console.error('Error registro rápido:', e);
    res.status(500).json({ message: 'Error al registrar peso' });
  }
};

// ============ Eliminar registro ============
exports.eliminar = async (req, res) => {
  try {
    const ok = await HistorialPeso.eliminar(req.params.id, req.organizacion_id);
    res.json({ ok });
  } catch (e) {
    console.error('Error eliminar peso:', e);
    res.status(500).json({ message: 'Error al eliminar' });
  }
};

// ============ Actualizar rango de peso ideal ============
exports.actualizarPesoIdeal = async (req, res) => {
  try {
    const { peso_ideal_min, peso_ideal_max } = req.body;
    const ok = await HistorialPeso.actualizarPesoIdeal(
      req.params.id,
      req.organizacion_id,
      peso_ideal_min ?? null,
      peso_ideal_max ?? null
    );
    res.json({ ok });
  } catch (e) {
    console.error('Error actualizar peso ideal:', e);
    res.status(500).json({ message: 'Error al actualizar rango' });
  }
};

// ============ Exportar CSV por filtro KPI ============
exports.exportarFiltrados = async (req, res) => {
  try {
    const { filtro = 'todos' } = req.query;
    const pacientes = await HistorialPeso.listarPacientesKPI(req.organizacion_id, filtro);

    if (pacientes.length === 0) {
      return res.status(404).json({ message: 'No hay pacientes para exportar' });
    }

    const rows = [];
    for (const p of pacientes) {
      const historial = await HistorialPeso.listarPorPaciente(p.id, req.organizacion_id);
      if (historial.length === 0) {
        rows.push({
          Paciente: `${p.nombre} ${p.apellidos || ''}`.trim(),
          Expediente: p.codigo_expediente || '',
          Especie: p.especie || '',
          Raza: p.raza || '',
          Cliente: p.cliente_nombre || '',
          Clasificacion: p.clasificacion,
          Fecha: '',
          Peso_kg: '',
          Origen: '',
          Registrado_por: '',
          Observaciones: 'Sin registros',
        });
      } else {
        for (const h of historial) {
          rows.push({
            Paciente: `${p.nombre} ${p.apellidos || ''}`.trim(),
            Expediente: p.codigo_expediente || '',
            Especie: p.especie || '',
            Raza: p.raza || '',
            Cliente: p.cliente_nombre || '',
            Clasificacion: p.clasificacion,
            Fecha: new Date(h.fecha_registro).toLocaleString('es-SV'),
            Peso_kg: h.peso,
            Origen: h.origen,
            Registrado_por: h.usuario_nombre || '',
            Observaciones: h.observaciones || '',
          });
        }
      }
    }

    const csv = buildCSV(rows);
    const filename = `control_peso_${filtro}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (e) {
    console.error('Error exportar pesos:', e);
    res.status(500).json({ message: 'Error al exportar' });
  }
};

// ============ Exportar CSV de un paciente ============
exports.exportarHistorialPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const historial = await HistorialPeso.listarPorPaciente(id, req.organizacion_id);

    if (historial.length === 0) {
      return res.status(404).json({ message: 'Sin registros de peso' });
    }

    const rows = historial.map((h) => ({
      Fecha: new Date(h.fecha_registro).toLocaleString('es-SV'),
      Peso_kg: h.peso,
      Origen: h.origen,
      Registrado_por: h.usuario_nombre || '',
      Observaciones: h.observaciones || '',
    }));

    const csv = buildCSV(rows);
    const filename = `historial_peso_${id}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (e) {
    console.error('Error exportar historial:', e);
    res.status(500).json({ message: 'Error al exportar' });
  }
};

// Helper CSV (mismo patrón que consultaController)
function buildCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
  for (const row of rows) {
    csv += headers.map((h) => {
      let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
      val = String(val);
      if (val.includes(';') || val.includes('\n') || val.includes('"')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(';') + '\n';
  }
  return csv;
}