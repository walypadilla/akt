// frontend/src/api/payroll.js
import apiClient from './config';

export const getEmployees = async (params = '') => {
  const response = await apiClient.get(`/organization/empleados?${params}`);
  return response.data;
};

export const createEmployee = async (data) => {
  const response = await apiClient.post('/organization/empleados', data);
  return response.data;
};

export const updateEmployee = async (id, data) => {
  const response = await apiClient.put(`/organization/empleados/${id}`, data);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await apiClient.delete(`/organization/empleados/${id}`);
  return response.data;
};

export const getPayrolls = async (params = '') => {
  const response = await apiClient.get(`/organization/planillas?${params}`);
  return response.data;
};

export const generatePayroll = async (data) => {
  const response = await apiClient.post('/organization/planillas/calcular', data);
  return response.data;
};

export const generatePayrollMasiva = async (data) => {
  const response = await apiClient.post('/organization/planillas/masiva', data);
  return response.data;
};

export const updatePayrollStatus = async (id, data) => {
  const response = await apiClient.put(`/organization/planillas/${id}`, data);
  return response.data;
};

export const deletePayroll = async (id) => {
  const response = await apiClient.delete(`/organization/planillas/${id}`);
  return response.data;
};