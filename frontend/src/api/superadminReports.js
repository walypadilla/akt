import apiClient from './config';

// Obtener contabilidad detallada (por año)
export const obtenerContabilidadDetallada = async (anio) => {
  const response = await apiClient.get(`/superadmin/contabilidad-detallada?anio=${anio}`);
  return response.data;
};

// Obtener detalle de ingresos
export const obtenerDetalleIngresos = async (params = '') => {
  const response = await apiClient.get(`/superadmin/ingresos-detalle?${params}`);
  return response.data;
};

// Obtener detalle de gastos (con paginación)
export const obtenerDetalleGastos = async (params = '') => {
  const response = await apiClient.get(`/superadmin/gastos-detalle?${params}`);
  return response.data;
};

// Exportar libro IVA (Excel) - para organización, pero lo podemos usar como base
export const exportarLibroIva = async (organizacion_id, mes, anio) => {
  const response = await apiClient.get(`/reportes/libro-iva?organizacion_id=${organizacion_id}&mes=${mes}&anio=${anio}`);
  return response.data;
};

// eliminar ingreso
export const eliminarIngreso = async (id) => {
  const response = await apiClient.delete(`/superadmin/ingresos/${id}`);
  return response.data;
};