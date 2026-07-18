// frontend/src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  PlusCircleIcon, 
  DocumentTextIcon, 
  CreditCardIcon, 
  UsersIcon, 
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const navItems = [
  { label: 'Dashboard', icon: <HomeIcon className="w-5 h-5" />, path: '/' },
  { label: 'Nueva Factura', icon: <PlusCircleIcon className="w-5 h-5" />, path: '/factura' },
  { label: 'Listado Facturas', icon: <DocumentTextIcon className="w-5 h-5" />, path: '/facturas' },
  { label: 'Cuentas por Cobrar', icon: <CreditCardIcon className="w-5 h-5" />, path: '/cuentas-cobrar' },
  { label: 'Empleados', icon: <UsersIcon className="w-5 h-5" />, path: '/empleados' },
  { label: 'SuperAdmin', icon: <Cog6ToothIcon className="w-5 h-5" />, path: '/superadmin' },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out 
          ${isOpen ? 'w-64' : 'w-20'} 
          flex flex-col overflow-hidden`}
      >
        {/* Logo / Título */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          {isOpen ? (
            <h1 className="text-xl font-bold text-white">🏦 Mi Sistema</h1>
          ) : (
            <span className="text-2xl text-white">🏦</span>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          >
            {isOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } ${!isOpen && 'justify-center'}`
                  }
                  title={!isOpen ? item.label : ''}
                >
                  {item.icon}
                  {isOpen && <span className="text-sm font-medium">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Botón Cerrar Sesión */}
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors ${
              !isOpen && 'justify-center'
            }`}
            title={!isOpen ? 'Cerrar Sesión' : ''}
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            {isOpen && <span className="text-sm font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;