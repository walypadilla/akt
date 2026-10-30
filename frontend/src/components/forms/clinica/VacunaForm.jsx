// frontend/src/components/forms/clinica/VacunaForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Syringe, FileText, Calendar, Package, AlertCircle, Info } from 'lucide-react';
import Select from 'react-select';
import { getProductos } from '../../../api/productos';
import { toast } from 'react-toastify';

const VacunaForm = ({ initialData = {}, vacunasExistentes = [], onSubmit, onCancel, loading = false, isEditing = false }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    dias_recordatorio: 365,
    producto_id: '',
  });
  const [productos, setProductos] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      nombre: initialData.nombre || '',
      descripcion: initialData.descripcion || '',
      dias_recordatorio: initialData.dias_recordatorio || 365,
      producto_id: initialData.producto_id || '',
    });
  }, [initialData]);

  useEffect(() => {
    const loadProductos = async () => {
      try {
        const data = await getProductos({ limit: 99999 });
        const todos = data.productos || data || [];
        const soloProductos = todos.filter((p) => !p.tipo || p.tipo === 'Producto');
        setProductos(soloProductos);
      } catch (err) {
        console.error('Error al cargar productos:', err);
        toast.error('No se pudieron cargar los productos');
      }
    };
    loadProductos();
  }, []);

  const productoOptions = useMemo(() => 
    productos.map(p => ({
      value: p.id,
      label: `${p.nombre} — Stock: ${p.stock_actual} — $${parseFloat(p.precio_unitario || 0).toFixed(2)}`
    })), [productos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleProductChange = (option) => {
    const id = option ? option.value : '';
    const prod = productos.find((p) => p.id === id);
    setFormData((prev) => ({
      ...prev,
      producto_id: id,
      nombre: prod ? prev.nombre?.trim() || prod.nombre : prev.nombre,
    }));
    if (errors.producto_id) setErrors((prev) => ({ ...prev, producto_id: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!formData.producto_id) {
      newErrors.producto_id = 'Debes seleccionar un producto.';
    }
    
    const nombreLimpio = formData.nombre.trim();
    if (!nombreLimpio) {
      newErrors.nombre = 'El nombre es obligatorio';
    } else if (!isEditing) {
      // Validar duplicados (ignorando mayúsculas/minúsculas)
      const existe = vacunasExistentes.some(
        v => v.nombre.toLowerCase() === nombreLimpio.toLowerCase()
      );
      if (existe) {
        newErrors.nombre = 'Ya existe una vacuna con este nombre en el catálogo.';
      }
    }

    if (!formData.dias_recordatorio || formData.dias_recordatorio < 1) {
      newErrors.dias_recordatorio = 'Debe indicar los días para la próxima dosis';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      nombre: nombreLimpio,
      descripcion: formData.descripcion.trim() || null,
      dias_recordatorio: parseInt(formData.dias_recordatorio),
      producto_id: parseInt(formData.producto_id),
    });
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 bg-gray-700 border ${
      errors[field] ? 'border-red-500' : 'border-gray-600'
    } rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg text-blue-200 text-xs flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">¿Cómo funciona?</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>La vacuna se vincula a un <strong>Producto</strong>.</li>
            <li>Al aplicarse, se descuenta 1 unidad del inventario.</li>
          </ul>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <Package size={14} className="text-purple-400" /> Producto vinculado *
        </label>
        <Select
          options={productoOptions}
          value={productoOptions.find(o => o.value === formData.producto_id) || null}
          onChange={handleProductChange}
          placeholder="Buscar producto..."
          isSearchable
          isClearable
          styles={{
            control: (base, state) => ({
              ...base,
              backgroundColor: '#374151',
              borderColor: state.isFocused ? '#a855f7' : (errors.producto_id ? '#ef4444' : '#4b5563'),
              boxShadow: state.isFocused ? '0 0 0 1px #a855f7' : 'none',
              color: 'white',
            }),
            singleValue: (base) => ({ ...base, color: 'white' }),
            input: (base) => ({ ...base, color: 'white' }),
            menu: (base) => ({ ...base, backgroundColor: '#1f2937', border: '1px solid #4b5563', zIndex: 50 }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isSelected ? '#7e22ce' : state.isFocused ? '#581c87' : '#1f2937',
              color: 'white',
              cursor: 'pointer',
            }),
            placeholder: (base) => ({ ...base, color: '#9ca3af' })
          }}
        />
        {errors.producto_id && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {errors.producto_id}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <Syringe size={14} className="text-purple-400" /> Nombre de la Vacuna *
        </label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          placeholder="Ej: Antirrábica, Séxtuple..."
          className={inputClass('nombre')}
        />
        {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <Calendar size={14} className="text-purple-400" /> Días para próxima dosis *
        </label>
        <input
          type="number"
          min="1"
          name="dias_recordatorio"
          value={formData.dias_recordatorio}
          onChange={handleChange}
          placeholder="365"
          className={inputClass('dias_recordatorio')}
        />
        {errors.dias_recordatorio && <p className="text-red-400 text-xs mt-1">{errors.dias_recordatorio}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <FileText size={14} className="text-purple-400" /> Descripción / Notas
        </label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          rows={2}
          placeholder="Notas sobre la vacuna..."
          className={inputClass('descripcion')}
        />
      </div>

      <div className="flex justify-end gap-3 p-2 border-t border-gray-700">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">Cancelar</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 shadow-md shadow-purple-900/30">
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Vacuna'}
        </button>
      </div>
    </form>
  );
};

export default VacunaForm;