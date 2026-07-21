const Producto = require('../models/Producto');

exports.obtenerProductos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id || req.query.organizacion_id || 1; // SuperAdmin usa org 1
    const productos = await Producto.findAll(organizacion_id);
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener productos', error: error.message });
  }
};

exports.crearProducto = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id || req.body.organizacion_id || 1;
    const data = { ...req.body, organizacion_id };
    const id = await Producto.create(data);
    res.status(201).json({ message: 'Producto creado', id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id || req.body.organizacion_id || 1;
    await Producto.update(id, organizacion_id, req.body);
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id || 1;
    await Producto.delete(id, organizacion_id);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
};

exports.incrementStock = async (producto_id, organizacion_id, cantidad) => {
  // Ya existe la lógica en el modelo
};