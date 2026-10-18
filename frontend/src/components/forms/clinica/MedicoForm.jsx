// frontend/src/components/forms/clinica/MedicoForm.jsx
import React, { useState, useEffect } from 'react';
import { User, Award, FileText } from 'lucide-react';

const MedicoForm = ({
  initialData = {},
  usuarios = [],
  onSubmit,
  onCancel,
  loading = false,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState({
    usuario_id: '',
    especialidad: '',
    numero_licencia: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      usuario_id: initialData.usuario_id || '',
      especialidad: initialData.especialidad || '',
      numero_licencia: initialData.numero_licencia || '',
    });
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!isEditing && !formData.usuario_id) newErrors.usuario_id = 'Debe seleccionar un usuario';
    if (!formData.especialidad) newErrors.especialidad = 'La especialidad es obligatoria';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      especialidad: formData.especialidad,
      numero_licencia: formData.numero_licencia || null,
    };
    if (!isEditing) payload.usuario_id = formData.usuario_id;

    onSubmit(payload);
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 bg-gray-700 border ${
      errors[field] ? 'border-red-500' : 'border-gray-600'
    } rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEditing ? (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <User size={14} className="text-purple-400" />
            Usuario con rol Médico *
          </label>
          <select
            name="usuario_id"
            value={formData.usuario_id}
            onChange={handleChange}
            className={inputClass('usuario_id')}
          >
            <option value="">Seleccionar usuario</option>
            {usuarios.length === 0 ? (
              <option value="" disabled>
                No hay usuarios con rol Médico disponibles
              </option>
            ) : (
              usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} — {u.correo}
                </option>
              ))
            )}
          </select>
          {errors.usuario_id && <p className="text-red-400 text-xs mt-1">{errors.usuario_id}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Solo aparecen usuarios con rol <strong>Médico</strong> creados por el SuperAdmin.
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <User size={14} className="text-purple-400" />
            Usuario
          </label>
          <input
            type="text"
            disabled
            value={initialData.nombre || ''}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg text-sm cursor-not-allowed"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <Award size={14} className="text-purple-400" />
          Especialidad *
        </label>
        <input
          type="text"
          name="especialidad"
          value={formData.especialidad}
          onChange={handleChange}
          placeholder="Ej. Pediatría, Cardiología..."
          className={inputClass('especialidad')}
        />
        {errors.especialidad && <p className="text-red-400 text-xs mt-1">{errors.especialidad}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <FileText size={14} className="text-purple-400" />
          Número de Licencia / JVPM
        </label>
        <input
          type="text"
          name="numero_licencia"
          value={formData.numero_licencia}
          onChange={handleChange}
          placeholder="Ej. JVPM-12345"
          className={inputClass('numero_licencia')}
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
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default MedicoForm;