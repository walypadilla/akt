// frontend/src/api/facturas.js
import apiClient from './config';

export const getFacturas = async (params = {}) => {
  const response = await apiClient.get('/organization/facturas', { params });
  return response.data;
};

export const getFactura = async (id) => {
  const response = await apiClient.get(`/organization/facturas/${id}`);
  return response.data;
};

export const createFactura = async (data) => {
  const response = await apiClient.post('/organization/facturas', data);
  return response.data;
};

export const updateFactura = async (id, data) => {
  const response = await apiClient.put(`/organization/facturas/${id}`, data);
  return response.data;
};

export const cambiarEstadoFactura = async (id, estado) => {
  const response = await apiClient.put(`/organization/facturas/${id}/estado`, { estado });
  return response.data;
};

export const anularFactura = async (id) => {
  const response = await apiClient.put(`/organization/facturas/${id}/anular`);
  return response.data;
};

export const getFacturaPDF = async (id) => {
  const response = await apiClient.get(`/organization/facturas/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const enviarFacturaWhatsApp = async (id) => {
  const response = await apiClient.post(`/organization/facturas/${id}/whatsapp`);
  return response.data;
};

// Dashboard
export const getDashboardFacturacion = async (params = {}) => {
  const response = await apiClient.get('/organization/facturas/dashboard', { params });
  return response.data;
};

// Exportar
export const exportarFacturasFiltradas = async (params = {}) => {
  const response = await apiClient.get('/organization/facturas/exportar/filtradas', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

// Años disponibles (puedes reutilizar el de compras o crear uno específico)
export const getAniosDisponiblesFacturas = async () => {
  const response = await apiClient.get('/organization/facturas/anios');
  return response.data;
};

export const exportarTodasFacturas = async (params = '') => {
  const response = await apiClient.get(`/organization/facturas/exportar/todas?${params}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarEvolucionVentas = async (params = '') => {
  const response = await apiClient.get(`/organization/facturas/grafica/evolucion/exportar?${params}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarComparacionPagos = async (params = '') => {
  const response = await apiClient.get(`/organization/facturas/grafica/comparacion-pagos/exportar?${params}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarDistribucionTipoDocumento = async (params = '') => {
  const response = await apiClient.get(`/organization/facturas/grafica/distribucion/exportar?${params}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarTopClientes = async (params = '') => {
  const response = await apiClient.get(`/organization/facturas/grafica/top-clientes/exportar?${params}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getFacturaTicket = async (id) => {
  const response = await apiClient.get(`/organization/facturas/${id}/ticket`, {
    responseType: 'blob',
  });
  return response.data;
};

export const enviarFacturaEmail = async (id, data) => {
  const response = await apiClient.post(`/organization/facturas/${id}/email`, data);
  return response.data;
};

export const enviarFacturaMH = async (id) => {
  const response = await apiClient.post(`/organization/facturas/${id}/enviar-mh`);
  return response.data;
};

export const enviarFacturaConAdjuntos = async (id, data) => {
  const response = await apiClient.post(`/organization/facturas/${id}/email-con-adjuntos`, data);
  return response.data;
};

export const exportarCierreMes = async (params = '') => {
  const response = await apiClient.get(`/organization/facturas/exportar/cierre-mes?${params}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getMonitorDTE = async (params = '') => {
  const response = await apiClient.get(`/organization/facturas/monitor-dte?${params}`);
  return response.data;
};