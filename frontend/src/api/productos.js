import apiClient from './config';

export const getProductos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/productos?${query}`);
  return response.data;
};

export const crearProducto = async (data) => {
  const response = await apiClient.post('/organization/productos', data);
  return response.data;
};

export const actualizarProducto = async (id, data) => {
  const response = await apiClient.put(`/organization/productos/${id}`, data);
  return response.data;
};

export const eliminarProducto = async (id) => {
  const response = await apiClient.delete(`/organization/productos/${id}`);
  return response.data;
};

export const reactivarProducto = async (id) => {
  const response = await apiClient.put(`/organization/productos/${id}/reactivar`);
  return response.data;
};

export const incrementStock = async (producto_id, cantidad) => {
  const response = await apiClient.post('/organization/productos/increment-stock', { producto_id, cantidad });
  return response.data;
};

export const decrementStock = async (producto_id, cantidad) => {
  const response = await apiClient.post('/organization/productos/decrement-stock', { producto_id, cantidad });
  return response.data;
};

export const exportarTodosProductos = async () => {
  const response = await apiClient.get('/organization/productos/exportar-todos', {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};

export const exportarProductosFiltrados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/productos/exportar-filtrados?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
};