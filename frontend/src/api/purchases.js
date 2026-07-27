// frontend/src/api/purchases.js
import apiClient from './config';

export const getPurchases = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras?${query}`);
  return response.data;
};

export const getPurchase = async (id) => {
  const response = await apiClient.get(`/organization/compras/${id}`);
  return response.data;
};

export const createPurchase = async (data) => {
  const response = await apiClient.post('/organization/compras', data);
  return response.data;
};

export const updatePurchase = async (id, data) => {
  const response = await apiClient.put(`/organization/compras/${id}`, data);
  return response.data;
};

export const cancelPurchase = async (id) => {
  const response = await apiClient.delete(`/organization/compras/${id}`);
  return response.data;
};

export const marcarComoPagada = async (id) => {
  const response = await apiClient.put(`/organization/compras/${id}/pagar`);
  return response.data;
};

export const getPurchaseDashboard = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/dashboard?${query}`);
  return response.data;
};

export const exportarTodasCompras = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/exportar/todas?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};

export const exportarComprasFiltradas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/exportar/filtradas?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};

export const generarPDFCompra = async (id) => {
  const response = await apiClient.get(`/organization/compras/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getEvolucionGastos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/grafica/evolucion?${query}`);
  return response.data;
};

export const getComparacionPagos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/grafica/comparacion-pagos?${query}`);
  return response.data;
};

export const getTopProductosMes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/grafica/top-productos?${query}`);
  return response.data;
};

export const exportarEvolucionGastos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/grafica/evolucion/exportar?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};

export const exportarComparacionPagos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/grafica/comparacion-pagos/exportar?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};

export const exportarTopProductos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/compras/grafica/top-productos/exportar?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};

export const getAniosDisponiblesCompras = async () => {
  const response = await apiClient.get('/organization/compras/anios');
  return response.data;
};

export const getComprasPendientesConVencimiento = async () => {
  const response = await apiClient.get('/organization/compras/pendientes-vencimiento');
  return response.data;
};