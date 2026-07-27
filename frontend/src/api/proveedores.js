// frontend/src/api/proveedores.js
import apiClient from './config';

export const getProveedores = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/proveedores?${query}`);
  return response.data;
};

export const getProveedor = async (id) => {
  const response = await apiClient.get(`/organization/proveedores/${id}`);
  return response.data;
};

export const createProveedor = async (data) => {
  const response = await apiClient.post('/organization/proveedores', data);
  return response.data;
};

export const updateProveedor = async (id, data) => {
  const response = await apiClient.put(`/organization/proveedores/${id}`, data);
  return response.data;
};

export const deleteProveedor = async (id) => {
  const response = await apiClient.delete(`/organization/proveedores/${id}`);
  return response.data;
};

export const reactivarProveedor = async (id) => {
  const response = await apiClient.put(`/organization/proveedores/${id}/reactivar`);
  return response.data;
};

export const generarProveedorPDF = async (id) => {
  const response = await apiClient.get(`/organization/proveedores/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarTodosProveedores = async () => {
  const response = await apiClient.get('/organization/proveedores/exportar/todos', {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], {
    type: 'text/csv;charset=utf-8;',
  });
};

export const exportarProveedoresFiltrados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/proveedores/exportar/filtrados?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], {
    type: 'text/csv;charset=utf-8;',
  });
};