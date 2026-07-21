// backend/src/controllers/empleadoController.js
const Empleado = require('../models/Empleado');
const { pool } = require('../config/db');

exports.obtenerEmpleados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre, dui } = req.query;
    const filters = {};
    if (nombre) filters.nombre = nombre;
    if (dui) filters.dui = dui;
    const empleados = await Empleado.findAll(organizacion_id, filters);
    res.json(empleados);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ message: 'Error al obtener empleados', error: error.message });
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
    console.error('Error al obtener empleado:', error);
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
    console.error('Error al crear empleado:', error);
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
    console.error('Error al actualizar empleado:', error);
    res.status(500).json({ message: 'Error al actualizar empleado', error: error.message });
  }
};

exports.eliminarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const empleado = await Empleado.findById(id, organizacion_id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    // Verificar si tiene planillas asociadas
    const [planillas] = await pool.query(
      'SELECT id FROM planillas_mensuales WHERE empleado_id = ? LIMIT 1',
      [id]
    );
    if (planillas.length > 0) {
      return res.status(400).json({ message: 'No se puede eliminar un empleado con planillas asociadas' });
    }
    await Empleado.delete(id, organizacion_id);
    res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({ message: 'Error al eliminar empleado', error: error.message });
  }
};