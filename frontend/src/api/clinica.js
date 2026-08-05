import apiClient from './config';

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

export const exportarMedicosFiltrados = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/medicos/exportar/filtrados?${query}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getMedicoDetalle = async (id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/medicos/${id}/detalle?${query}`);
  return response.data;
};

export const aniosDisponibles = async (id) => {
  const response = await apiClient.get(`/organization/medicos/${id}/anios`);
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

// ========== CONSULTAS ==========
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

// ========== VACUNAS ==========
export const getVacunas = async () => {
  const response = await apiClient.get('/organization/vacunas');
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

export const getHistorialVacunas = async (paciente_id) => {
  const response = await apiClient.get(`/organization/vacunas/historial/${paciente_id}`);
  return response.data;
};

export const aplicarVacuna = async (data) => {
  const response = await apiClient.post('/organization/vacunas/aplicar', data);
  return response.data;
};

export const getProximasVacunas = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/organization/vacunas/proximas?${query}`);
  return response.data;
};