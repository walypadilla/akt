// frontend/src/api.js
import axios from 'axios';

// ============================================================
// CONFIGURACIÓN BASE
// ============================================================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Interceptor para agregar el token JWT en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// AUTH
// ============================================================
export const login = (correo, password) => api.post('/auth/login', { correo, password });
export const register = (data) => api.post('/auth/register', data);

// ============================================================
// FACTURAS
// ============================================================
export const crearFactura = (data) => api.post('/facturas', data);
export const obtenerFacturas = () => api.get('/facturas');
export const obtenerFactura = (id) => api.get(`/facturas/${id}`);
export const getUltimasFacturas = (limit = 14) => api.get(`/facturas/ultimas?limit=${limit}`);
export const buscarFacturas = (params) => api.get('/facturas/buscar', { params });
export const cambiarEstadoFactura = (id, estado) => api.put(`/facturas/${id}/estado`, { estado });
export const editarFactura = (id, data) => api.put(`/facturas/${id}`, data);
export const descargarPDF = (id) => api.get(`/facturas/${id}/pdf`, { responseType: 'blob' });
export const anularFactura = (id) => api.put(`/facturas/${id}/anular`);

// ============================================================
// CUENTAS POR COBRAR (para organizaciones normales)
// ============================================================
export const getCuentasCobrar = () => api.get('/cuentas-cobrar');
export const pagarCuenta = (id) => api.put(`/cuentas-cobrar/${id}/pagar`);

// ============================================================
// REPORTES / DASHBOARD (para organizaciones normales)
// ============================================================
export const getDashboardData = (params) => api.get('/reportes/dashboard', { params });
export const getKPIs = (params) => api.get('/reportes/kpis', { params });
export const getAñosDisponibles = () => api.get('/reportes/anios-disponibles');
export const exportarLibroIva = (mes, anio) => api.get(`/reportes/libro-iva?mes=${mes}&anio=${anio}`);

// ============================================================
// NÓMINA
// ============================================================
export const calcularPlanilla = (data) => api.post('/nomina/calcular', data);
export const obtenerPlanillas = () => api.get('/nomina');

// ============================================================
// SUPERADMIN (organizaciones, usuarios, superadmins, dashboard, contabilidad, facturas, configuración)
// ============================================================

// ---- Organizaciones ----
export const listarOrganizaciones = () => api.get('/superadmin/organizaciones');
export const obtenerOrganizacion = (id) => api.get(`/superadmin/organizaciones/${id}`);
export const crearOrganizacion = (data) => api.post('/superadmin/organizaciones', data);
export const actualizarOrganizacion = (id, data) => api.put(`/superadmin/organizaciones/${id}`, data);
export const cambiarEstadoOrganizacion = (id, estado) => api.put(`/superadmin/organizaciones/${id}/estado`, { estado });

// ---- Usuarios de organizaciones ----
export const obtenerUsuariosPorOrganizacion = (organizacion_id) =>
  api.get(`/superadmin/organizaciones/${organizacion_id}/usuarios`);
export const crearUsuarioOrganizacion = (organizacion_id, data) =>
  api.post(`/superadmin/organizaciones/${organizacion_id}/usuarios`, data);
export const crearMultiplesUsuarios = (organizacion_id, usuarios) =>
  api.post(`/superadmin/organizaciones/${organizacion_id}/usuarios/multiples`, { usuarios });
export const actualizarUsuario = (id, data) => api.put(`/superadmin/usuarios/${id}`, data);
export const cambiarContraseñaUsuario = (id, nueva_contraseña, es_temporal = false) =>
  api.put(`/superadmin/usuarios/${id}/password`, { nueva_contraseña, es_temporal });
export const restablecerContraseña = (id) => api.post(`/superadmin/usuarios/${id}/restablecer`);
export const cambiarCorreoUsuario = (id, nuevo_correo) =>
  api.put(`/superadmin/usuarios/${id}/correo`, { nuevo_correo });

// ---- SuperAdmins ----
export const obtenerSuperAdmins = () => api.get('/superadmin/superadmins');
export const crearSuperAdmin = (data) => api.post('/superadmin/superadmins', data);
export const actualizarSuperAdmin = (id, data) => api.put(`/superadmin/superadmins/${id}`, data);
export const eliminarSuperAdmin = (id) => api.delete(`/superadmin/superadmins/${id}`);

// ---- Dashboard SuperAdmin ----
export const getDashboardSuperAdmin = () => api.get('/superadmin/dashboard');

// ---- Membresías y contabilidad ----
export const registrarPagoMembresia = (data) => api.post('/superadmin/pago-membresia', data);
export const registrarGastoSaaS = (data) => api.post('/superadmin/gasto-saas', data);
export const obtenerContabilidadSaaS = (anio) => api.get(`/superadmin/contabilidad?anio=${anio}`);
export const obtenerContabilidadDetallada = (anio) =>
  api.get(`/superadmin/contabilidad-detallada?anio=${anio}`);

// ---- Facturas de membresía (SuperAdmin) ----
export const obtenerFacturasPorOrganizacion = (organizacion_id, page = 1, limit = 10, estado = null) => {
  let url = `/superadmin/organizaciones/${organizacion_id}/facturas?page=${page}&limit=${limit}`;
  if (estado) url += `&estado=${estado}`;
  return api.get(url);
};
export const generarFacturaMembresia = (data) => api.post('/superadmin/factura-membresia', data);
export const cancelarFactura = (id) => api.put(`/superadmin/facturas/${id}/cancelar`);
export const cancelarGasto = (id) => api.delete(`/superadmin/gastos/${id}`);
export const obtenerFacturasCanceladas = () => api.get('/superadmin/get/facturas-canceladas');
export const obtenerFacturasEmitidasGlobal = () => api.get('/superadmin/facturas/emitidas');

// ---- PDF y cambio de estado (sin filtro de organización) ----
export const descargarPDFFacturaSuperAdmin = (id) =>
  api.get(`/superadmin/facturas/${id}/pdf`, { responseType: 'blob' });
export const cambiarEstadoFacturaSuperAdmin = (id, estado) =>
  api.put(`/superadmin/facturas/${id}/estado`, { estado });

// ---- Configuración del SaaS ----
export const obtenerConfiguracionSaaS = () => api.get('/superadmin/configuracion');
export const actualizarConfiguracionSaaS = (data) => api.put('/superadmin/configuracion', data);

// ---- NUEVOS ENDPOINTS: Cuentas por cobrar, detalle de ingresos y gastos ----
export const obtenerCuentasCobrar = () => api.get('/superadmin/cuentas-cobrar');
export const obtenerDetalleIngresos = () => api.get('/superadmin/ingresos-detalle');
export const obtenerDetalleGastos = (page = 1, limit = 10) => api.get(`/superadmin/gastos-detalle?page=${page}&limit=${limit}`);

// ============================================================
// EXPORTACIÓN POR DEFECTO
// ============================================================
export default api;