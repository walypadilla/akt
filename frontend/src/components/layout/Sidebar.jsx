// frontend/src/components/layout/Sidebar.jsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Building, Users, Shield, Settings,
  UserPlus, FileText, ShoppingCart, Briefcase, CreditCard,
  DollarSign, Package, XCircle, Calendar, Clipboard, Activity, Syringe, TrendingUp
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';

const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

const linkStylesMap = {
  // --- SUPERADMIN LINKS ---
  'Dashboard': { inactive: 'bg-cyan-600 text-white hover:bg-cyan-500/90', active: 'bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20' },
  'Organizaciones': { inactive: 'bg-purple-600 text-white hover:bg-purple-500/90', active: 'bg-purple-400 text-slate-950 font-black shadow-lg shadow-purple-500/20' },
  'Usuarios': { inactive: 'bg-emerald-600 text-white hover:bg-emerald-500/90', active: 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20' },
  'Productos': { inactive: 'bg-indigo-600 text-white hover:bg-indigo-500/90', active: 'bg-indigo-400 text-slate-950 font-black shadow-lg shadow-indigo-500/20' },
  'SuperAdmins': { inactive: 'bg-amber-600 text-white hover:bg-amber-500/90', active: 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20' },
  'Contabilidad': { inactive: 'bg-lime-600 text-white hover:bg-lime-500/90', active: 'bg-lime-400 text-slate-950 font-black shadow-lg shadow-lime-500/20' },
  'Facturas por Org': { inactive: 'bg-fuchsia-600 text-white hover:bg-fuchsia-500/90', active: 'bg-fuchsia-400 text-slate-950 font-black shadow-lg shadow-fuchsia-500/20' },
  'Emitidas': { inactive: 'bg-sky-600 text-white hover:bg-sky-500/90', active: 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/20' },
  'Canceladas': { inactive: 'bg-rose-600 text-white hover:bg-rose-500/90', active: 'bg-rose-400 text-slate-950 font-black shadow-lg shadow-rose-500/20' },
  'Configuración': { inactive: 'bg-teal-600 text-white hover:bg-teal-500/90', active: 'bg-teal-400 text-slate-950 font-black shadow-lg shadow-teal-500/20' },

  // --- ORGANIZATION LINKS ---
  'Dashboard': { inactive: 'bg-cyan-600 text-white hover:bg-cyan-500/90', active: 'bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20' },
  'Facturas': { inactive: 'bg-blue-600 text-white hover:bg-blue-500/90', active: 'bg-blue-400 text-slate-950 font-black shadow-lg shadow-blue-500/20' },
  'Compras': { inactive: 'bg-amber-600 text-white hover:bg-amber-500/90', active: 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20' },
  'Clientes': { inactive: 'bg-fuchsia-600 text-white hover:bg-fuchsia-500/90', active: 'bg-fuchsia-400 text-slate-950 font-black shadow-lg shadow-fuchsia-500/20' },
  'Productos': { inactive: 'bg-purple-600 text-white hover:bg-purple-500/90', active: 'bg-purple-400 text-slate-950 font-black shadow-lg shadow-purple-500/20' },
  'Proveedores': { inactive: 'bg-teal-600 text-white hover:bg-teal-500/90', active: 'bg-teal-400 text-slate-950 font-black shadow-lg shadow-teal-500/20' },
  'Inventario': { inactive: 'bg-lime-500 text-slate-950 font-bold hover:bg-lime-400', active: 'bg-lime-400 text-slate-950 font-black shadow-lg shadow-lime-500/20' },
  'Empleados': { inactive: 'bg-emerald-600 text-white hover:bg-emerald-500/90', active: 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20' },
  'Planillas': { inactive: 'bg-rose-600 text-white hover:bg-rose-500/90', active: 'bg-rose-400 text-slate-950 font-black shadow-lg shadow-rose-500/20' },
  'Citas': { inactive: 'bg-orange-500 text-white hover:bg-orange-400/90', active: 'bg-orange-400 text-slate-950 font-black shadow-lg shadow-orange-500/20' },
};

const Sidebar = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';
  const [imgError, setImgError] = useState(false);

  const rawLogoUrl = user?.logo_url || user?.organizacion?.logo_url || user?.organizacion_logo;
  
  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
  
  const fullLogoUrl = rawLogoUrl 
    ? (rawLogoUrl.startsWith('http') ? rawLogoUrl : `${API_URL}${rawLogoUrl.startsWith('/') ? '' : '/'}${rawLogoUrl}`)
    : null;

  const nombreEmpresa = user?.nombre_empresa || user?.organizacion_nombre || user?.organizacion?.nombre_empresa || 'SaaS Facturación';

  const tipoOrg = user?.organizacion?.tipo_organizacion || 'Empresa Comercial';
  const tipoNormalizado = normalizarTexto(tipoOrg);
  const esClinicaGeneral = tipoNormalizado === 'clinica general';
  const esClinicaDental = tipoNormalizado === 'clinica dental';
  const esClinicaVeterinaria = tipoNormalizado === 'clinica veterinaria';
  const isClinica = esClinicaGeneral || esClinicaDental || esClinicaVeterinaria;

  const citasRaw = user?.organizacion?.citas_activado ?? user?.citas_activado;
  const tieneCitasActivadas = 
    citasRaw === 1 || citasRaw === '1' || citasRaw === true || citasRaw === 'true';

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

  if (isClinica || tieneCitasActivadas) {
    organizationLinks.push({ to: '/citas', icon: Calendar, label: 'Citas' });
  }

  if (isClinica) {
    organizationLinks.push(
      { to: '/medicos', icon: Users, label: 'Médicos' },
      { to: '/pacientes', icon: Users, label: 'Pacientes' },
      { to: '/consultas', icon: Clipboard, label: 'Consultas' },
      { to: '/examenes', icon: Activity, label: 'Exámenes' }
    );

    if (esClinicaDental) {
      organizationLinks.push({ to: '/odontograma', icon: Activity, label: 'Odontograma' });
    }
    if (esClinicaVeterinaria) {
      organizationLinks.push({ to: '/vacunas', icon: Syringe, label: 'Vacunas' });
      organizationLinks.push({ to: '/peso', icon: TrendingUp, label: 'Control de Peso' });
    }
  }

  const links = isSuperAdmin ? superAdminLinks : organizationLinks;

  return (
    <aside className="w-64 bg-[#111827] text-slate-200 flex flex-col border-r border-[#1e293b] select-none">
      {/* Branding */}
      <div className="p-5 border-b border-[#1e293b] flex flex-col gap-3 overflow-hidden">
        
        {/* LOGO Y NOMBRE A LA PAR */}
        <div className="flex items-center gap-3">
          {fullLogoUrl && !imgError && (
            <img 
              src={fullLogoUrl} 
              alt="Logo Empresa" 
              onError={() => {
                console.warn('No se pudo cargar el logo desde:', fullLogoUrl);
                setImgError(true);
              }} 
              className="w-10 h-10 object-contain rounded bg-white p-1 shrink-0" 
            />
          )}
          <h4 className="text-sm font-black tracking-wider text-white uppercase truncate flex-1 leading-tight">
            {nombreEmpresa}
          </h4>
        </div>

        {/* Usuario y Rol */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
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

      {/* Navegación */}
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