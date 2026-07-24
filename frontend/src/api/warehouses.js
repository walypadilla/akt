// frontend/src/api/warehouses.js
import apiClient from './config';

// ============================================================
// BODEGAS / SUCURSALES
// ============================================================

export const getBodegas = async () => {
  const response = await apiClient.get('/inventario/bodegas');
  return response.data;
};

export const createWarehouse = async (data) => {
  const response = await apiClient.post('/inventario/bodegas', data);
  return response.data;
};

export const updateWarehouse = async (id, data) => {
  const response = await apiClient.put(`/inventario/bodegas/${id}`, data);
  return response.data;
};

export const deleteWarehouse = async (id) => {
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