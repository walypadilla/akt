import apiClient from './config';

export const getClients = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/clientes?${query}`);
  return response.data;
};

export const getClient = async (id) => {
  const response = await apiClient.get(`/organization/clientes/${id}`);
  return response.data;
};

export const createClient = async (data) => {
  const response = await apiClient.post('/organization/clientes', data);
  return response.data;
};

export const updateClient = async (id, data) => {
  const response = await apiClient.put(`/organization/clientes/${id}`, data);
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await apiClient.delete(`/organization/clientes/${id}`);
  return response.data;
};

export const reactivarCliente = async (id) => {
  const response = await apiClient.put(`/organization/clientes/${id}/reactivar`);
  return response.data;
};

export const exportarTodosClientes = async () => {
  const response = await apiClient.get('/organization/clientes/exportar/todos', {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};

export const exportarClientesFiltrados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/clientes/exportar/filtrados?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};

export const getAniosDisponiblesClientes = async () => {
  const response = await apiClient.get('/organization/clientes/anios');
  return response.data;
};

export const generarClientePDF = async (id) => {
  const response = await apiClient.get(`/organization/clientes/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

// Gráficas
export const getClientesPorMes = async (anio) => {
  const response = await apiClient.get(`/organization/clientes/grafica/por-mes?anio=${anio}`);
  return response.data;
};

export const getTopClientes = async (anio, limit = 5) => {
  const response = await apiClient.get(`/organization/clientes/grafica/top?anio=${anio}&limit=${limit}`);
  return response.data;
};

export const exportarGraficaClientesPorMes = async (anio) => {
  const response = await apiClient.get(`/organization/clientes/grafica/por-mes/exportar?anio=${anio}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], {
    type: 'text/csv;charset=utf-8;',
  });
};

export const exportarTopClientes = async (anio, limit = 5) => {
  const response = await apiClient.get(`/organization/clientes/grafica/top/exportar?anio=${anio}&limit=${limit}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], {
    type: 'text/csv;charset=utf-8;',
  });
};