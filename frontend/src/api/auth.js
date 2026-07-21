import apiClient from './config';

export const login = async (correo, password) => {
  const response = await apiClient.post('/auth/login', { correo, password });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await apiClient.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data;
};