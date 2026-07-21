import apiClient from './config';

export const getConfig = async () => {
  const response = await apiClient.get('/superadmin/configuracion');
  return response.data;
};

export const updateConfig = async (data) => {
  const response = await apiClient.put('/superadmin/configuracion', data);
  return response.data;
};