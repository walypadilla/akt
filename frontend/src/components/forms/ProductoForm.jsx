// frontend/src/components/forms/ProductoForm.jsx
import React, { useState, useEffect } from 'react';
import { getCategorias, getMarcas } from '../../api/inventory'; // ✅ CORREGIDO: getCategorias, getMarcas
import { getEtiquetas, asignarEtiquetaAProducto, eliminarEtiquetaDeProducto } from '../../api/tags';
import { X } from 'lucide-react';

const ProductoForm = ({ initialData = {}, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    descripcion: initialData.descripcion || '',
    precio_unitario: initialData.precio_unitario || '',
    costo_unitario: initialData.costo_unitario || '',
    costo_promedio: initialData.costo_promedio || '',
    stock_actual: initialData.stock_actual || 0,
    stock_minimo: initialData.stock_minimo || 0,
    stock_maximo: initialData.stock_maximo || 0,
    ubicacion: initialData.ubicacion || '',
    tipo: initialData.tipo || 'Producto',
    unidad_medida: initialData.unidad_medida || 'Unidad',
    codigo_barras: initialData.codigo_barras || '',
    codigo_sku: initialData.codigo_sku || '',
    peso: initialData.peso || '',
    dimensiones: initialData.dimensiones || '',
    imagen_url: initialData.imagen_url || '',
    categoria_id: initialData.categoria_id || '',
    marca_id: initialData.marca_id || '',
    es_kit: initialData.es_kit || false,
    activo: initialData.activo !== undefined ? initialData.activo : true,
  });

  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState(
    initialData.etiquetas ? initialData.etiquetas.split(',').filter(Boolean) : []
  );
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [cats, marcasData, etiqs] = await Promise.all([
          getCategorias(),
          getMarcas(),
          getEtiquetas(),
        ]);
        setCategorias(cats || []);
        setMarcas(marcasData || []);
        setEtiquetas(etiqs || []);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    loadCatalogos();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'Requerido';
    if (!formData.precio_unitario || parseFloat(formData.precio_unitario) <= 0)
      newErrors.precio_unitario = 'Debe ser mayor a 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: val });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, etiquetas: etiquetasSeleccionadas.join(',') });
    }
  };

  const agregarEtiqueta = () => {
    if (nuevaEtiqueta.trim() && !etiquetasSeleccionadas.includes(nuevaEtiqueta.trim())) {
      setEtiquetasSeleccionadas([...etiquetasSeleccionadas, nuevaEtiqueta.trim()]);
      setNuevaEtiqueta('');
    }
  };

  const eliminarEtiqueta = (tag) => {
    setEtiquetasSeleccionadas(etiquetasSeleccionadas.filter(t => t !== tag));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.nombre ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Precios y Costos */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Precio Unitario *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="precio_unitario"
            value={formData.precio_unitario}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.precio_unitario ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.precio_unitario && <p className="text-red-400 text-xs mt-1">{errors.precio_unitario}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Costo Unitario</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="costo_unitario"
            value={formData.costo_unitario}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Costo Promedio</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="costo_promedio"
            value={formData.costo_promedio}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Unidad de Medida</label>
          <input
            type="text"
            name="unidad_medida"
            value={formData.unidad_medida}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Stock */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Stock Actual</label>
          <input
            type="number"
            step="1"
            min="0"
            name="stock_actual"
            value={formData.stock_actual}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Stock Mínimo</label>
          <input
            type="number"
            step="1"
            min="0"
            name="stock_minimo"
            value={formData.stock_minimo}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Stock Máximo</label>
          <input
            type="number"
            step="1"
            min="0"
            name="stock_maximo"
            value={formData.stock_maximo}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Ubicación</label>
          <input
            type="text"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Códigos */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Código SKU</label>
          <input
            type="text"
            name="codigo_sku"
            value={formData.codigo_sku}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Código de Barras</label>
          <input
            type="text"
            name="codigo_barras"
            value={formData.codigo_barras}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Atributos físicos */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Peso (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="peso"
            value={formData.peso}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Dimensiones (LxAnxAl)</label>
          <input
            type="text"
            name="dimensiones"
            value={formData.dimensiones}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Categoría, Marca, Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
          <select
            name="categoria_id"
            value={formData.categoria_id}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Marca</label>
          <select
            name="marca_id"
            value={formData.marca_id}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Sin marca</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Producto">Producto</option>
            <option value="Servicio">Servicio</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Es Kit</label>
          <select
            name="es_kit"
            value={formData.es_kit}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={false}>No</option>
            <option value={true}>Sí</option>
          </select>
        </div>

        {/* Imagen URL */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">URL de Imagen</label>
          <input
            type="text"
            name="imagen_url"
            value={formData.imagen_url}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="https://ejemplo.com/imagen.jpg"
          />
        </div>

        {/* Estado Activo */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="activo"
            checked={formData.activo}
            onChange={handleChange}
            className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
          />
          <label className="text-sm text-gray-300">Activo</label>
        </div>

        {/* Etiquetas */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Etiquetas</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {etiquetasSeleccionadas.map((tag) => (
              <span key={tag} className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                {tag}
                <button type="button" onClick={() => eliminarEtiqueta(tag)} className="hover:text-white">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevaEtiqueta}
              onChange={(e) => setNuevaEtiqueta(e.target.value)}
              placeholder="Escribir etiqueta y presionar +"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button type="button" onClick={agregarEtiqueta} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white">
              +
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {etiquetas.filter(e => !etiquetasSeleccionadas.includes(e.nombre)).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEtiquetasSeleccionadas([...etiquetasSeleccionadas, e.nombre])}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300"
              >
                {e.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default ProductoForm;