// frontend/src/components/forms/ProductoForm.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createProducto, updateProducto, createCategoria, createMarca } from '../../api/inventory';
import { toast } from 'react-toastify';

const ProductoForm = ({
  isOpen,
  onClose,
  onSuccess,
  producto = null,
  categorias = [],
  marcas = [],
  onCategoriaCreated,
  onMarcaCreated,
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    codigo_sku: '',
    codigo_barras: '',
    tipo: 'Producto',
    precio_unitario: '',
    costo_promedio: '',
    stock_actual: 0,
    stock_minimo: 0,
    categoria_id: '',
    marca_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [showCategoriaInput, setShowCategoriaInput] = useState(false);
  const [showMarcaInput, setShowMarcaInput] = useState(false);
  const [categoriasLocal, setCategoriasLocal] = useState(categorias);
  const [marcasLocal, setMarcasLocal] = useState(marcas);

  // Actualizar listas locales cuando cambian las props
  useEffect(() => {
    setCategoriasLocal(categorias);
    setMarcasLocal(marcas);
  }, [categorias, marcas]);

  // Generar SKU automático
  const generarSKU = (nombre, categoriaId) => {
    if (!nombre) return '';
    const cat = categoriasLocal.find(c => c.id === parseInt(categoriaId));
    const prefix = cat ? cat.nombre.slice(0, 3).toUpperCase() : 'PRD';
    const namePart = nombre.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const randomNum = String(Math.floor(1000 + Math.random() * 9000));
    return `${prefix}${namePart}${randomLetter}${randomNum}`;
  };

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        codigo_sku: producto.codigo_sku || '',
        codigo_barras: producto.codigo_barras || '',
        tipo: producto.tipo || 'Producto',
        precio_unitario: producto.precio_unitario || '',
        costo_promedio: producto.costo_promedio || '',
        stock_actual: producto.stock_actual || 0,
        stock_minimo: producto.stock_minimo || 0,
        categoria_id: producto.categoria_id || '',
        marca_id: producto.marca_id || '',
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        codigo_sku: '',
        codigo_barras: '',
        tipo: 'Producto',
        precio_unitario: '',
        costo_promedio: '',
        stock_actual: 0,
        stock_minimo: 0,
        categoria_id: '',
        marca_id: '',
      });
    }
  }, [producto]);

  // Cuando cambia el nombre o la categoría, actualizar SKU automático
  useEffect(() => {
    if (!producto && formData.nombre && formData.categoria_id) {
      const nuevoSku = generarSKU(formData.nombre, formData.categoria_id);
      setFormData(prev => ({ ...prev, codigo_sku: nuevoSku }));
    }
  }, [formData.nombre, formData.categoria_id, producto]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let val = value;
    if (type === 'number') {
      val = parseFloat(value);
      if (val < 0) return;
    }
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleCreateCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    try {
      const result = await createCategoria({ nombre: nuevaCategoria.trim() });
      const newCat = { id: result.id, nombre: nuevaCategoria.trim() };
      setCategoriasLocal([...categoriasLocal, newCat]);
      setFormData(prev => ({ ...prev, categoria_id: result.id }));
      if (onCategoriaCreated) onCategoriaCreated(newCat);
      toast.success('Categoría creada');
      setNuevaCategoria('');
      setShowCategoriaInput(false);
    } catch (err) {
      toast.error('Error al crear categoría');
    }
  };

  const handleCreateMarca = async () => {
    if (!nuevaMarca.trim()) return;
    try {
      const result = await createMarca({ nombre: nuevaMarca.trim() });
      const newMarca = { id: result.id, nombre: nuevaMarca.trim() };
      setMarcasLocal([...marcasLocal, newMarca]);
      setFormData(prev => ({ ...prev, marca_id: result.id }));
      if (onMarcaCreated) onMarcaCreated(newMarca);
      toast.success('Marca creada');
      setNuevaMarca('');
      setShowMarcaInput(false);
    } catch (err) {
      toast.error('Error al crear marca');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      payload.precio_unitario = parseFloat(payload.precio_unitario) || 0;
      payload.costo_promedio = parseFloat(payload.costo_promedio) || 0;
      payload.stock_actual = parseInt(payload.stock_actual) || 0;
      payload.stock_minimo = parseInt(payload.stock_minimo) || 0;

      if (producto) {
        await updateProducto(producto.id, payload);
        toast.success('Producto actualizado');
      } else {
        await createProducto(payload);
        toast.success('Producto creado');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const esServicio = formData.tipo === 'Servicio';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 block mb-1">Tipo *</label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="Producto">Producto</option>
              <option value="Servicio">Servicio</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">SKU</label>
              <input
                type="text"
                name="codigo_sku"
                value={formData.codigo_sku}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Automático"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Código de Barras</label>
            <input
              type="text"
              name="codigo_barras"
              value={formData.codigo_barras}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Descripción</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Precio Unitario *</label>
              <input
                type="number"
                name="precio_unitario"
                step="0.01"
                min="0"
                value={formData.precio_unitario}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            {!esServicio && (
              <div>
                <label className="text-sm text-gray-300 block mb-1">Costo Promedio</label>
                <input
                  type="number"
                  name="costo_promedio"
                  step="0.01"
                  min="0"
                  value={formData.costo_promedio}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          {!esServicio && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Stock Actual</label>
                <input
                  type="number"
                  name="stock_actual"
                  min="0"
                  step="1"
                  value={formData.stock_actual}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Stock Mínimo</label>
                <input
                  type="number"
                  name="stock_minimo"
                  min="0"
                  step="1"
                  value={formData.stock_minimo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-300 block mb-1">Categoría</label>
            <div className="flex gap-2">
              <select
                name="categoria_id"
                value={formData.categoria_id}
                onChange={handleChange}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Sin categoría</option>
                {categoriasLocal.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowCategoriaInput(!showCategoriaInput)}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white text-sm"
              >
                + Nueva
              </button>
            </div>
            {showCategoriaInput && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Nombre de categoría"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleCreateCategoria}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm"
                >
                  Guardar
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Marca</label>
            <div className="flex gap-2">
              <select
                name="marca_id"
                value={formData.marca_id}
                onChange={handleChange}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Sin marca</option>
                {marcasLocal.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowMarcaInput(!showMarcaInput)}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white text-sm"
              >
                + Nueva
              </button>
            </div>
            {showMarcaInput && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={nuevaMarca}
                  onChange={(e) => setNuevaMarca(e.target.value)}
                  placeholder="Nombre de marca"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleCreateMarca}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm"
                >
                  Guardar
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : producto ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductoForm;