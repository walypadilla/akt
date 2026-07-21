// frontend/src/api/superadminInvoices.js
import apiClient from './config';

export const getFacturasPorOrganizacion = async (organizacion_id, params = '') => {
  const url = `/superadmin/organizaciones/${organizacion_id}/facturas${params ? '?' + params : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const getFacturasEmitidasGlobal = async (params = '') => {
  const response = await apiClient.get(`/superadmin/facturas/emitidas?${params}`);
  return response.data;
};

export const getFacturasCanceladas = async (params = '') => {
  const response = await apiClient.get(`/superadmin/get/facturas-canceladas?${params}`);
  return response.data;
};

export const cambiarEstadoFacturaSuperAdmin = async (id, estado) => {
  const response = await apiClient.put(`/superadmin/facturas/${id}/estado`, { estado });
  return response.data;
};

export const cancelarFacturaSuperAdmin = async (id) => {
  const response = await apiClient.put(`/superadmin/facturas/${id}/cancelar`);
  return response.data;
};

export const descargarPDFFacturaSuperAdmin = async (id) => {
  const response = await apiClient.get(`/superadmin/facturas/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const generarFacturaMembresia = async (data) => {
  const response = await apiClient.post('/superadmin/factura-membresia', data);
  return response.data;
};

export const registrarPagoMembresia = async (data) => {
  const response = await apiClient.post('/superadmin/pago-membresia', data);
  return response.data;
};

export const registrarGastoSaaS = async (data) => {
  const response = await apiClient.post('/superadmin/gasto-saas', data);
  return response.data;
};

export const cancelarGasto = async (id) => {
  const response = await apiClient.delete(`/superadmin/gastos/${id}`);
  return response.data;
};

export const obtenerDetalleIngresos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `/superadmin/ingresos-detalle${query ? '?' + query : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};