// backend/src/controllers/clienteController.js
const Cliente = require('../models/Cliente');

exports.obtenerClientes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre, nit } = req.query;
    const filters = {};
    if (nombre) filters.nombre = nombre;
    if (nit) filters.nit = nit;
    const clientes = await Cliente.findAll(organizacion_id, filters);
    res.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
  }
};

exports.obtenerClientePorId = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const cliente = await Cliente.findById(id, organizacion_id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ message: 'Error al obtener cliente', error: error.message });
  }
};

exports.crearCliente = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };
    if (data.nit) {
      const exists = await Cliente.existsNit(data.nit, organizacion_id);
      if (exists) {
        return res.status(400).json({ message: 'El NIT ya está registrado para esta organización' });
      }
    }
    const id = await Cliente.create(data);
    res.status(201).json({ message: 'Cliente creado', id });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ message: 'Error al crear cliente', error: error.message });
  }
};

exports.actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;
    const cliente = await Cliente.findById(id, organizacion_id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    if (data.nit && data.nit !== cliente.nit) {
      const exists = await Cliente.existsNit(data.nit, organizacion_id, id);
      if (exists) {
        return res.status(400).json({ message: 'El NIT ya está registrado para esta organización' });
      }
    }
    await Cliente.update(id, organizacion_id, data);
    res.json({ message: 'Cliente actualizado' });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ message: 'Error al actualizar cliente', error: error.message });
  }
};

exports.eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Cliente.delete(id, organizacion_id);
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ message: 'Error al eliminar cliente', error: error.message });
  }
};