// frontend/src/api/inventory.js
import apiClient from './config';

// ============================================================
// DASHBOARD
// ============================================================

export const getInventoryDashboard = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/dashboard?${query}`);
  return response.data;
};

// ============================================================
// CATEGORÍAS
// ============================================================

export const getCategorias = async () => {
  const response = await apiClient.get('/inventario/categorias');
  return response.data;
};

export const createCategoria = async (data) => {
  const response = await apiClient.post('/inventario/categorias', data);
  return response.data;
};

export const updateCategoria = async (id, data) => {
  const response = await apiClient.put(`/inventario/categorias/${id}`, data);
  return response.data;
};

export const deleteCategoria = async (id) => {
  const response = await apiClient.delete(`/inventario/categorias/${id}`);
  return response.data;
};

// ============================================================
// MARCAS
// ============================================================

export const getMarcas = async () => {
  const response = await apiClient.get('/inventario/marcas');
  return response.data;
};

export const createMarca = async (data) => {
  const response = await apiClient.post('/inventario/marcas', data);
  return response.data;
};

export const updateMarca = async (id, data) => {
  const response = await apiClient.put(`/inventario/marcas/${id}`, data);
  return response.data;
};

export const deleteMarca = async (id) => {
  const response = await apiClient.delete(`/inventario/marcas/${id}`);
  return response.data;
};

// ============================================================
// PRODUCTOS
// ============================================================

export const getProductos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/productos?${query}`);
  return response.data;
};

export const getProducto = async (id) => {
  const response = await apiClient.get(`/inventario/productos/${id}`);
  return response.data;
};

export const createProducto = async (data) => {
  const response = await apiClient.post('/inventario/productos', data);
  return response.data;
};

export const updateProducto = async (id, data) => {
  const response = await apiClient.put(`/inventario/productos/${id}`, data);
  return response.data;
};

export const deleteProducto = async (id) => {
  const response = await apiClient.delete(`/inventario/productos/${id}`);
  return response.data;
};

// ============================================================
// MOVIMIENTOS DE INVENTARIO (Kardex)
// ============================================================

export const getMovimientos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/movimientos?${query}`);
  return response.data;
};

export const getKardex = async (producto_id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/kardex/${producto_id}?${query}`);
  return response.data;
};

// ============================================================
// AJUSTES DE INVENTARIO
// ============================================================

export const createAjuste = async (data) => {
  const response = await apiClient.post('/inventario/ajustes', data);
  return response.data;
};

export const getAjustes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/ajustes?${query}`);
  return response.data;
};

// ============================================================
// KITS / COMBOS
// ============================================================

export const getKitComponentes = async (producto_kit_id) => {
  const response = await apiClient.get(`/inventario/kits/${producto_kit_id}`);
  return response.data;
};

export const addKitComponente = async (data) => {
  const response = await apiClient.post('/inventario/kits', data);
  return response.data;
};

export const removeKitComponente = async (id) => {
  const response = await apiClient.delete(`/inventario/kits/${id}`);
  return response.data;
};

// ============================================================
// COSTOS HISTÓRICOS
// ============================================================

export const getCostosHistoricos = async (producto_id) => {
  const response = await apiClient.get(`/inventario/costos/${producto_id}`);
  return response.data;
};

export const registrarCostoHistorico = async (data) => {
  const response = await apiClient.post('/inventario/costos', data);
  return response.data;
};

// ============================================================
// REPORTES DE INVENTARIO
// ============================================================

export const getPareto = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/reportes/pareto?${query}`);
  return response.data;
};

export const getLentoMovimiento = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/reportes/lento-movimiento?${query}`);
  return response.data;
};

export const getValoracionInventario = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/reportes/valoracion?${query}`);
  return response.data;
};

export const getTomaFisica = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/reportes/toma-fisica?${query}`);
  return response.data;
};

export const exportarReporte = async (tipo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/reportes/exportar/${tipo}?${query}`, {
    responseType: 'blob',
  });
  return response.data;
};

// ============================================================
// ALERTAS Y KPIs
// ============================================================

export const getAlertasStock = async () => {
  const response = await apiClient.get('/inventario/alertas');
  return response.data;
};

export const getKPIsInventario = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/kpis?${query}`);
  return response.data;
};

export const getProyeccionAgotamiento = async (producto_id) => {
  const response = await apiClient.get(`/inventario/proyeccion/${producto_id}`);
  return response.data;
};

// ============================================================
// NUEVA: PROYECCIÓN MASIVA
// ============================================================

export const getProyeccionAgotamientoMasiva = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/inventario/proyeccion-masiva?${query}`);
  return response.data;
};