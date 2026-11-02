import apiClient from './config';

// ========== HELPERS DE URLs ==========
export const API_ORIGIN = (() => {
  // Vite expone VITE_API_URL o cae al default
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return url.replace(/\/api\/?$/, '');
})();

/**
 * Construye la URL completa para un archivo servido por el backend
 * Ej: /uploads/examenes/img.jpg → http://localhost:3000/uploads/examenes/img.jpg
 */
export const buildFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
};

// ========== MÉDICOS ==========
export const getMedicos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/medicos?${query}`);
  return response.data;
};

export const getMedico = async (id) => {
  const response = await apiClient.get(`/organization/medicos/${id}`);
  return response.data;
};

export const crearMedico = async (data) => {
  const response = await apiClient.post('/organization/medicos', data);
  return response.data;
};

export const actualizarMedico = async (id, data) => {
  const response = await apiClient.put(`/organization/medicos/${id}`, data);
  return response.data;
};

export const eliminarMedico = async (id) => {
  const response = await apiClient.delete(`/organization/medicos/${id}`);
  return response.data;
};

export const reactivarMedico = async (id) => {
  const response = await apiClient.put(`/organization/medicos/${id}/reactivar`);
  return response.data;
};

export const exportarMedicosTodos = async () => {
  const response = await apiClient.get('/organization/medicos/exportar/todos', {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarMedicosFiltrados = async (filtros) => {
    const params = new URLSearchParams(filtros);
    const response = await apiClient.get(`/organization/medicos/exportar/filtrados?${params.toString()}`, {
        responseType: 'blob', 
    });
    return response.data;
};

export const getMedicoDetalle = async (id, anio, mes) => {
    const params = new URLSearchParams();
    if (anio) params.append('anio', anio);
    if (mes) params.append('mes', mes);
    const response = await apiClient.get(`/organization/medicos/${id}/detalle?${params.toString()}`);
    return response.data;
};

export const aniosDisponibles = async (id) => {
  const response = await apiClient.get(`/organization/medicos/${id}/anios`);
  return response.data;
};

export const getMedicosDisponibles = async () => {
  const response = await apiClient.get('/organization/medicos/usuarios-disponibles');
  return response.data;
};

export const getAniosMedicos = async () => {
    const response = await apiClient.get('/organization/medicos/anios');
    return response.data;
};

export const exportarConsultasMedico = async (id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(
    `/organization/medicos/${id}/exportar-consultas?${query}`,
    {
      responseType: 'blob',
    }
  );
  return response.data;
};


// ========== PACIENTES ==========
export const getPacientes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/pacientes?${query}`);
  return response.data;
};

export const getPaciente = async (id) => {
  const response = await apiClient.get(`/organization/pacientes/${id}`);
  return response.data;
};

export const createPaciente = async (data) => {
  const response = await apiClient.post('/organization/pacientes', data);
  return response.data;
};

export const updatePaciente = async (id, data) => {
  const response = await apiClient.put(`/organization/pacientes/${id}`, data);
  return response.data;
};

export const deletePaciente = async (id) => {
  const response = await apiClient.delete(`/organization/pacientes/${id}`);
  return response.data;
};

export const reactivarPaciente = async (id) => {
  const response = await apiClient.put(`/organization/pacientes/${id}/reactivar`);
  return response.data;
};

