import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const getOrganizationKPIs = async () => {
  const response = await axios.get(`${API_URL}/organization-dashboard/kpis`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getMonthlyData = async () => {
  const response = await axios.get(`${API_URL}/organization-dashboard/monthly`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getTopClients = async () => {
  const response = await axios.get(`${API_URL}/organization-dashboard/top-clients`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};