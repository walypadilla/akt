// frontend/src/api/inventory.js
import apiClient from './config';

const BASE = '/organization/inventario';

// ============================================================
// DASHBOARD
// ============================================================

export const getInventoryDashboard = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/dashboard?${query}`);
  return response.data;
};

export const getAniosDisponibles = async () => {
  const response = await apiClient.get(`${BASE}/dashboard/anios`);
  return response.data;
};

// ============================================================
// CATEGORÍAS
// ============================================================

export const getCategorias = async () => {
  const response = await apiClient.get(`${BASE}/categorias`);
  return response.data;
};

export const createCategoria = async (data) => {
  const response = await apiClient.post(`${BASE}/categorias`, data);
  return response.data;
};

export const updateCategoria = async (id, data) => {
  const response = await apiClient.put(`${BASE}/categorias/${id}`, data);
  return response.data;
};

export const deleteCategoria = async (id) => {
  const response = await apiClient.delete(`${BASE}/categorias/${id}`);
  return response.data;
};

// ============================================================
// MARCAS
// ============================================================

export const getMarcas = async () => {
  const response = await apiClient.get(`${BASE}/marcas`);
  return response.data;
};

export const createMarca = async (data) => {
  const response = await apiClient.post(`${BASE}/marcas`, data);
  return response.data;
};

export const updateMarca = async (id, data) => {
  const response = await apiClient.put(`${BASE}/marcas/${id}`, data);
  return response.data;
};

export const deleteMarca = async (id) => {
  const response = await apiClient.delete(`${BASE}/marcas/${id}`);
  return response.data;
};

// ============================================================
// PRODUCTOS
// ============================================================

export const getProductos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/productos?${query}`);
  return response.data;
};

export const getProducto = async (id) => {
  const response = await apiClient.get(`${BASE}/productos/${id}`);
  return response.data;
};

export const createProducto = async (data) => {
  const response = await apiClient.post(`${BASE}/productos`, data);
  return response.data;
};

export const updateProducto = async (id, data) => {
  const response = await apiClient.put(`${BASE}/productos/${id}`, data);
  return response.data;
};

export const deleteProducto = async (id) => {
  const response = await apiClient.delete(`${BASE}/productos/${id}`);
  return response.data;
};

// ============================================================
// MOVIMIENTOS / KARDEX
// ============================================================

export const getMovimientos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/movimientos?${query}`);
  return response.data;
};

export const getKardex = async (producto_id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/kardex/${producto_id}?${query}`);
  return response.data;
};

// ============================================================
// AJUSTES
// ============================================================

export const createAjuste = async (data) => {
  const response = await apiClient.post(`${BASE}/ajustes`, data);
  return response.data;
};

export const getAjustes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/ajustes?${query}`);
  return response.data;
};

// ============================================================
// KITS / COMBOS
// ============================================================

export const getKitComponentes = async (producto_kit_id) => {
  const response = await apiClient.get(`${BASE}/kits/${producto_kit_id}`);
  return response.data;
};

export const addKitComponente = async (data) => {
  const response = await apiClient.post(`${BASE}/kits`, data);
  return response.data;
};

export const removeKitComponente = async (id) => {
  const response = await apiClient.delete(`${BASE}/kits/${id}`);
  return response.data;
};

// ============================================================
// COSTOS HISTÓRICOS
// ============================================================

export const getCostosHistoricos = async (producto_id) => {
  const response = await apiClient.get(`${BASE}/costos/${producto_id}`);
  return response.data;
};

export const registrarCostoHistorico = async (data) => {
  const response = await apiClient.post(`${BASE}/costos`, data);
  return response.data;
};

// ============================================================
// REPORTES
// ============================================================

export const getPareto = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/reportes/pareto?${query}`);
  return response.data;
};

export const getLentoMovimiento = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/reportes/lento-movimiento?${query}`);
  return response.data;
};

export const getValoracionInventario = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/reportes/valoracion?${query}`);
  return response.data;
};

export const getTomaFisica = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/reportes/toma-fisica?${query}`);
  return response.data;
};

export const getTopCambiosPrecio = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/reportes/top-cambios-precio?${query}`);
  return response.data;
};

export const exportarReporte = async (tipo, params = {}) => {
  let url = '';
  if (tipo === 'tabla') {
    url = `${BASE}/reportes/exportar-tabla`;
  } else {
    url = `${BASE}/reportes/exportar/${tipo}`;
  }
  try {
    const response = await apiClient.get(url, {
      params,
      responseType: 'blob',
    });
    return new Blob(['\ufeff', response.data], { type: 'text/csv;charset=utf-8;' });
  } catch (error) {
    if (error.response && error.response.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || 'Error al exportar');
      } catch {
        throw new Error(text || 'Error al exportar');
      }
    }
    throw error;
  }
};

// ============================================================
// ALERTAS Y KPIs
// ============================================================

export const getAlertasStock = async () => {
  const response = await apiClient.get(`${BASE}/alertas`);
  return response.data;
};

export const getKPIsInventario = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/kpis?${query}`);
  return response.data;
};

export const getProyeccionAgotamiento = async (producto_id) => {
  const response = await apiClient.get(`${BASE}/proyeccion/${producto_id}`);
  return response.data;
};

export const getProyeccionAgotamientoMasiva = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE}/proyeccion-masiva?${query}`);
  return response.data;
};

// ============================================================
// ETIQUETAS
// ============================================================

export const getEtiquetas = async () => {
  const response = await apiClient.get(`${BASE}/etiquetas`);
  return response.data;
};

export const createEtiqueta = async (data) => {
  const response = await apiClient.post(`${BASE}/etiquetas`, data);
  return response.data;
};

export const updateEtiqueta = async (id, data) => {
  const response = await apiClient.put(`${BASE}/etiquetas/${id}`, data);
  return response.data;
};

export const deleteEtiqueta = async (id) => {
  const response = await apiClient.delete(`${BASE}/etiquetas/${id}`);
  return response.data;
};