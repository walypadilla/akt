// frontend/src/components/common/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building, 
  Users, 
  Shield, 
  Settings,
  UserPlus,
  FileText,
  ShoppingCart,
  Briefcase,
  CreditCard,
  DollarSign,
  Package,
  XCircle
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';

// Cada botón tiene su color base sólido y se "aviva" al estar activo
const linkStylesMap = {
  // --- SUPERADMIN LINKS ---
  'Dashboard': {
    inactive: 'bg-cyan-600 text-white hover:bg-cyan-500/90',
    active: 'bg-cyan-500 text-white font-bold shadow-sm'
  },
  'Organizaciones': {
    inactive: 'bg-purple-600 text-white hover:bg-purple-500/90',
    active: 'bg-purple-500 text-white font-bold shadow-sm'
  },
  'Usuarios': {
    inactive: 'bg-emerald-600 text-white hover:bg-emerald-500/90',
    active: 'bg-emerald-500 text-white font-bold shadow-sm'
  },
  'Productos': { 
    inactive: 'bg-indigo-600 text-white hover:bg-indigo-500/90',
    active: 'bg-indigo-500 text-white font-bold shadow-sm'
  },
  'SuperAdmins': {
    inactive: 'bg-amber-600 text-white hover:bg-amber-500/90',
    active: 'bg-amber-500 text-white font-bold shadow-sm'
  },
  'Contabilidad': {
    inactive: 'bg-emerald-600 text-white hover:bg-emerald-500/90',
    active: 'bg-emerald-500 text-white font-bold shadow-sm'
  },
  'Facturas por Org': { 
    inactive: 'bg-fuchsia-600 text-white hover:bg-fuchsia-500/90',
    active: 'bg-fuchsia-500 text-white font-bold shadow-sm'
  },
  'Emitidas': {
    inactive: 'bg-cyan-600 text-white hover:bg-cyan-500/90',
    active: 'bg-cyan-500 text-white font-bold shadow-sm'
  },
  'Canceladas': {
    inactive: 'bg-rose-600 text-white hover:bg-rose-500/90',
    active: 'bg-rose-500 text-white font-bold shadow-sm'
  },
  'Configuración': {
    inactive: 'bg-slate-600 text-white hover:bg-slate-500/90',
    active: 'bg-slate-500 text-white font-bold shadow-sm'
  },

  // --- ORGANIZATION LINKS ---
  'Clientes': {
    inactive: 'bg-purple-600 text-white hover:bg-purple-500/90',
    active: 'bg-purple-500 text-white font-bold shadow-sm'
  },
  'Facturas': {
    inactive: 'bg-cyan-600 text-white hover:bg-cyan-500/90',
    active: 'bg-cyan-500 text-white font-bold shadow-sm'
  },
  'Compras': {
    inactive: 'bg-amber-600 text-white hover:bg-amber-500/90',
    active: 'bg-amber-400 text-white font-bold shadow-sm'
  },
  'Empleados': {
    inactive: 'bg-emerald-600 text-white hover:bg-emerald-500/90',
    active: 'bg-emerald-500 text-white font-bold shadow-sm'
  },
  'Planillas': {
    inactive: 'bg-rose-600 text-white hover:bg-rose-500/90',
    active: 'bg-rose-500 text-white font-bold shadow-sm'
  },
};

const Sidebar = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';

  const superAdminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/organizations', icon: Building, label: 'Organizaciones' },
    { to: '/users', icon: Users, label: 'Usuarios' },
    { to: '/productos', icon: Package, label: 'Productos' },
    { to: '/superadmins', icon: Shield, label: 'SuperAdmins' },
    { to: '/contabilidad', icon: DollarSign, label: 'Contabilidad' },
    { to: '/facturas-org', icon: FileText, label: 'Facturas por Org' },
    { to: '/facturas-emitidas', icon: FileText, label: 'Emitidas' },
    { to: '/facturas-canceladas', icon: XCircle, label: 'Canceladas' },
    { to: '/saas-config', icon: Settings, label: 'Configuración' },
  ];

  const organizationLinks = [
    { to: '/mi-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/facturas', icon: FileText, label: 'Facturas' },
    { to: '/compras', icon: ShoppingCart, label: 'Compras' },
    { to: '/clientes', icon: UserPlus, label: 'Clientes' },
    { to: '/productos', icon: Package, label: 'Productos' },
    { to: '/proveedores', icon: ShoppingCart, label: 'Proveedores' },
    { to: '/inventario', icon: Package, label: 'Inventario' },
    { to: '/empleados', icon: Briefcase, label: 'Empleados' },
    { to: '/planillas', icon: CreditCard, label: 'Planillas' },
  ];

  const links = isSuperAdmin ? superAdminLinks : organizationLinks;

  return (
    <aside className="w-64 bg-[#111827] text-slate-200 flex flex-col border-r border-[#1e293b] select-none">
      {/* Branding */}
      <div className="p-5 border-b border-[#1e293b]">
        <h4 className="text-sm font-black tracking-widest text-white uppercase">
          SaaS Facturación
        </h4>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isSuperAdmin ? 'SuperAdmin' : user?.nombre}
          </p>
        </div>
      </div>

      {/* Navegación - Botones Completamente de Color */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {links.map((link) => {
          const style = linkStylesMap[link.label] || {
            inactive: 'bg-slate-600 text-white hover:bg-slate-500',
            active: 'bg-slate-400 text-white font-black'
          };

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-150 font-bold text-xs uppercase tracking-wider ${
                  isActive ? style.active : style.inactive
                }`
              }
            >
              <link.icon className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;