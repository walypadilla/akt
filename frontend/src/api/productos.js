import apiClient from './config';
export * from './inventory';

export const getProductos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/productos?${query}`);
  return response.data;
};

export const crearProducto = async (data) => {
  const response = await apiClient.post('/productos', data);
  return response.data;
};

export const actualizarProducto = async (id, data) => {
  const response = await apiClient.put(`/productos/${id}`, data);
  return response.data;
};

export const eliminarProducto = async (id) => {
  const response = await apiClient.delete(`/productos/${id}`);
  return response.data;
};