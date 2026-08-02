// frontend/src/api/organizationDashboard.js
import apiClient from './config';

// Dashboard completo de la organización (con filtros)
export const getOrganizationDashboard = async (periodo = 'mes', anio = null, mes = null) => {
  const params = new URLSearchParams();
  if (periodo) params.append('periodo', periodo);
  if (anio) params.append('anio', anio);
  if (mes) params.append('mes', mes);
  const response = await apiClient.get(`/organization-dashboard?${params.toString()}`);
  return response.data;
};

// Para compatibilidad con endpoints separados (si los usas)
export const getOrganizationKPIs = async () => {
  const response = await apiClient.get('/organization-dashboard/kpis');
  return response.data;
};

export const getOrganizationMonthlyData = async () => {
  const response = await apiClient.get('/organization-dashboard/monthly');
  return response.data;
};

export const getOrganizationTopClients = async () => {
  const response = await apiClient.get('/organization-dashboard/top-clients');
  return response.data;
};

export const getMiConsumo = async () => {
  const response = await apiClient.get('/organization/mi-consumo');
  return response.data;
};