// ========== EXPORTACIONES ==========
export const exportarPacientes = async () => {
  const response = await apiClient.get('/organization/pacientes/exportar/todos', {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarPacientesFiltrados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/pacientes/exportar/filtrados?${query}`, {
    responseType: 'blob',
  });
  return response.data;
};

// ========== CITAS ==========
export const getCitas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/citas?${query}`);
  return response.data;
};

export const getCita = async (id) => {
  const response = await apiClient.get(`/organization/citas/${id}`);
  return response.data;
};

export const createCita = async (data) => {
  const response = await apiClient.post('/organization/citas', data);
  return response.data;
};

export const updateCita = async (id, data) => {
  const response = await apiClient.put(`/organization/citas/${id}`, data);
  return response.data;
};

export const updateCitaStatus = async (id, estado) => {
  const response = await apiClient.put(`/organization/citas/${id}/estado`, { estado });
  return response.data;
};

export const enviarWhatsAppCita = async (id) => {
  const response = await apiClient.post(`/organization/citas/${id}/whatsapp`);
  return response.data;
};

// ========== CONSULTAS ==========
export const getAniosConsultas = async () => {
  const response = await apiClient.get('/organization/consultas/anios');
  return response.data;
};

export const getExamenesInternosConsulta = async (consultaId) => {
  const response = await apiClient.get(
    `/organization/consultas/${consultaId}/examenes-internos`
  );
  return response.data;
};

export const getConsultas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/consultas?${query}`);
  return response.data;
};

export const getConsulta = async (id) => {
  const response = await apiClient.get(`/organization/consultas/${id}`);
  return response.data;
};

export const createConsulta = async (data) => {
  const response = await apiClient.post('/organization/consultas', data);
  return response.data;
};

export const updateConsulta = async (id, data) => {
  const response = await apiClient.put(`/organization/consultas/${id}`, data);
  return response.data;
};

export const facturarConsulta = async (id, data) => {
  const response = await apiClient.post(`/organization/consultas/${id}/facturar`, data);
  return response.data;
};

// ========== EXPORTACIONES DE CONSULTAS ==========
export const exportarConsultas = async () => {
  const response = await apiClient.get('/organization/consultas/exportar/todos', {
    responseType: 'blob',
  });
  return response.data;
};

export const exportarConsultasFiltrados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/consultas/exportar/filtrados?${query}`, {
    responseType: 'blob',
  });
  return response.data;
};

// ========== ODONTOGRAMA ==========
export const getOdontogramas = async (paciente_id) => {
  const response = await apiClient.get(`/organization/odontograma/${paciente_id}`);
  return response.data;
};

export const guardarOdontograma = async (data) => {
  const response = await apiClient.post('/organization/odontograma', data);
  return response.data;
};

// ======== EXAMENES ======================================

export const getExamenes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/examenes?${query}`);
  return response.data;
};

export const createExamen = async (data) => {
  const response = await apiClient.post('/organization/examenes', data);
  return response.data;
};

export const updateExamen = async (id, data) => {
  const response = await apiClient.put(`/organization/examenes/${id}`, data);
  return response.data;
};

export const deleteExamen = async (id) => {
  const response = await apiClient.delete(`/organization/examenes/${id}`);
  return response.data;
};

export const reactivarExamen = async (id) => {
  const response = await apiClient.put(`/organization/examenes/${id}/reactivar`);
  return response.data;
};

// ========== SOLICITUDES DE EXÁMENES ==========
export const getSolicitudesExamen = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/solicitudes-examen?${query}`);
  return response.data;
};

export const solicitarExamen = async (data) => {
  const response = await apiClient.post('/organization/solicitudes-examen', data);
  return response.data;
};

export const completarExamen = async (id, data) => {
  const response = await apiClient.put(`/organization/solicitudes-examen/${id}/completar`, data);
  return response.data;
};

export const cancelarSolicitudExamen = async (id) => {
  const response = await apiClient.put(`/organization/solicitudes-examen/${id}/cancelar`);
  return response.data;
};

export const getExamenesPendientes = async () => {
  const response = await apiClient.get('/organization/solicitudes-examen/pendientes');
  return response.data;
};

export const generarExamenPDF = async (id) => {
  const response = await apiClient.get(`/organization/solicitudes-examen/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getDashboardExamenes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(
    `/organization/examenes/dashboard${query ? `?${query}` : ''}`
  );
  return response.data;
};

export const getEstadoWhatsApp = async () => {
  const response = await apiClient.get('/organization/examenes/whatsapp-estado');
  return response.data;
};

export const exportarSolicitudesExamen = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(
    `/organization/solicitudes-examen/exportar/filtrados?${query}`,
    { responseType: 'blob' }
  );
  return response.data;
};

export const enviarResultadoWhatsApp = async (id) => {
  const response = await apiClient.post(`/organization/solicitudes-examen/${id}/whatsapp`);
  return response.data;
};

export const subirArchivoResultado = async (id, file) => {
  const formData = new FormData();
  formData.append('archivo', file);
  const response = await apiClient.post(
    `/organization/solicitudes-examen/${id}/archivo`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const getAniosExamenes = async () => {
  const response = await apiClient.get('/organization/examenes/anios');
  return response.data;
};

export const exportarCatalogoExamenes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(
    `/organization/examenes/exportar/catalogo?${query}`,
    { responseType: 'blob' }
  );
  return response.data;
};


// ========== VACUNAS ==========// ========== VACUNAS ==========
export const getVacunas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/vacunas?${query}`);
  return response.data;
};

