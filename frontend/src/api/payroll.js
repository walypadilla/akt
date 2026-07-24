// frontend/src/api/payroll.js
import apiClient from './config';

// ============================================================
// EMPLEADOS
// ============================================================
export const getEmployees = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/empleados?${query}`);
  return response.data;
};

export const createEmployee = async (data) => {
  const response = await apiClient.post('/organization/empleados', data);
  return response.data;
};

export const updateEmployee = async (id, data) => {
  const response = await apiClient.put(`/organization/empleados/${id}`, data);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await apiClient.delete(`/organization/empleados/${id}`);
  return response.data;
};

export const desactivarEmployee = async (id) => {
  const response = await apiClient.put(`/organization/empleados/${id}/desactivar`);
  return response.data;
};

export const reactivarEmployee = async (id) => {
  const response = await apiClient.put(`/organization/empleados/${id}/reactivar`);
  return response.data;
};

export const exportarEmpleados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/empleados/exportar?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], {
    type: 'text/csv;charset=utf-8;',
  });
};

// ============================================================
// PLANILLAS
// ============================================================
export const getPayrolls = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/planillas?${query}`);
  return response.data;
};

export const generatePayroll = async (data) => {
  const response = await apiClient.post('/organization/planillas/individual', data);
  return response.data;
};

export const generatePayrollMasiva = async (data) => {
  const response = await apiClient.post('/organization/planillas/masiva', data);
  return response.data;
};

export const updatePayrollStatus = async (id, data) => {
  const response = await apiClient.put(`/organization/planillas/${id}/estado`, data);
  return response.data;
};

export const deletePayroll = async (id) => {
  const response = await apiClient.delete(`/organization/planillas/${id}`);
  return response.data;
};

export const exportarPlanillas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/planillas/exportar?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], {
    type: 'text/csv;charset=utf-8;',
  });
};

export const generarBoletaPDF = async (id) => {
  const response = await apiClient.get(`/organization/planillas/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getAniosDisponibles = async () => {
  const response = await apiClient.get('/organization/planillas/anios');
  return response.data;
};

// ============================================================
// AUSENCIAS
// ============================================================
export const registrarAusencia = async (data) => {
  const response = await apiClient.post('/organization/ausencias', data);
  return response.data;
};

export const obtenerAusencias = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/ausencias?${query}`);
  return response.data;
};

export const eliminarAusencia = async (id) => {
  const response = await apiClient.delete(`/organization/ausencias/${id}`);
  return response.data;
};

// ============================================================
// HORAS EXTRAS
// ============================================================
export const registrarHorasExtras = async (data) => {
  const response = await apiClient.post('/organization/horas-extras', data);
  return response.data;
};

export const obtenerHorasExtras = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/horas-extras?${query}`);
  return response.data;
};

export const eliminarHoraExtra = async (id) => {
  const response = await apiClient.delete(`/organization/horas-extras/${id}`);
  return response.data;
};

export const exportarAusencias = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/ausencias/exportar?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], {
    type: 'text/csv;charset=utf-8;',
  });
};

export const exportarHorasExtras = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/horas-extras/exportar?${query}`, {
    responseType: 'blob',
  });
  return new Blob(['\ufeff', response.data], {
    type: 'text/csv;charset=utf-8;',
  });
};

export const cambiarEstadoMultiple = async (ids, estado) => {
  const response = await apiClient.put('/organization/planillas/multiple/estado', { ids, estado });
  return response.data;
};

export const generarAguinaldos = async (data) => {
  const response = await apiClient.post('/organization/planillas/aguinaldos', data);
  return response.data;
};

export const generarVacaciones = async (data) => {
  const response = await apiClient.post('/organization/planillas/vacaciones', data);
  return response.data;
};