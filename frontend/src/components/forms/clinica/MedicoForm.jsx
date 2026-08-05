// frontend/src/forms/clinica/MedicoForm.jsx
import React, { useState } from 'react';

const MedicoForm = ({
  initialData = {},
  usuarios = [],
  onSubmit,
  onCancel,
  loading,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState({
    usuario_id: initialData.usuario_id || '',
    especialidad: initialData.especialidad || '',
    numero_licencia: initialData.numero_licencia || '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.usuario_id) newErrors.usuario_id = 'Seleccione un usuario';
    if (!formData.especialidad) newErrors.especialidad = 'La especialidad es obligatoria';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Usuario (Médico) *</label>
        <select
          name="usuario_id"
          value={formData.usuario_id}
          onChange={handleChange}
          className={`w-full px-3 py-2 bg-gray-700 border ${errors.usuario_id ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
        >
          <option value="">Seleccionar usuario</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre} - {u.correo}
            </option>
          ))}
        </select>
        {errors.usuario_id && <p className="text-red-400 text-xs mt-1">{errors.usuario_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Especialidad *</label>
        <input
          type="text"
          name="especialidad"
          value={formData.especialidad}
          onChange={handleChange}
          placeholder="Ej. Cardiología, Odontología, Medicina General..."
          className={`w-full px-3 py-2 bg-gray-700 border ${errors.especialidad ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
        />
        {errors.especialidad && <p className="text-red-400 text-xs mt-1">{errors.especialidad}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Número de Licencia</label>
        <input
          type="text"
          name="numero_licencia"
          value={formData.numero_licencia}
          onChange={handleChange}
          placeholder="Ej. 12345-6"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
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
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default MedicoForm;