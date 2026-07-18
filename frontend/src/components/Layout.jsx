// frontend/src/components/Layout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      {/* Sidebar fijo en su lugar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* 
        Contenedor de la vista: 
        - Agregamos una transición en el padding izquierdo (pl) para que coincida con el ancho del sidebar dinámico (w-64 o w-20).
        - h-screen y overflow-y-auto garantizan que el scroll funcione SOLO dentro de este contenedor.
      */}
      <div 
        className={`flex-1 flex flex-col h-screen overflow-hidden bg-gray-900 transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'pl-64' : 'pl-20'}`}
      >
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;