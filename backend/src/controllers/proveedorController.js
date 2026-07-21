// backend/src/controllers/proveedorController.js
const Proveedor = require('../models/Proveedor');

exports.obtenerProveedores = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre, nit } = req.query;
    const filters = {};
    if (nombre) filters.nombre = nombre;
    if (nit) filters.nit = nit;
    const proveedores = await Proveedor.findAll(organizacion_id, filters);
    res.json(proveedores);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ message: 'Error al obtener proveedores', error: error.message });
  }
};

exports.obtenerProveedorPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const proveedor = await Proveedor.findById(id, organizacion_id);
    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.json(proveedor);
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    res.status(500).json({ message: 'Error al obtener proveedor', error: error.message });
  }
};

exports.crearProveedor = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };
    const id = await Proveedor.create(data);
    res.status(201).json({ message: 'Proveedor creado', id });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ message: 'Error al crear proveedor', error: error.message });
  }
};

exports.actualizarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;
    const proveedor = await Proveedor.findById(id, organizacion_id);
    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    await Proveedor.update(id, organizacion_id, data);
    res.json({ message: 'Proveedor actualizado' });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ message: 'Error al actualizar proveedor', error: error.message });
  }
};

exports.eliminarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Proveedor.delete(id, organizacion_id);
    res.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ message: 'Error al eliminar proveedor', error: error.message });
  }
};