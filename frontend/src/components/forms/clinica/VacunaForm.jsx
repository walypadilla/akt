// frontend/src/components/forms/clinica/VacunaForm.jsx
import React, { useState, useEffect } from 'react';
import { Syringe, FileText, Calendar, Package, AlertCircle, Info } from 'lucide-react';
import { getProductos } from '../../../api/productos';
import { toast } from 'react-toastify';

const VacunaForm = ({ initialData = {}, onSubmit, onCancel, loading = false, isEditing = false }) => {
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

        const soloProductos = todos.filter(
            (p) => !p.tipo || p.tipo === 'Producto'
        );

        setProductos(soloProductos);
      } catch (err) {
        console.error('Error al cargar productos:', err);
        toast.error('No se pudieron cargar los productos');
      }
    };
    loadProductos();
  }, []);

  useEffect(() => {
    if (formData.producto_id) {
      const prod = productos.find((p) => p.id === parseInt(formData.producto_id));
      if (prod && (!formData.nombre || formData.nombre.trim() === '')) {
        setFormData((prev) => ({ ...prev, nombre: prod.nombre }));
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
      nombre: prod ? prev.nombre?.trim() || prod.nombre : prev.nombre,
    }));
    if (errors.producto_id) setErrors((prev) => ({ ...prev, producto_id: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.producto_id) {
      newErrors.producto_id =
        'Debes seleccionar un producto. Si no existe, primero regístralo en Productos.';
    }
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.dias_recordatorio || formData.dias_recordatorio < 1) {
      newErrors.dias_recordatorio = 'Debe indicar los días para la próxima dosis';
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
        <div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg text-blue-200 text-xs flex items-start gap-2">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <div>
                <p className="font-semibold mb-1">¿Cómo funciona?</p>
                <ul className="list-disc list-inside space-y-0.5">
                <li>La vacuna debe vincularse a un <strong>Producto</strong> (no a un servicio).</li>
                <li>Al aplicarla, se descuenta 1 unidad del inventario automáticamente.</li>
                <li>Si no tienes el producto, créalo primero en <strong>Productos → tipo: Producto</strong>.</li>
                </ul>
            </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <Package size={14} className="text-purple-400" /> Producto vinculado *
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
                {p.nombre} — Stock: {p.stock_actual} — ${parseFloat(p.precio_unitario || 0).toFixed(2)}
                </option>
            ))}
            </select>
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
        <p className="text-xs text-gray-400 mt-1">
          Ej: 365 = 1 año, 180 = 6 meses, 30 = 1 mes.
        </p>
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
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Vacuna'}
        </button>
      </div>
    </form>
  );
};

export default VacunaForm;