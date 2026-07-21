// frontend/src/pages/auth/CambiarPassword.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../api/users';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';

const CambiarPassword = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await changePassword(user.id, password, false);
      toast.success('Contraseña actualizada correctamente');
      
      // Actualizar usuario en localStorage
      const updatedUser = { ...user, es_temporal: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800/90 p-8 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          Cambiar Contraseña
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Debes cambiar tu contraseña temporal antes de continuar.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Repite la contraseña"
              required
            />
          </div>
          {error && <div className="mb-4 text-sm text-red-400">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CambiarPassword;