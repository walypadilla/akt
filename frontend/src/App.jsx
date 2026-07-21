// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext'; // ✅ Solo AuthProvider
import { useAuth } from './hooks/useAuth'; // ✅ useAuth desde hooks
import { DashboardProvider } from './context/DashboardContext'; // ✅ Para los wrappers
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/layout/Layout';

// Auth
import Login from './pages/auth/Login';
import CambiarPassword from './pages/auth/CambiarPassword';

// SuperAdmin
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import Organizations from './pages/superadmin/Organizations';
import Users from './pages/superadmin/Users';
import SuperAdmins from './pages/superadmin/SuperAdmins';
import SaasConfig from './pages/superadmin/SaasConfig';
import Contabilidad from './pages/superadmin/Contabilidad';
import FacturasPorOrganizacion from './pages/superadmin/FacturasPorOrganizacion';
import FacturasEmitidas from './pages/superadmin/FacturasEmitidas';
import FacturasCanceladas from './pages/superadmin/FacturasCanceladas';
import Productos from './pages/superadmin/Productos';

// Organization
import OrganizationDashboard from './pages/organization/OrganizationDashboard';
import Clients from './pages/organization/Clients';
import Invoices from './pages/organization/Invoices';
import InvoiceForm from './pages/organization/InvoiceForm';
import Purchases from './pages/organization/Purchases';
import Proveedores from './pages/organization/Proveedores';
import Employees from './pages/organization/Employees';
import Payroll from './pages/organization/Payroll';
import Inventario from './pages/organization/InventoryDashboard';

// Wrappers
import FacturasPorOrganizacionWrapper from './components/wrappers/FacturasPorOrganizacionWrapper';
import FacturasEmitidasWrapper from './components/wrappers/FacturasEmitidasWrapper';

// ============================================================
// COMPONENTE DE REDIRECCIÓN SEGÚN ROL
// ============================================================
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" />;

  if (user.rol === 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" />;
  }

  return <Navigate to="/mi-dashboard" />;
};

// ============================================================
// APP PRINCIPAL
// ============================================================
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DashboardProvider>
          <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<Login />} />
            <Route path="/cambiar-password" element={<CambiarPassword />} />

            {/* Ruta raíz con redirección dinámica */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Rutas protegidas */}
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                {/* SuperAdmin */}
                <Route path="/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/organizations" element={<Organizations />} />
                <Route path="/users" element={<Users />} />
                <Route path="/superadmins" element={<SuperAdmins />} />
                <Route path="/saas-config" element={<SaasConfig />} />
                <Route path="/contabilidad" element={<Contabilidad />} />
                <Route path="/facturas-org" element={<FacturasPorOrganizacionWrapper />} />
                <Route path="/facturas-emitidas" element={<FacturasEmitidasWrapper />} />
                <Route path="/facturas-canceladas" element={<FacturasCanceladas />} />
                <Route path="/productos" element={<Productos />} />

                {/* Organization */}
                <Route path="/mi-dashboard" element={<OrganizationDashboard />} />
                <Route path="/clientes" element={<Clients />} />
                <Route path="/facturas" element={<Invoices />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/facturas/nueva" element={<InvoiceForm />} />
                <Route path="/facturas/editar/:id" element={<InvoiceForm />} />
                <Route path="/compras" element={<Purchases />} />
                <Route path="/proveedores" element={<Proveedores />} />
                <Route path="/empleados" element={<Employees />} />
                <Route path="/planillas" element={<Payroll />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </DashboardProvider>
      </BrowserRouter>

      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          backgroundColor: '#1e293b',
          color: '#e5e7eb',
          borderRadius: '12px',
          border: '1px solid #334155',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)',
        }}
        progressStyle={{
          background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
        }}
      />
    </AuthProvider>
  );
}

export default App;