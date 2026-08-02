import apiClient from './config';

// Obtener todas las organizaciones
export const getOrganizations = async () => {
  const response = await apiClient.get('/superadmin/organizaciones');
  return response.data;
};

// Obtener una organización por ID
export const getOrganization = async (id) => {
  const response = await apiClient.get(`/superadmin/organizaciones/${id}`);
  return response.data;
};

// Crear organización
export const createOrganization = async (data, config = {}) => {
  const response = await apiClient.post('/superadmin/organizaciones', data, config);
  return response.data;
};

// Actualizar organización
export const updateOrganization = async (id, data, config = {}) => {
  const response = await apiClient.put(`/superadmin/organizaciones/${id}`, data, config);
  return response.data;
};

// Cambiar estado de organización (Activo/Inactivo)
export const toggleOrganizationStatus = async (organizacion_id, estado) => {
  const response = await apiClient.put(`/superadmin/organizaciones/${organizacion_id}/estado`, { estado });
  return response.data;
};

// Eliminar organización (si el backend lo soporta)
export const deleteOrganization = async (id) => {
  // No hay DELETE en las rutas, pero podemos inactivar
  return toggleOrganizationStatus(id, 'Inactivo');
};