// frontend/src/pages/organization/Employees.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  desactivarEmployee,
  reactivarEmployee,
  exportarEmpleados,
} from '../../api/payroll';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmployeeForm from '../../components/forms/EmployeeForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { getTodayLocal } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import {
  Download,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Search,
  X,
  RotateCcw,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react';

const Employees = () => {
  const [empleados, setEmpleados] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros aplicados
  const [filtros, setFiltros] = useState({
    search: '',
    activo: '', // '' = todos, 'true' = activos, 'false' = inactivos
    page: 1,
    limit: 10,
  });

  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Cargar empleados
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmployees(filtros);
      setEmpleados(data.empleados || []);
      setPaginacion(data.paginacion || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (err) {
      console.error('❌ Error cargando empleados:', err);
      setError(err.message || 'Error al cargar empleados');
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtros.page, filtros.search, filtros.activo]);

  // Restaurar scroll
  useEffect(() => {
    if (!loading && tableRef.current && scrollPosition > 0) {
      requestAnimationFrame(() => {
        if (tableRef.current) tableRef.current.scrollTop = scrollPosition;
      });
    }
  }, [loading, empleados]);

  // Filtros
  const aplicarFiltros = () => {
    if (tableRef.current) setScrollPosition(tableRef.current.scrollTop);
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
      activo: '',
      page: 1,
      limit: 10,
    };
    setFiltros(filtrosLimpios);
    setFiltrosTemp(filtrosLimpios);
    if (tableRef.current) setScrollPosition(0);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      aplicarFiltros();
    }
  };

  // Título dinámico
  const getTablaTitle = () => {
    const partes = [];
    if (filtros.search) partes.push(`🔍 "${filtros.search}"`);
    if (filtros.activo === 'true') partes.push('✅ Activos');
    if (filtros.activo === 'false') partes.push('🚫 Inactivos');
    if (partes.length === 0) return 'Todos los empleados registrados';
    return `Filtrado por: ${partes.join(' | ')}`;
  };

  // Acciones
  const handleExportar = async () => {
    try {
      const params = { search: filtros.search, activo: filtros.activo };
      const blob = await exportarEmpleados(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `empleados_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Empleados exportados');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateEmployee(editing.id, data);
        toast.success('Empleado actualizado');
      } else {
        await createEmployee(data);
        toast.success('Empleado creado');
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desactivar empleado',
      message: `¿Estás seguro de desactivar a "${nombre}"? Podrás reactivarlo más adelante.`,
      onConfirm: async () => {
        try {
          await desactivarEmployee(id);
          toast.success('Empleado desactivado');
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
      title: 'Reactivar empleado',
      message: `¿Estás seguro de reactivar a "${nombre}"?`,
      onConfirm: async () => {
        try {
          await reactivarEmployee(id);
          toast.success('Empleado reactivado');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al reactivar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const goToPage = (page) => {
    if (tableRef.current) setScrollPosition(tableRef.current.scrollTop);
    setFiltros({ ...filtros, page });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some(v => v && v !== '' && v !== 1 && v !== false);
  const activos = empleados.filter(e => e.activo === 1).length;
  const inactivos = empleados.filter(e => e.activo === 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" /> Gestión de Empleados
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Administra el personal, salarios y datos de cotización.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportar}
            title="Exportar empleados en CSV"
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            title="Agregar nuevo empleado"
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
          >
            <Plus size={14} /> Nuevo Empleado
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-emerald-400" />
          <div>
            <p className="text-sm text-gray-400">Empleados Activos</p>
            <p className="text-2xl font-bold text-emerald-400">{activos}</p>
          </div>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
          <UserX className="w-8 h-8 text-rose-400" />
          <div>
            <p className="text-sm text-gray-400">Empleados Inactivos</p>
            <p className="text-2xl font-bold text-rose-400">{inactivos}</p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              title="Mostrar u ocultar filtros avanzados"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                showFilters
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'
              }`}
            >
              <Filter size={14} />
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Empleados'}
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="italic">{getTablaTitle()}</span>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                title="Eliminar todos los filtros aplicados"
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 p-2 border-t border-gray-700/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, apellidos o DUI..."
                value={filtrosTemp.search}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, search: e.target.value })}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-7 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {filtrosTemp.search && (
                <button
                  onClick={() => setFiltrosTemp({ ...filtrosTemp, search: '' })}
                  title="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <select
              value={filtrosTemp.activo}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, activo: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los empleados</option>
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
            </select>
            <div className="col-span-full flex justify-end gap-4 mt-5">
              <button
                onClick={cancelarFiltros}
                title="Cancelar cambios en los filtros"
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarFiltros}
                title="Aplicar los filtros seleccionados"
                className="px-4 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md transition"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Empleados</h3>
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
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Apellidos</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Salario</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">DUI</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">ISSS</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">AFP</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {empleados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron empleados.</p>
                  </td>
                </tr>
              ) : (
                empleados.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-2 py-1 text-white font-semibold whitespace-nowrap">{e.nombre}</td>
                    <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{e.apellidos || '-'}</td>
                    <td className="px-2 py-1 text-emerald-400 font-mono font-bold whitespace-nowrap">${parseFloat(e.salario_base).toFixed(2)}</td>
                    <td className="px-2 py-1 text-gray-300 font-mono whitespace-nowrap">{e.dui}</td>
                    <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{e.isss_numero || '-'}</td>
                    <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{e.afp_numero || '-'}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {e.activo === 1 ? (
                        <span className="text-emerald-400 font-semibold">Activo</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">Inactivo</span>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {e.activo === 1 ? (
                          <>
                            <button
                              onClick={() => { setEditing(e); setShowModal(true); }}
                              title="Editar empleado"
                              className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded text-xs font-semibold transition"
                            >
                              <Edit3 size={14} />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDelete(e.id, e.nombre)}
                              title="Desactivar empleado"
                              className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded text-xs font-semibold transition"
                            >
                              <Trash2 size={14} />
                              <span>Desactivar</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleReactivar(e.id, e.nombre)}
                            title="Reactivar empleado"
                            className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-xs font-semibold transition"
                          >
                            <RotateCcw size={14} />
                            <span>Activar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-2 border-t border-gray-700/80 bg-gray-900/50 text-xs">
            <span className="text-gray-400">
              Mostrando página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> ({total} empleados)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                title="Página anterior"
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
                    title={`Ir a página ${p}`}
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
                title="Página siguiente"
                className="px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALES */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editing ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h2>
            <EmployeeForm
              initialData={editing || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowModal(false); setEditing(null); }}
              loading={saving}
            />
          </div>
        </div>
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

export default Employees;