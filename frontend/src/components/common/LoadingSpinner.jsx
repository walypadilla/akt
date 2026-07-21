// frontend/src/components/common/LoadingSpinner.jsx
import React from 'react';

const LoadingSpinner = ({ message = 'Cargando...' }) => {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-gray-400">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;