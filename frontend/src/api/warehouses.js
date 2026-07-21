// frontend/src/api/warehouses.js
import apiClient from './config';

// ============================================================
// BODEGAS / SUCURSALES
// ============================================================

export const getBodegas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/bodegas?${query}`);
  return response.data;
};

export const getBodega = async (id) => {
  const response = await apiClient.get(`/inventario/bodegas/${id}`);
  return response.data;
};

export const createBodega = async (data) => {
  const response = await apiClient.post('/inventario/bodegas', data);
  return response.data;
};

export const updateBodega = async (id, data) => {
  const response = await apiClient.put(`/inventario/bodegas/${id}`, data);
  return response.data;
};

export const deleteBodega = async (id) => {
  const response = await apiClient.delete(`/inventario/bodegas/${id}`);
  return response.data;
};

// ============================================================
// STOCK POR BODEGA
// ============================================================

export const getStockPorBodega = async (bodega_id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/bodegas/${bodega_id}/stock?${query}`);
  return response.data;
};

export const trasladarStock = async (data) => {
  const response = await apiClient.post('/inventario/traslados', data);
  return response.data;
};