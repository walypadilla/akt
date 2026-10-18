// frontend/src/components/forms/clinica/ExamenForm.jsx
import React, { useState, useEffect } from 'react';
import { Activity, FileText, DollarSign, Package, AlertCircle, Info } from 'lucide-react';
import { getProductos } from '../../../api/productos';
import { toast } from 'react-toastify';

const ExamenForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    plantilla_resultados: '',
    producto_id: '',
  });
  const [productos, setProductos] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      nombre: initialData.nombre || '',
      descripcion: initialData.descripcion || '',
      precio: initialData.precio || '',
      plantilla_resultados: initialData.plantilla_resultados || '',
      producto_id: initialData.producto_id || '',
    });
  }, [initialData]);

  useEffect(() => {
    const loadProductos = async () => {
      try {
        const data = await getProductos({ limit: 99999 });
        setProductos(data.productos || data || []);
      } catch (err) {
        console.error('Error al cargar productos:', err);
        toast.error('No se pudieron cargar los productos. Verifica que tengas productos de tipo Servicio.');
      }
    };
    loadProductos();
  }, []);

  // 🔄 Autofill nombre cuando se selecciona un producto y el nombre está vacío
  useEffect(() => {
    if (formData.producto_id) {
      const prod = productos.find((p) => p.id === parseInt(formData.producto_id));
      if (prod && (!formData.nombre || formData.nombre.trim() === '')) {
        setFormData((prev) => ({
          ...prev,
          nombre: prod.nombre,
          // Si el precio está vacío, también lo autofill
          precio: prev.precio === '' ? prod.precio_unitario : prev.precio,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.producto_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleProductChange = (e) => {
    const id = e.target.value;
    const prod = productos.find((p) => p.id === parseInt(id));
    setFormData((prev) => ({
      ...prev,
      producto_id: id,
      // Si el usuario no ha tocado el nombre, autofill
      nombre: prod ? (prev.nombre?.trim() || prod.nombre) : prev.nombre,
      precio: prod ? (prev.precio || prod.precio_unitario) : prev.precio,
    }));
    if (errors.producto_id) setErrors((prev) => ({ ...prev, producto_id: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.producto_id) {
      newErrors.producto_id =
        'Debes seleccionar un producto. Si no existe, primero regístralo en la sección Productos.';
    }
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (formData.precio !== '' && parseFloat(formData.precio) < 0) {
      newErrors.precio = 'El precio no puede ser negativo';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.producto_id) {
        toast.warning('Primero debes registrar el producto en la sección Productos.');
      }
      return;
    }

    onSubmit({
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || null,
      precio: formData.precio === '' ? 0 : parseFloat(formData.precio),
      plantilla_resultados: formData.plantilla_resultados.trim() || null,
      producto_id: parseInt(formData.producto_id),
    });
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 bg-gray-700 border ${
      errors[field] ? 'border-red-500' : 'border-gray-600'
    } rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Aviso informativo */}
      <div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg text-blue-200 text-xs flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">¿Cómo funciona?</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Todo examen debe estar vinculado a un producto de tipo <strong>Servicio</strong>.</li>
            <li>Al facturar una consulta con este examen, el costo se cargará automáticamente.</li>
            <li>Si el producto no existe, créalo primero en <strong>Productos</strong>.</li>
          </ul>
        </div>
      </div>

      {/* Producto vinculado — PRIMERO */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <Package size={14} className="text-purple-400" />
          Producto vinculado *
        </label>
        <select
          name="producto_id"
          value={formData.producto_id}
          onChange={handleProductChange}
          className={inputClass('producto_id')}
        >
          <option value="">Seleccionar producto...</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} — ${parseFloat(p.precio_unitario || 0).toFixed(2)}
            </option>
          ))}
        </select>
        {errors.producto_id && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {errors.producto_id}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Se autocompletará el nombre y precio del producto.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <Activity size={14} className="text-purple-400" /> Nombre del Examen *
        </label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          placeholder="Ej: Radiografía Panorámica..."
          className={inputClass('nombre')}
        />
        {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <FileText size={14} className="text-purple-400" /> Descripción
        </label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          rows={2}
          placeholder="Descripción breve o indicaciones previas..."
          className={inputClass('descripcion')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <DollarSign size={14} className="text-purple-400" /> Precio ($)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="precio"
          value={formData.precio}
          onChange={handleChange}
          placeholder="0.00"
          className={inputClass('precio')}
        />
        {errors.precio && <p className="text-red-400 text-xs mt-1">{errors.precio}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <FileText size={14} className="text-purple-400" /> Plantilla de resultados
        </label>
        <textarea
          name="plantilla_resultados"
          value={formData.plantilla_resultados}
          onChange={handleChange}
          rows={4}
          placeholder={'Ej:\nColor: \nAspecto: \nPH: \nObservaciones:'}
          className={inputClass('plantilla_resultados')}
        />
        <p className="text-xs text-gray-400 mt-1">
          Se pre-cargará al ingresar resultados.
        </p>
      </div>

      <div className="flex justify-end gap-3 p-2 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 shadow-md shadow-purple-900/30"
        >
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Examen'}
        </button>
      </div>
    </form>
  );
};

export default ExamenForm;