export const getVacunasAplicadasConsulta = async (consultaId) => {
  const response = await apiClient.get(
    `/organization/consultas/${consultaId}/vacunas-aplicadas`
  );
  return response.data;
};

export const createVacuna = async (data) => {
  const response = await apiClient.post('/organization/vacunas', data);
  return response.data;
};

export const updateVacuna = async (id, data) => {
  const response = await apiClient.put(`/organization/vacunas/${id}`, data);
  return response.data;
};

export const deleteVacuna = async (id) => {
  const response = await apiClient.delete(`/organization/vacunas/${id}`);
  return response.data;
};

export const reactivarVacuna = async (id) => {
  const response = await apiClient.put(`/organization/vacunas/${id}/reactivar`);
  return response.data;
};

export const getHistorialVacunas = async (paciente_id) => {
  const response = await apiClient.get(`/organization/vacunas/historial/${paciente_id}`);
  return response.data;
};

export const getCartillaPaciente = async (paciente_id) => {
  const response = await apiClient.get(`/organization/vacunas/cartilla/${paciente_id}`);
  return response.data;
};

export const aplicarVacuna = async (data) => {
  const response = await apiClient.post('/organization/vacunas/aplicar', data);
  return response.data;
};

export const editarAplicacionVacuna = async (id, data) => {
  const response = await apiClient.put(`/organization/vacunas/aplicar/${id}`, data);
  return response.data;
};

export const eliminarAplicacionVacuna = async (id) => {
  const response = await apiClient.delete(`/organization/vacunas/aplicar/${id}`);
  return response.data;
};

export const getProximasVacunas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/vacunas/proximas?${query}`);
  return response.data;
};

export const getDashboardVacunas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/vacunas/dashboard?${query}`);
  return response.data;
};

export const getAniosVacunas = async () => {
  const response = await apiClient.get('/organization/vacunas/anios');
  return response.data;
};

export const exportarVacunas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/vacunas/exportar/filtrados?${query}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const generarPDFCartilla = async (paciente_id) => {
  const response = await apiClient.get(`/organization/vacunas/cartilla/${paciente_id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const generarTokenCartilla = async (paciente_id) => {
  const response = await apiClient.post(`/organization/vacunas/cartilla/${paciente_id}/token`);
  return response.data;
};

export const getHistorialGlobalVacunas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/vacunas/historial-global?${query}`);
  return response.data;
};

export const exportarTopVacunas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/vacunas/exportar/top5?${query}`, {
    responseType: 'blob',
  });
  return response.data;
};

// ========== HISTORIAL DE PESO ==========
export const getKpisPeso = async () => {
  const response = await apiClient.get('/organization/pesos/kpis');
  return response.data;
};

export const getPacientesPeso = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/pesos/pacientes?${query}`);
  return response.data;
};

export const getHistorialPesoPaciente = async (pacienteId) => {
  const response = await apiClient.get(`/organization/pesos/paciente/${pacienteId}`);
  return response.data;
};

export const registrarPesoRapido = async (data) => {
  const response = await apiClient.post('/organization/pesos/registro-rapido', data);
  return response.data;
};

export const eliminarRegistroPeso = async (id) => {
  const response = await apiClient.delete(`/organization/pesos/${id}`);
  return response.data;
};

export const actualizarPesoIdeal = async (pacienteId, data) => {
  const response = await apiClient.put(`/organization/pesos/paciente/${pacienteId}/ideal`, data);
  return response.data;
};

export const exportarPesosFiltrados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(
    `/organization/pesos/exportar/filtrados?${query}`,
    { responseType: 'blob' }
  );
  return response.data;
};

export const exportarHistorialPesoPaciente = async (pacienteId) => {
  const response = await apiClient.get(
    `/organization/pesos/paciente/${pacienteId}/exportar`,
    { responseType: 'blob' }
  );
  return response.data;
};

// Obtener la URL base del frontend para construir links públicos
export const FRONTEND_URL = window.location.origin;