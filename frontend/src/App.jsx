import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FacturaForm from './components/FacturaForm';
import FacturaList from './components/FacturaList';
import CuentasCobrar from './components/CuentasCobrar';
import Empleados from './components/Empleados';
import SuperAdminPanel from './components/SuperAdminPanel';
import Login from './components/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="factura" element={<FacturaForm />} />
          <Route path="facturas" element={<FacturaList />} />
          <Route path="cuentas-cobrar" element={<CuentasCobrar />} />
          <Route path="empleados" element={<Empleados />} />
          <Route path="superadmin" element={<SuperAdminPanel />} />
        </Route>
      </Routes>
      <ToastContainer position="top-right" theme="dark" />
    </BrowserRouter>
  );
}

export default App;