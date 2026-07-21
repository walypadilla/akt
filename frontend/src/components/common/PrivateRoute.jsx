// frontend/src/components/common/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Verificando autenticación..." />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Si está autenticado, renderiza el contenido (Layout)
  return <Outlet />;
};

export default PrivateRoute;