// frontend/src/api/users.js
import apiClient from './config';

// Obtener usuarios (con filtro por organización)
export const getUsers = async (organizacionId = null) => {
  const url = organizacionId ? `/usuarios?organizacion_id=${organizacionId}` : '/usuarios';
  const response = await apiClient.get(url);
  return response.data;
};

// Obtener usuarios por organización (para SuperAdmin)
export const getUsersByOrganization = async (organizacionId) => {
  return getUsers(organizacionId);
};

// Crear usuario
export const createUser = async (organizacionId, data) => {
  const response = await apiClient.post('/usuarios', { ...data, organizacion_id: organizacionId });
  return response.data;
};

// Actualizar usuario
export const updateUser = async (id, data) => {
  const response = await apiClient.put(`/usuarios/${id}`, data);
  return response.data;
};

// Eliminar usuario (inactivar)
export const deleteUser = async (id) => {
  const response = await apiClient.delete(`/usuarios/${id}`);
  return response.data;
};

// Cambiar contraseña (nueva función unificada)
export const changePassword = async (id, nueva_contraseña, es_temporal = false) => {
  const response = await apiClient.put(`/usuarios/${id}/password`, { nueva_contraseña, es_temporal });
  return response.data;
};

// Restablecer contraseña (generar temporal)
export const resetUserPassword = async (id) => {
  const response = await apiClient.post(`/usuarios/${id}/reset-password`);
  return response.data;
};