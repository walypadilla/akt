// frontend/src/api/invoices.js
import apiClient from './config';

export const getInvoices = async (params = '') => {
  const response = await apiClient.get(`/organization/facturas?${params}`);
  return response.data;
};

export const getInvoice = async (id) => {
  const response = await apiClient.get(`/organization/facturas/${id}`);
  return response.data;
};

export const createInvoice = async (data) => {
  const response = await apiClient.post('/organization/facturas', data);
  return response.data;
};

export const updateInvoice = async (id, data) => {
  const response = await apiClient.put(`/organization/facturas/${id}`, data);
  return response.data;
};

export const changeInvoiceStatus = async (id, estado) => {
  const response = await apiClient.patch(`/organization/facturas/${id}/estado`, { estado });
  return response.data;
};

export const deleteInvoice = async (id) => {
  const response = await apiClient.delete(`/organization/facturas/${id}`);
  return response.data;
};

export const getInvoicePDF = async (id) => {
  const response = await apiClient.get(`/organization/facturas/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};