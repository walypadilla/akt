// backend/src/controllers/empleadoController.js
const Empleado = require('../models/Empleado');
const { pool } = require('../config/db');

exports.obtenerEmpleados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search, activo, page = 1, limit = 10 } = req.query;

    let activoFiltro = null;
    if (activo === 'true') activoFiltro = true;
    else if (activo === 'false') activoFiltro = false;

    const result = await Empleado.findAll(organizacion_id, {
      search,
      activo: activoFiltro,
      page,
      limit,
    });

    res.json({
      empleados: result.empleados || [],
      paginacion: {
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 10,
        totalPages: result.totalPages || 0,
      },
    });
  } catch (error) {
    console.error('❌ [obtenerEmpleados] Error:', error);
    res.status(500).json({
      empleados: [],
      paginacion: { total: 0, page: 1, limit: 10, totalPages: 0 },
      message: 'Error al obtener empleados',
      error: error.message,
    });
  }
};

exports.obtenerEmpleadoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const empleado = await Empleado.findById(id, organizacion_id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    res.json(empleado);
  } catch (error) {
    console.error('❌ [obtenerEmpleadoPorId] Error:', error);
    res.status(500).json({ message: 'Error al obtener empleado', error: error.message });
  }
};

exports.crearEmpleado = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };
    if (data.dui) {
      const exists = await Empleado.existsDui(data.dui, organizacion_id);
      if (exists) {
        return res.status(400).json({ message: 'El DUI ya está registrado para esta organización' });
      }
    }
    const id = await Empleado.create(data);
    res.status(201).json({ message: 'Empleado creado', id });
  } catch (error) {
    console.error('❌ [crearEmpleado] Error:', error);
    res.status(500).json({ message: 'Error al crear empleado', error: error.message });
  }
};

exports.actualizarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;
    const empleado = await Empleado.findById(id, organizacion_id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    if (data.dui && data.dui !== empleado.dui) {
      const exists = await Empleado.existsDui(data.dui, organizacion_id, id);
      if (exists) {
        return res.status(400).json({ message: 'El DUI ya está registrado para esta organización' });
      }
    }
    await Empleado.update(id, organizacion_id, data);
    res.json({ message: 'Empleado actualizado' });
  } catch (error) {
    console.error('❌ [actualizarEmpleado] Error:', error);
    res.status(500).json({ message: 'Error al actualizar empleado', error: error.message });
  }
};

exports.desactivarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const empleado = await Empleado.findById(id, organizacion_id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    await Empleado.delete(id, organizacion_id);
    res.json({ message: 'Empleado desactivado' });
  } catch (error) {
    console.error('❌ [desactivarEmpleado] Error:', error);
    res.status(500).json({ message: 'Error al desactivar empleado', error: error.message });
  }
};

exports.reactivarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const empleado = await Empleado.findById(id, organizacion_id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    await Empleado.reactivar(id, organizacion_id);
    res.json({ message: 'Empleado reactivado' });
  } catch (error) {
    console.error('❌ [reactivarEmpleado] Error:', error);
    res.status(500).json({ message: 'Error al reactivar empleado', error: error.message });
  }
};

exports.exportarEmpleados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search, activo } = req.query;

    let activoFiltro = null;
    if (activo === 'true') activoFiltro = true;
    else if (activo === 'false') activoFiltro = false;

    const result = await Empleado.findAll(organizacion_id, {
      search,
      activo: activoFiltro,
      page: 1,
      limit: 99999,
    });

    const empleados = result.empleados || [];
    if (empleados.length === 0) {
      return res.status(404).json({ message: 'No hay empleados para exportar' });
    }

    const data = empleados.map(e => ({
      'Nombre': e.nombre,
      'Apellidos': e.apellidos || '',
      'Salario Base': parseFloat(e.salario_base).toFixed(2),
      'DUI': e.dui,
      'AFP Número': e.afp_numero || '',
      'ISSS Número': e.isss_numero || '',
      'Cotiza ISSS': e.cotiza_isss ? 'Sí' : 'No',
      'Cotiza AFP': e.cotiza_afp ? 'Sí' : 'No',
      'Fecha Ingreso': e.fecha_ingreso ? new Date(e.fecha_ingreso).toLocaleDateString('es-SV') : '',
      'Estado': e.activo === 1 ? 'Activo' : 'Inactivo',
    }));

    const headers = Object.keys(data[0]);
    let csv = '\uFEFF';
    csv += 'sep=;\n';
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

    const filename = `empleados_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ [exportarEmpleados] Error:', error);
    res.status(500).json({ message: 'Error al exportar empleados', error: error.message });
  }
};