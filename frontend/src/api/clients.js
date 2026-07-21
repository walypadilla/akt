// frontend/src/api/clients.js
import apiClient from './config';

export const getClients = async (params = '') => {
  const response = await apiClient.get(`/organization/clientes?${params}`);
  return response.data;
};

export const getClient = async (id) => {
  const response = await apiClient.get(`/organization/clientes/${id}`);
  return response.data;
};

export const createClient = async (data) => {
  const response = await apiClient.post('/organization/clientes', data);
  return response.data;
};

export const updateClient = async (id, data) => {
  const response = await apiClient.put(`/organization/clientes/${id}`, data);
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await apiClient.delete(`/organization/clientes/${id}`);
  return response.data;
};