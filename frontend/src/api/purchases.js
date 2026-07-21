// frontend/src/api/purchases.js
import apiClient from './config';

export const getPurchases = async (params = '') => {
  const response = await apiClient.get(`/organization/compras?${params}`);
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

export const deletePurchase = async (id) => {
  const response = await apiClient.delete(`/organization/compras/${id}`);
  return response.data;
};