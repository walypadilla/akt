// frontend/src/components/common/ResetPasswordModal.jsx
import React, { useState } from 'react';

const ResetPasswordModal = ({ isOpen, onClose, onReset, loading = false }) => {
  const [password, setPassword] = useState('');
  const [isTemporal, setIsTemporal] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrors({ password: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }
    onReset({ password, es_temporal: isTemporal });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-white mb-4">Restablecer Contraseña</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border ${errors.password ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isTemporal"
              checked={isTemporal}
              onChange={(e) => setIsTemporal(e.target.checked)}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="isTemporal" className="text-sm text-gray-300">
              Contraseña temporal (el usuario deberá cambiarla al iniciar sesión)
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Restableciendo...' : 'Restablecer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;