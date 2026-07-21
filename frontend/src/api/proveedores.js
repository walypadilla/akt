// frontend/src/api/proveedores.js
import apiClient from './config';

export const getProveedores = async (params = '') => {
  const response = await apiClient.get(`/organization/proveedores?${params}`);
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