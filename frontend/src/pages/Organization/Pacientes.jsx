// frontend/src/pages/organization/Pacientes.jsx
import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  Users, Search, Plus, Edit2, Trash2, Eye, X, Download, Filter, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getPacientes,
  createPaciente,
  updatePaciente,
  deletePaciente,
  reactivarPaciente,
  exportarPacientes,
  exportarPacientesFiltrados
} from '../../api/clinica';
import { getClients } from '../../api/clients';
import ExpedientePaciente from '../../components/common/clinica/ExpedientePaciente';
import PacienteForm from '../../components/forms/clinica/PacienteForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { getTodayLocal } from '../../utils/dateUtils';

// ============================================================
// FUNCIÓN AUXILIAR: calcular edad
// ============================================================
const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return '-';
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const Pacientes = () => {
  const { user } = useAuth();
  const tipoOrg = user?.organizacion?.tipo_organizacion || 'Empresa Comercial';

  const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };
  const tipoNormalizado = normalizarTexto(tipoOrg);
  const isClinica = ['clinica general', 'clinica dental', 'clinica veterinaria'].includes(tipoNormalizado);
  const isVeterinaria = tipoNormalizado === 'clinica veterinaria';
  const isHumano = tipoNormalizado === 'clinica general' || tipoNormalizado === 'clinica dental';

  if (!isClinica) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Users className="w-12 h-12 mx-auto text-gray-600 mb-2" />
        <p className="text-lg font-semibold">Esta función solo está disponible para clínicas.</p>
      </div>
    );
  }

  const [pacientes, setPacientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const tableRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [filtros, setFiltros] = useState({
    search: '',
    dui: '',
    sexo: '',
    activo: 'true',
    page: 1,
    limit: 10,
  });
  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [showExpediente, setShowExpediente] = useState(false);
  const [expedientePaciente, setExpedientePaciente] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filtros };
      if (!params.activo) delete params.activo;
      if (!params.search) delete params.search;
      if (!params.dui) delete params.dui;
      if (!params.sexo) delete params.sexo;

      const [pacientesData, clientesData] = await Promise.all([
        getPacientes(params),
        getClients({ limit: 99999 }),
      ]);
      setPacientes(pacientesData.pacientes || []);
      setPaginacion({
        total: pacientesData.total || 0,
        page: pacientesData.page || 1,
        limit: pacientesData.limit || 10,
        totalPages: pacientesData.totalPages || 1,
      });
      setClientes(clientesData.clientes || []);
    } catch (err) {
      console.error('Error loading pacientes:', err);
      setError(err.message || 'Error al cargar pacientes');
      toast.error('Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // Carga inicial y actualización al cambiar los filtros definitivos
  useEffect(() => {
    loadData();
  }, [loadData]);

  useLayoutEffect(() => {
    if (!loading && tableRef.current && scrollPosition > 0) {
      setTimeout(() => {
        if (tableRef.current) {
          tableRef.current.scrollTop = scrollPosition;
        }
      }, 50);
    }
  }, [loading, pacientes, scrollPosition]);

  const aplicarFiltros = () => {
    if (tableRef.current) {
      setScrollPosition(tableRef.current.scrollTop);
    }
    setFiltros({ ...filtrosTemp, page: 1 });
    setShowFilters(false);
  };

  const cancelarFiltros = () => {
    setFiltrosTemp({ ...filtros });
    setShowFilters(false);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios = {
      search: '',
      dui: '',
      sexo: '',
      activo: 'true',
      page: 1,
      limit: 10,
    };
    setFiltros(filtrosLimpios);
    setFiltrosTemp(filtrosLimpios);
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
      setScrollPosition(0);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') aplicarFiltros();
  };

  const goToPage = (page) => {
    if (tableRef.current) {
      setScrollPosition(tableRef.current.scrollTop);
    }
    setFiltros({ ...filtros, page });
  };

  const handleExportarTodos = async () => {
    try {
      const blob = await exportarPacientes();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pacientes_todos_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Todos los pacientes exportados');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarFiltrados = async () => {
    try {
      const params = { ...filtros };
      delete params.page;
      delete params.limit;
      const blob = await exportarPacientesFiltrados(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pacientes_filtrados_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Pacientes filtrados exportados');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updatePaciente(editing.id, data);
        toast.success('Paciente actualizado');
      } else {
        await createPaciente(data);
        toast.success('Paciente creado');
      }
      setShowForm(false);
      setEditing(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (paciente) => {
    setEditing(paciente);
    setShowForm(true);
  };

  const handleDelete = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desactivar Paciente',
      message: `¿Estás seguro de desactivar a "${nombre}"?`,
      onConfirm: async () => {
        try {
          await deletePaciente(id);
          toast.success('Paciente desactivado');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al desactivar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleReactivar = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reactivar Paciente',
      message: `¿Estás seguro de reactivar a "${nombre}"?`,
      onConfirm: async () => {
        try {
          await reactivarPaciente(id);
          toast.success('Paciente reactivado');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al reactivar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const abrirExpediente = async (pacienteId) => {
    try {
      const paciente = pacientes.find(p => p.id === pacienteId);
      if (!paciente) {
        toast.error('Paciente no encontrado');
        return;
      }
      setExpedientePaciente(paciente);
      setShowExpediente(true);
    } catch (error) {
      console.error('Error al abrir expediente:', error);
      toast.error('Error al abrir expediente');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some(v => v && v !== '' && v !== 1 && v !== false);

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" /> Gestión de Pacientes
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Expedientes clínicos y control de pacientes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportarTodos}
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar Todo
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
          >
            <Plus size={14} /> Nuevo Paciente
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                showFilters
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'
              }`}
            >
              <Filter size={14} />
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Pacientes'}
            </button>
            <button
              onClick={handleExportarFiltrados}
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={13} /> Exportar Vista
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="italic">
              {filtros.search ? `🔍 "${filtros.search}"` : 'Todos los pacientes'}
              {filtros.sexo && ` | Sexo: ${filtros.sexo === 'M' ? 'Masculino' : filtros.sexo === 'F' ? 'Femenino' : 'Otro'}`}
              {filtros.activo === 'true' && ' | ✅ Activos'}
              {filtros.activo === 'false' && ' | 🚫 Inactivos'}
            </span>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 p-3 border-t border-gray-700/70">
            {/* Input Unificado de Búsqueda */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por paciente, dueño o DUI..."
                value={filtrosTemp.search}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, search: e.target.value })}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-7 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <select
              value={filtrosTemp.sexo}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, sexo: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los sexos</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
            <select
              value={filtrosTemp.activo}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, activo: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
              <option value="">Todos los estados</option>
            </select>
            <div className="col-span-full flex justify-end gap-2 mt-1">
              <button
                onClick={cancelarFiltros}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarFiltros}
                className="px-4 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md transition"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TABLA CON COLUMNAS DINÁMICAS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Pacientes</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {total}
          </span>
        </div>

        <div ref={tableRef} className="overflow-x-auto min-h-[380px] pb-4 rounded-b-xl" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Nombre</th>
                {isVeterinaria ? (
                  // Columnas para Veterinaria
                  <>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Edad</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Dueño</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Especie / Raza</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Color</th>
                  </>
                ) : (
                  // Columnas para Clínica General y Dental
                  <>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Edad</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Cliente</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Sexo</th>
                  </>
                )}
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Peso</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {pacientes.length === 0 ? (
                <tr>
                  <td colSpan={isVeterinaria ? 8 : 7} className="px-4 py-10 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron pacientes.</p>
                  </td>
                </tr>
              ) : (
                pacientes.map((p) => {
                  const edad = calcularEdad(p.fecha_nacimiento);
                  return (
                    <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                      {/* Nombre siempre presente */}
                      <td className="px-2 py-1 text-white font-semibold whitespace-nowrap">
                        {p.nombre} {p.apellidos || ''}
                      </td>

                      {isVeterinaria ? (
                        // === VETERINARIA ===
                        <>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{edad !== '-' ? `${edad} años` : '-'}</td>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{p.cliente_nombre || 'Sin asignar'}</td>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">
                            {p.especie || '-'} {p.raza ? `(${p.raza})` : ''}
                          </td>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{p.color || '-'}</td>
                        </>
                      ) : (
                        // === CLÍNICA GENERAL Y DENTAL ===
                        <>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{edad !== '-' ? `${edad} años` : '-'}</td>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{p.cliente_nombre || 'Sin asignar'}</td>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">
                            {p.genero === 'M' ? 'Masculino' : p.genero === 'F' ? 'Femenino' : 'Otro'}
                          </td>
                        </>
                      )}

                      {/* Peso (común para todos) */}
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{p.peso ? `${p.peso} kg` : '-'}</td>

                      {/* Estado (común) */}
                      <td className="px-2 py-1 whitespace-nowrap">
                        {p.activo === 1 ? (
                          <span className="text-emerald-400 font-semibold">Activo</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">Inactivo</span>
                        )}
                      </td>

                      {/* Acciones (común) */}
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => abrirExpediente(p.id)}
                            title="Ver Expediente"
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent hover:bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Eye size={12} /> <span>Expediente</span>
                          </button>
                          
                          {p.activo === 1 ? (
                            <>
                              <button
                                onClick={() => handleEdit(p)}
                                title="Editar paciente"
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent hover:bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Edit2 size={12} /> <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.nombre)}
                                title="Desactivar paciente"
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent hover:bg-rose-500/10 text-rose-400 border border-rose-500/50 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Trash2 size={12} /> <span>Desactivar</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleReactivar(p.id, p.nombre)}
                              title="Reactivar paciente"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 rounded-lg text-xs font-medium transition-colors"
                            >
                              <RotateCcw size={12} /> <span>Reactivar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-2 border-t border-gray-700/80 bg-gray-900/50 text-xs">
            <span className="text-gray-400">
              Mostrando página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> ({total} pacientes)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                      p === page
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALES */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <PacienteForm
              initialData={editing || {}}
              tipoOrganizacion={tipoOrg}
              clientes={clientes}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              loading={saving}
              isEditing={!!editing}
            />
          </div>
        </div>
      )}

      {showExpediente && expedientePaciente && (
        <ExpedientePaciente
          paciente={expedientePaciente}
          onClose={() => {
            setShowExpediente(false);
            setExpedientePaciente(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
    </div>
  );
};

export default Pacientes;