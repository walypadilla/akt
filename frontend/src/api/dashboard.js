import apiClient from './config';

// Dashboard SuperAdmin (todo en uno)
export const getSuperAdminDashboard = async (periodo = 'mes', anio = null, mes = null) => {
  const params = new URLSearchParams();
  if (periodo) params.append('periodo', periodo);
  if (anio) params.append('anio', anio);
  if (mes) params.append('mes', mes);
  const response = await apiClient.get(`/superadmin/dashboard?${params.toString()}`);
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

// Dashboard Organización
export const getOrganizationKPIs = async (periodo = 'mes', anio = null, mes = null) => {
  const params = new URLSearchParams();
  if (periodo) params.append('periodo', periodo);
  if (anio) params.append('anio', anio);
  if (mes) params.append('mes', mes);
  const response = await apiClient.get(`/organization-dashboard?${params.toString()}`);
  return response.data;
};