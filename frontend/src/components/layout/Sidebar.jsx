// frontend/src/components/common/Sidebar.jsx
import React, { useState } from 'react';
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

// Paleta de colores de alto contraste: viva, sin grises aburridos y sin repetir colores cercanos
const linkStylesMap = {
  // --- SUPERADMIN LINKS ---
  'Dashboard': {
    inactive: 'bg-cyan-600 text-white hover:bg-cyan-500/90',
    active: 'bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
  },
  'Organizaciones': {
    inactive: 'bg-purple-600 text-white hover:bg-purple-500/90',
    active: 'bg-purple-400 text-slate-950 font-black shadow-lg shadow-purple-500/20'
  },
  'Usuarios': {
    inactive: 'bg-emerald-600 text-white hover:bg-emerald-500/90',
    active: 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
  },
  'Productos': { 
    inactive: 'bg-indigo-600 text-white hover:bg-indigo-500/90',
    active: 'bg-indigo-400 text-slate-950 font-black shadow-lg shadow-indigo-500/20'
  },
  'SuperAdmins': {
    inactive: 'bg-amber-600 text-white hover:bg-amber-500/90',
    active: 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20'
  },
  'Contabilidad': {
    inactive: 'bg-lime-600 text-white hover:bg-lime-500/90',
    active: 'bg-lime-400 text-slate-950 font-black shadow-lg shadow-lime-500/20'
  },
  'Facturas por Org': { 
    inactive: 'bg-fuchsia-600 text-white hover:bg-fuchsia-500/90',
    active: 'bg-fuchsia-400 text-slate-950 font-black shadow-lg shadow-fuchsia-500/20'
  },
  'Emitidas': {
    inactive: 'bg-sky-600 text-white hover:bg-sky-500/90',
    active: 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/20'
  },
  'Canceladas': {
    inactive: 'bg-rose-600 text-white hover:bg-rose-500/90',
    active: 'bg-rose-400 text-slate-950 font-black shadow-lg shadow-rose-500/20'
  },
  'Configuración': {
    inactive: 'bg-teal-600 text-white hover:bg-teal-500/90',
    active: 'bg-teal-400 text-slate-950 font-black shadow-lg shadow-teal-500/20'
  },

  // --- ORGANIZATION LINKS (Sin repetir colores seguidos y sin grises) ---
  'Dashboard': {
    inactive: 'bg-cyan-600 text-white hover:bg-cyan-500/90',
    active: 'bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
  },
  'Facturas': {
    inactive: 'bg-blue-600 text-white hover:bg-blue-500/90',
    active: 'bg-blue-400 text-slate-950 font-black shadow-lg shadow-blue-500/20'
  },
  'Compras': {
    inactive: 'bg-amber-600 text-white hover:bg-amber-500/90',
    active: 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20'
  },
  'Clientes': {
    inactive: 'bg-fuchsia-600 text-white hover:bg-fuchsia-500/90',
    active: 'bg-fuchsia-400 text-slate-950 font-black shadow-lg shadow-fuchsia-500/20'
  },
  'Productos': {
    inactive: 'bg-purple-600 text-white hover:bg-purple-500/90',
    active: 'bg-purple-400 text-slate-950 font-black shadow-lg shadow-purple-500/20'
  },
  'Proveedores': {
    inactive: 'bg-teal-600 text-white hover:bg-teal-500/90',
    active: 'bg-teal-400 text-slate-950 font-black shadow-lg shadow-teal-500/20'
  },
  'Inventario': {
    inactive: 'bg-lime-500 text-slate-950 font-bold hover:bg-lime-400',
    active: 'bg-lime-400 text-slate-950 font-black shadow-lg shadow-lime-500/20'
  },
  'Empleados': {
    inactive: 'bg-emerald-600 text-white hover:bg-emerald-500/90',
    active: 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
  },
  'Planillas': {
    inactive: 'bg-rose-600 text-white hover:bg-rose-500/90',
    active: 'bg-rose-400 text-slate-950 font-black shadow-lg shadow-rose-500/20'
  },
};

const Sidebar = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';

  // 1. Estado para manejar error de imagen (si da 404 muestra el texto)
  const [imgError, setImgError] = useState(false);

  // 2. Buscar logo en todas las ubicaciones posibles del objeto user
  const rawLogoUrl = user?.logo_url || user?.organizacion?.logo_url || user?.organizacion_logo;

  // 3. Ajustado a puerto 5000 (estándar Express/Node) por si VITE_API_URL no está definido
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Si la URL ya trae http (ej. Cloudinary/S3) la dejamos intacta; si empieza con "/", le agregamos el host del backend
  const fullLogoUrl = rawLogoUrl?.startsWith('http') 
    ? rawLogoUrl 
    : (rawLogoUrl?.startsWith('/') ? `${API_URL}${rawLogoUrl}` : rawLogoUrl);

  // 4. Nombre para mostrar si no hay logo o falla al cargar
  const nombreEmpresa = user?.nombre_empresa || user?.organizacion_nombre || user?.organizacion?.nombre_empresa || 'SaaS Facturación';

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
      {/* Branding con logo dinámico + Empresa + Usuario */}
      <div className="p-5 border-b border-[#1e293b] flex flex-col gap-3 overflow-hidden">
    
        {/* Contenedor del Logo o Nombre de la Empresa principal */}
        <div className="flex items-center gap-3 min-h-[40px]">
          {fullLogoUrl && !imgError ? (
            <img 
              src={fullLogoUrl} 
              alt="Logo Empresa" 
              onError={() => {
                console.warn('No se pudo cargar el logo desde:', fullLogoUrl);
                setImgError(true);
              }} 
              className="max-h-10 max-w-full w-auto object-contain object-left block" 
            />
          ) : (
            <h4 className="text-sm font-black tracking-wider text-cyan-400 uppercase truncate">
              {nombreEmpresa}
            </h4>
          )}
        </div>

        {/* Nombre de la Organización debajo del logo (sólo si la imagen cargó correctamente) */}
        {fullLogoUrl && !imgError && (
          <p className="text-xs font-bold text-white tracking-wide uppercase truncate -mt-1">
            {nombreEmpresa}
          </p>
        )}

        {/* Usuario y Rol con indicador de estado activo */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
          <div className="flex flex-col min-w-0">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider truncate">
              {user?.nombre || 'Usuario'}
            </p>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">
              {isSuperAdmin ? 'SuperAdmin' : (user?.rol || 'Admin')}
            </span>
          </div>
        </div>

      </div>

      {/* Navegación - Botones Vibrantes de Alto Contraste */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {links.map((link) => {
          const style = linkStylesMap[link.label] || {
            inactive: 'bg-slate-600 text-white hover:bg-slate-500',
            active: 'bg-slate-400 text-slate-950 font-black'
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