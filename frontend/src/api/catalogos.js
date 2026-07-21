// frontend/src/api/catalogos.js
import apiClient from './config';

export const getDepartamentos = async () => {
  const response = await apiClient.get('/catalogos/departamentos');
  return response.data;
};

export const getMunicipios = async (id_departamento) => {
  const response = await apiClient.get(`/catalogos/municipios/${id_departamento}`);
  return response.data;
};

export const getActividades = async () => {
  const response = await apiClient.get('/catalogos/actividades');
  return response.data;
};