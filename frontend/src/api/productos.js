// frontend/src/api/productos.js
import apiClient from './config';

export const getProductos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/productos?${query}`);
  let data = response;
  if (response && typeof response === 'object' && 'data' in response) {
    data = response.data;
  }
  // Ahora data debería ser { productos, paginacion }
  return data;
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

export const reactivarProducto = async (id) => {
  const response = await apiClient.put(`/productos/${id}/reactivar`);
  return response.data;
};

export const incrementStock = async (producto_id, cantidad) => {
  const response = await apiClient.post('/productos/increment-stock', { producto_id, cantidad });
  return response.data;
};

export const decrementStock = async (producto_id, cantidad) => {
  const response = await apiClient.post('/productos/decrement-stock', { producto_id, cantidad });
  return response.data;
};

export const exportarTodosProductos = async () => {
  const response = await apiClient.get('/productos/exportar-todos', {
    responseType: 'blob',
  });
  
  // Envolvemos la respuesta en un Blob forzando el BOM y UTF-8
  return new Blob(['\ufeff', response.data], { 
    type: 'text/csv;charset=utf-8;' 
  });
};

export const exportarProductosFiltrados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/productos/exportar-filtrados?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], { 
    type: 'text/csv;charset=utf-8;' 
  });
};