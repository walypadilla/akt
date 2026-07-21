// frontend/src/api/tags.js
import apiClient from './config';

// ============================================================
// ETIQUETAS (CRUD)
// ============================================================

export const getEtiquetas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/etiquetas?${query}`);
  return response.data;
};

export const getEtiqueta = async (id) => {
  const response = await apiClient.get(`/inventario/etiquetas/${id}`);
  return response.data;
};

export const createEtiqueta = async (data) => {
  const response = await apiClient.post('/inventario/etiquetas', data);
  return response.data;
};

export const updateEtiqueta = async (id, data) => {
  const response = await apiClient.put(`/inventario/etiquetas/${id}`, data);
  return response.data;
};

export const deleteEtiqueta = async (id) => {
  const response = await apiClient.delete(`/inventario/etiquetas/${id}`);
  return response.data;
};

// ============================================================
// ASIGNAR / ELIMINAR ETIQUETAS A PRODUCTOS
// ============================================================

export const asignarEtiquetaAProducto = async (producto_id, etiqueta_id) => {
  const response = await apiClient.post('/inventario/productos/etiquetas', {
    producto_id,
    etiqueta_id,
  });
  return response.data;
};

export const eliminarEtiquetaDeProducto = async (producto_id, etiqueta_id) => {
  const response = await apiClient.delete(`/inventario/productos/etiquetas`, {
    data: { producto_id, etiqueta_id },
  });
  return response.data;
};

export const getEtiquetasDeProducto = async (producto_id) => {
  const response = await apiClient.get(`/inventario/productos/${producto_id}/etiquetas`);
  return response.data;
};