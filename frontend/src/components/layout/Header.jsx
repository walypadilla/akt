// frontend/src/components/layout/Header.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../api/auth';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determinar el título del panel
  const getPanelTitle = () => {
    if (user?.rol === 'SUPER_ADMIN') return 'SuperAdmin';
    if (user?.organizacion_nombre) return user.organizacion_nombre;
    return 'Organización';
  };

  // Determinar el rol del usuario
  const getRolLabel = () => {
    if (user?.rol === 'SUPER_ADMIN') return 'SuperAdmin';
    return user?.rol || 'Usuario';
  };

  return (
    <header className="bg-[#1e293b] border-b border-gray-800 px-6 py-4 flex justify-between items-center">
      <h2 className="text-xl font-semibold text-gray-200">
        Panel de {getPanelTitle()}
      </h2>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300">{user?.nombre || 'Usuario'}</span>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
            {getRolLabel()}
          </span>
          {user?.es_temporal && (
            <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded-full">
              Temporal
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
};

export default Header;