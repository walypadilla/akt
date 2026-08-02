// frontend/src/pages/superadmin/Organizations.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  getOrganizations,
  toggleOrganizationStatus,
  deleteOrganization,
  createOrganization,
  updateOrganization,
} from '../../api/organizations';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Search, Users, FileText } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import OrganizationForm from '../../components/forms/OrganizationForm';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Organizations = () => {
  const navigate = useNavigate();

  // Estados
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [saving, setSaving] = useState(false);

  // Cargar organizaciones con paginación
  const fetchOrganizations = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    setError(null);
    try {
      // Si el backend soporta búsqueda y paginación, pasar parámetros
      // Por ahora, obtenemos todas y filtramos/paginamos en frontend
      const data = await getOrganizations();
      let filtered = data || [];

      // Filtrar por búsqueda
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter(
          (org) =>
            org.nombre_empresa.toLowerCase().includes(term) ||
            org.nit.toLowerCase().includes(term)
        );
      }

      // Paginación manual
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginated = filtered.slice(start, end);

      setOrganizations(data);
      setFilteredOrgs(paginated);
      setTotalItems(filtered.length);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
      setCurrentPage(page);
    } catch (err) {
      setError(err.message || 'Error al cargar organizaciones');
      toast.error('Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations(1, searchTerm);
  }, [fetchOrganizations, searchTerm]);

  // Cambiar estado de organización (Activo/Inactivo)
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await toggleOrganizationStatus(id, newStatus);
      toast.success(`Organización ${newStatus === 'Activo' ? 'activada' : 'inactivada'} correctamente`);
      fetchOrganizations(currentPage, searchTerm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  // Inactivar organización (eliminación lógica)
  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de inactivar esta organización? También se inactivarán sus usuarios.')) return;
    try {
      await deleteOrganization(id);
      toast.success('Organización inactivada');
      fetchOrganizations(currentPage, searchTerm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al inactivar');
    }
  };

  // Crear o editar organización
  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      // Verificamos si los datos son de tipo FormData (cuando se selecciona una imagen)
      const esFormData = data instanceof FormData;
      
      const config = esFormData ? {
        headers: { 'Content-Type': 'multipart/form-data' }
      } : {};

      if (editingOrg) {
        await updateOrganization(editingOrg.id, data, config);
        toast.success('Organización actualizada correctamente');
      } else {
        await createOrganization(data, config);
        toast.success('Organización creada exitosamente');
      }
      setShowModal(false);
      setEditingOrg(null);
      fetchOrganizations(1, searchTerm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Navegar a usuarios de la organización
  const handleVerUsuarios = (orgId) => {
    navigate(`/users?org=${orgId}`);
  };

  // Navegar a facturas de la organización
  const handleVerFacturas = (orgId) => {
    navigate(`/facturas-org?org=${orgId}`);
  };

  // Renderizado condicional
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => fetchOrganizations(currentPage, searchTerm)} />;

  return (
    <div className="p-6">
      {/* Header con título y botón + buscador */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Organizaciones</h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o NIT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => {
              setEditingOrg(null);
              setShowModal(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={20} />
            Nueva Organización
          </button>
        </div>
      </div>

      {/* Tabla de organizaciones */}
      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  NIT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-400">
                    No hay organizaciones que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 text-gray-300">{org.nombre_empresa}</td>
                    <td className="px-6 py-4 text-gray-300">{org.nit}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          org.estado === 'Activo'
                            ? 'bg-green-900/50 text-green-400 border border-green-700'
                            : 'bg-red-900/50 text-red-400 border border-red-700'
                        }`}
                      >
                        {org.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(org.id, org.estado)}
                        className="text-cyan-400 hover:text-cyan-300 transition"
                        title={org.estado === 'Activo' ? 'Inactivar' : 'Activar'}
                      >
                        {org.estado === 'Activo' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingOrg(org);
                          setShowModal(true);
                        }}
                        className="text-yellow-400 hover:text-yellow-300 transition"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="text-red-400 hover:text-red-300 transition"
                        title="Inactivar"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleVerUsuarios(org.id)}
                        className="text-purple-400 hover:text-purple-300 transition"
                        title="Ver Usuarios"
                      >
                        <Users size={18} />
                      </button>
                      <button
                        onClick={() => handleVerFacturas(org.id)}
                        className="text-blue-400 hover:text-blue-300 transition"
                        title="Ver Facturas"
                      >
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-3 border-t border-gray-700">
            <span className="text-sm text-gray-400">
              Mostrando {filteredOrgs.length} de {totalItems} organizaciones
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchOrganizations(currentPage - 1, searchTerm)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchOrganizations(p, searchTerm)}
                  className={`px-3 py-1 rounded ${
                    p === currentPage
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => fetchOrganizations(currentPage + 1, searchTerm)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear/editar organización */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingOrg ? 'Editar Organización' : 'Nueva Organización'}
            </h2>
            <OrganizationForm
              initialData={editingOrg || {}}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowModal(false);
                setEditingOrg(null);
              }}
              loading={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;