import React, { useState } from 'react';

const UserForm = ({ initialData = {}, onSubmit, onCancel, loading, organizacionId }) => {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    correo: initialData.correo || '',
    rol: initialData.rol || 'Vendedor',
    estado: initialData.estado || 'Activo',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Correo *
          </label>
          <input
            type="email"
            name="correo"
            value={formData.correo}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Rol *
          </label>
          <select
            name="rol"
            value={formData.rol}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          >
            <option value="Admin">Admin</option>
            <option value="Vendedor">Vendedor</option>
            <option value="Contador">Contador</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Estado
          </label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        {!initialData.id && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contraseña (temporal) *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              required={!initialData.id}
              minLength={6}
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-700 mt-6 pb-2">
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
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition disabled:opacity-50 shadow-lg shadow-purple-600/20"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;