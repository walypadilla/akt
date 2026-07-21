// frontend/src/api/superadmins.js
import apiClient from './config';

export const getSuperAdmins = async () => {
  const response = await apiClient.get('/usuarios?rol=SUPER_ADMIN');
  return response.data;
};

export const createSuperAdmin = async (data) => {
  // Los SuperAdmins se crean con organizacion_id = NULL
  const response = await apiClient.post('/usuarios', { ...data, organizacion_id: null, rol: 'SUPER_ADMIN' });
  return response.data;
};

export const updateSuperAdmin = async (id, data) => {
  const response = await apiClient.put(`/usuarios/${id}`, data);
  return response.data;
};

export const deleteSuperAdmin = async (id) => {
  const response = await apiClient.delete(`/usuarios/${id}`);
  return response.data;
};

export const resetSuperAdminPassword = async (id) => {
  const response = await apiClient.post(`/usuarios/${id}/reset-password`);
  return response.data;
};