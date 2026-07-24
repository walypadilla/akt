// frontend/src/components/forms/EmployeeForm.jsx
import React, { useState } from 'react';

const EmployeeForm = ({ initialData = {}, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    apellidos: initialData.apellidos || '',
    salario_base: initialData.salario_base || '',
    dui: initialData.dui || '',
    cotiza_isss: initialData.cotiza_isss !== undefined ? initialData.cotiza_isss : true,
    cotiza_afp: initialData.cotiza_afp !== undefined ? initialData.cotiza_afp : true,
    afp_numero: initialData.afp_numero || '',
    isss_numero: initialData.isss_numero || '',
    tipo_periodo: initialData.tipo_periodo || 'Mensual',
    fecha_ingreso: initialData.fecha_ingreso ? initialData.fecha_ingreso.split('T')[0] : '',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'Requerido';
    if (!formData.apellidos.trim()) newErrors.apellidos = 'Requerido';
    if (!formData.salario_base || parseFloat(formData.salario_base) <= 0) {
      newErrors.salario_base = 'Debe ser mayor a 0';
    }
    if (!formData.dui.trim()) {
      newErrors.dui = 'Requerido';
    } else if (!/^\d{8}-\d{1}$/.test(formData.dui)) {
      newErrors.dui = 'Formato: 00000000-0';
    }
    if (formData.afp_numero && !/^\d{12}$/.test(formData.afp_numero)) {
      newErrors.afp_numero = 'Debe tener 12 dígitos';
    }
    if (formData.isss_numero && !/^\d{9}$/.test(formData.isss_numero)) {
      newErrors.isss_numero = 'Debe tener 9 dígitos';
    }
    if (!formData.fecha_ingreso) {
      newErrors.fecha_ingreso = 'Requerida';
    }
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
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Apellidos *</label>
          <input
            type="text"
            name="apellidos"
            value={formData.apellidos}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.apellidos ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.apellidos && <p className="text-red-400 text-xs mt-1">{errors.apellidos}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Salario Base *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          name="salario_base"
          value={formData.salario_base}
          onChange={handleChange}
          className={`w-full px-3 py-2 bg-gray-700 border ${errors.salario_base ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
        />
        {errors.salario_base && <p className="text-red-400 text-xs mt-1">{errors.salario_base}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">DUI *</label>
        <input
          type="text"
          name="dui"
          value={formData.dui}
          onChange={handleChange}
          placeholder="00000000-0"
          className={`w-full px-3 py-2 bg-gray-700 border ${errors.dui ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
        />
        {errors.dui && <p className="text-red-400 text-xs mt-1">{errors.dui}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">AFP Número (12 dígitos)</label>
          <input
            type="text"
            name="afp_numero"
            value={formData.afp_numero}
            onChange={handleChange}
            maxLength="12"
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.afp_numero ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.afp_numero && <p className="text-red-400 text-xs mt-1">{errors.afp_numero}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">ISSS Número (9 dígitos)</label>
          <input
            type="text"
            name="isss_numero"
            value={formData.isss_numero}
            onChange={handleChange}
            maxLength="9"
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.isss_numero ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.isss_numero && <p className="text-red-400 text-xs mt-1">{errors.isss_numero}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            name="cotiza_isss"
            checked={formData.cotiza_isss}
            onChange={handleChange}
            className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
          />
          Cotiza ISSS
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            name="cotiza_afp"
            checked={formData.cotiza_afp}
            onChange={handleChange}
            className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
          />
          Cotiza AFP
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Período de Pago</label>
        <select
          name="tipo_periodo"
          value={formData.tipo_periodo}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="Mensual">Mensual</option>
          <option value="Quincenal">Quincenal</option>
          <option value="Semanal">Semanal</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">Define cómo se calcularán los pagos y descuentos.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de Ingreso *</label>
        <input
          type="date"
          name="fecha_ingreso"
          value={formData.fecha_ingreso}
          onChange={handleChange}
          className={`w-full px-3 py-2 bg-gray-700 border ${errors.fecha_ingreso ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
        />
        {errors.fecha_ingreso && <p className="text-red-400 text-xs mt-1">{errors.fecha_ingreso}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
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
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;