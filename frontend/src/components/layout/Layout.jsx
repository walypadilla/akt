// frontend/src/components/common/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  return (
    <div className="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden">
      {/* Barra lateral fija */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabecera superior */}
        <Header />
        
        {/* Contenedor principal con scroll independiente */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0b0f19]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;