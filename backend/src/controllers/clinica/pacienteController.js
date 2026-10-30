const Paciente = require('../../models/Paciente');
const Cliente = require('../../models/Cliente');

exports.listar = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    
    // 1. Extraemos TODAS las variables, incluyendo la paginación y los nuevos filtros
    const { search, tipo_paciente, activo, dui, sexo, page, limit } = req.query;
    
    // 2. Pasamos los filtros completos al modelo (Paciente.findAll)
    const pacientes = await Paciente.findAll(
      organizacion_id, 
      { search, tipo_paciente, activo, dui, sexo },
      page || 1,
      limit || 10
    );
    
    res.json(pacientes);
  } catch (error) {
    console.error('Error al listar pacientes:', error);
    res.status(500).json({ message: 'Error al listar pacientes' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const paciente = await Paciente.findById(id, organizacion_id);
    if (!paciente) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }
    res.json(paciente);
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ message: 'Error al obtener paciente' });
  }
};

exports.crear = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };

    const cliente = await Cliente.findById(data.cliente_id, organizacion_id);
    if (!cliente) {
      return res.status(400).json({ message: 'Cliente no encontrado' });
    }

    const id = await Paciente.create(data);
    res.status(201).json({ message: 'Paciente creado', id });
  } catch (error) {
    console.error('Error al crear paciente:', error);
    res.status(500).json({ message: 'Error al crear paciente' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;

    const paciente = await Paciente.findById(id, organizacion_id);
    if (!paciente) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    await Paciente.update(id, organizacion_id, data);
    res.json({ message: 'Paciente actualizado' });
  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    res.status(500).json({ message: 'Error al actualizar paciente' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Paciente.delete(id, organizacion_id);
    res.json({ message: 'Paciente desactivado' });
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    res.status(500).json({ message: 'Error al eliminar paciente' });
  }
};

exports.reactivarPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Paciente.reactivar(id, organizacion_id);
    res.json({ message: 'Paciente reactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error al reactivar paciente:', error);
    res.status(500).json({ message: 'Error al reactivar paciente', error: error.message });
  }
};

// ============================================================
// EXPORTAR TODOS LOS PACIENTES (CSV)
// ============================================================
exports.exportarTodos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const result = await Paciente.findAll(organizacion_id, {}, 1, 99999);
    const pacientes = result.pacientes || [];

    if (pacientes.length === 0) {
      return res.status(404).json({ message: 'No hay pacientes para exportar' });
    }

    // Construir datos para CSV
    const data = pacientes.map(p => ({
      'Nombre': p.nombre,
      'Apellidos': p.apellidos || '',
      'Tipo': p.tipo_paciente || 'Humano',
      'Dueño/Cliente': p.cliente_nombre || '',
      'DUI': p.dui || '',
      'Fecha Nacimiento': p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString('es-SV') : '',
      'Sexo': p.genero === 'M' ? 'Masculino' : p.genero === 'F' ? 'Femenino' : 'Otro',
      'Especie': p.especie || '',
      'Raza': p.raza || '',
      'Color': p.color || '',
      'Peso (kg)': p.peso || '',
      'Chip/Tatuaje': p.chip || '',
      'Teléfono': p.telefono || '',
      'Correo': p.correo || '',
      'Alergias': p.alergias || '',
      'Antecedentes': p.antecedentes || '',
      'Estado': p.activo === 1 ? 'Activo' : 'Inactivo',
      'Fecha Registro': p.created_at ? new Date(p.created_at).toLocaleDateString('es-SV') : '',
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

    const filename = `pacientes_todos_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Error al exportar todos los pacientes:', error);
    res.status(500).json({ message: 'Error al exportar pacientes', error: error.message });
  }
};

// ============================================================
// EXPORTAR PACIENTES FILTRADOS (CSV)
// ============================================================
exports.exportarFiltrados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search, dui, tipo_paciente, activo } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (dui) filters.dui = dui;
    if (tipo_paciente) filters.tipo_paciente = tipo_paciente;
    if (activo !== undefined && activo !== '') filters.activo = activo;

    const result = await Paciente.findAll(organizacion_id, filters, 1, 99999);
    const pacientes = result.pacientes || [];

    if (pacientes.length === 0) {
      return res.status(404).json({ message: 'No hay pacientes con los filtros aplicados' });
    }

    // Construir datos para CSV (misma estructura que exportarTodos)
    const data = pacientes.map(p => ({
      'Nombre': p.nombre,
      'Apellidos': p.apellidos || '',
      'Tipo': p.tipo_paciente || 'Humano',
      'Dueño/Cliente': p.cliente_nombre || '',
      'DUI': p.dui || '',
      'Fecha Nacimiento': p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString('es-SV') : '',
      'Sexo': p.genero === 'M' ? 'Masculino' : p.genero === 'F' ? 'Femenino' : 'Otro',
      'Especie': p.especie || '',
      'Raza': p.raza || '',
      'Color': p.color || '',
      'Peso (kg)': p.peso || '',
      'Chip/Tatuaje': p.chip || '',
      'Teléfono': p.telefono || '',
      'Correo': p.correo || '',
      'Alergias': p.alergias || '',
      'Antecedentes': p.antecedentes || '',
      'Estado': p.activo === 1 ? 'Activo' : 'Inactivo',
      'Fecha Registro': p.created_at ? new Date(p.created_at).toLocaleDateString('es-SV') : '',
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

    const filename = `pacientes_filtrados_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Error al exportar pacientes filtrados:', error);
    res.status(500).json({ message: 'Error al exportar pacientes filtrados', error: error.message });
  }
};