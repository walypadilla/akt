// frontend/src/pages/organization/Medicos.jsx
import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Search, Plus, Download, Filter, X, Award, User, FileText, Power
} from 'lucide-react';
import {
  getMedicos,
  crearMedico,
  actualizarMedico,
  eliminarMedico,
  reactivarMedico,
  exportarMedicosTodos,
  getAniosMedicos,
  getMedicosDisponibles,
  exportarMedicosFiltrados,
} from '../../api/clinica';
import MedicoDetalleModal from '../../components/common/clinica/MedicoDetalleModal';
import MedicoForm from '../../components/forms/clinica/MedicoForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { getTodayLocal } from '../../utils/dateUtils';

const Medicos = () => {
  const { user } = useAuth();
  const puedeGestionarMedicos = ['Admin', 'SUPER_ADMIN'].includes(user?.rol);

  // Estados de datos
  const [medicos, setMedicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('activos');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState('');
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [detalleMedicoId, setDetalleMedicoId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Estados para Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [medicoEditando, setMedicoEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // ============ CARGA DE DATOS ============
  const cargarMedicos = async () => {
    try {
      setLoading(true);
      setError(null);
      // Ahora enviamos search y estado para alinear con el backend corregido
      const params = {
        ...(busqueda && { search: busqueda }),
        estado: estadoFiltro,
        anio,
        mes,
      };

      const data = await getMedicos(params);
      setMedicos(Array.isArray(data) ? data : data.medicos || []);
    } catch (err) {
      console.error('Error al cargar médicos:', err);
      setError('No se pudo cargar la lista de médicos.');
      toast.error('No se pudo cargar la lista de médicos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMedicos();
  }, [estadoFiltro, anio, mes]);

  useEffect(() => {
    const fetchAnios = async () => {
      try {
        const data = await getAniosMedicos();
        setAniosDisponibles(data && data.length > 0 ? data : [new Date().getFullYear()]);
      } catch (err) {
        console.error('Error al cargar años:', err);
        setAniosDisponibles([new Date().getFullYear()]);
      }
    };
    fetchAnios();
  }, []);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const data = await getMedicosDisponibles();
        setUsuariosDisponibles(data || []);
      } catch (err) {
        console.error('Error al cargar usuarios disponibles:', err);
      }
    };
    fetchUsuarios();
  }, []);

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarMedicos();
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setEstadoFiltro('activos');
    setAnio(new Date().getFullYear());
    setMes('');
  };

  // ============ MODAL CRUD ============
  const abrirModalNuevo = async () => {
    setMedicoEditando(null);
    setModalAbierto(true);
    try {
      const data = await getMedicosDisponibles();
      setUsuariosDisponibles(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const abrirModalEditar = (medico) => {
    setMedicoEditando(medico);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setMedicoEditando(null);
  };

  const handleGuardar = async (payload) => {
    try {
      setGuardando(true);
      if (medicoEditando) {
        await actualizarMedico(medicoEditando.id, payload);
        toast.success('Médico actualizado correctamente');
      } else {
        const result = await crearMedico(payload);
        toast.success('Médico creado correctamente');
        if (result?.password_temporal) {
          setTimeout(() => {
            alert(
              `Contraseña temporal para ${payload.correo}:\n\n${result.password_temporal}\n\nGuárdala y compártela con el médico.`
            );
          }, 300);
        }
      }
      cerrarModal();
      cargarMedicos();
    } catch (err) {
      console.error('Error al guardar médico:', err);
      toast.error(err.response?.data?.message || 'Ocurrió un error al guardar el médico.');
    } finally {
      setGuardando(false);
    }
  };

  // ============ TOGGLE ESTADO ============
  const handleToggleEstado = (medico) => {
    const estaActivo = medico.activo ?? true;
    const accion = estaActivo ? 'Inactivar' : 'Reactivar';
    const verbo = estaActivo ? 'inactivar' : 'reactivar';

    setConfirmModal({
      isOpen: true,
      title: `${accion} Médico`,
      message: `¿Estás seguro de ${verbo} al médico "${medico.nombre}"? ${
        estaActivo
          ? 'No podrá ser asignado a nuevas consultas.'
          : 'Volverá a estar disponible para consultas.'
      }`,
      onConfirm: async () => {
        try {
          if (estaActivo) {
            await eliminarMedico(medico.id);
            toast.success('Médico inactivado');
          } else {
            await reactivarMedico(medico.id);
            toast.success('Médico reactivado');
          }
          cargarMedicos();
        } catch (err) {
          console.error('Error al cambiar estado:', err);
          toast.error('No se pudo cambiar el estado del médico.');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  // ============ EXPORTACIONES ============
  const descargarCSV = (blob, nombreArchivo) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleExportarTodos = async () => {
    try {
      const blob = await exportarMedicosTodos();
      descargarCSV(blob, `medicos_todos_${getTodayLocal()}.csv`);
      toast.success('Médicos exportados correctamente');
    } catch (err) {
      console.error('Error al exportar todos:', err);
      toast.error('Error al exportar el archivo.');
    }
  };

  const handleExportarFiltrados = async () => {
    try {
      const params = {
        ...(busqueda && { search: busqueda }),
        estado: estadoFiltro,
        anio,
        mes,
      };
      const blob = await exportarMedicosFiltrados(params);
      descargarCSV(blob, `medicos_filtrados_${getTodayLocal()}.csv`);
      toast.success('Médicos filtrados exportados');
    } catch (err) {
      console.error('Error al exportar filtrados:', err);
      toast.error('Error al exportar el archivo.');
    }
  };

  // ============ RENDER ============
  if (loading && medicos.length === 0) return <LoadingSpinner />;
  if (error && medicos.length === 0) {
    return <ErrorMessage message={error} onRetry={cargarMedicos} />;
  }

  const tieneFiltrosActivos = busqueda || estadoFiltro !== 'activos' || mes;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-purple-400" /> Gestión de Médicos
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Administra el personal médico, especialidades y licencias.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportarTodos}
            title="Descargar el registro de todos los médicos en formato CSV"
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar Todo
          </button>
          <button
            onClick={handleExportarFiltrados}
            disabled={medicos.length === 0}
            title="Descargar únicamente los médicos mostrados actualmente en la tabla"
            className="bg-cyan-600/20 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar Vista
          </button>
          {puedeGestionarMedicos && (
            <button
              onClick={abrirModalNuevo}
              title="Registrar un nuevo perfil de médico en el sistema"
              className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
            >
              <Plus size={14} /> Nuevo Médico
            </button>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              title="Mostrar u ocultar la barra de filtros avanzados"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                showFilters
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'
              }`}
            >
              <Filter size={14} />
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Médicos'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="italic">
              {busqueda ? `🔍 "${busqueda}"` : 'Todos los médicos'}
              {mes && ` | Mes: ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(mes) - 1]}`}
              {estadoFiltro === 'activos' && ' | ✅ Activos'}
              {estadoFiltro === 'inactivos' && ' | 🚫 Inactivos'}
            </span>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                title="Quitar todos los filtros aplicados y mostrar la lista original"
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 p-3 border-t border-gray-700/70">
            <form onSubmit={handleBuscar} className="relative col-span-full sm:col-span-1 lg:col-span-2">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, especialidad o licencia..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 pr-20 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 px-3 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded transition"
              >
                Buscar
              </button>
            </form>
            <select
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              title="Filtrar desempeño por año"
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>Año: {a}</option>
              ))}
            </select>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              title="Filtrar desempeño por mes"
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los meses</option>
              {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((n, i) => (
                <option key={i + 1} value={i + 1}>{n}</option>
              ))}
            </select>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              title="Mostrar médicos según su estado operativo"
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
              <option value="todos">Todos los estados</option>
            </select>
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Médicos</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {medicos.length}
          </span>
        </div>

        <div className="overflow-x-auto min-h-[380px] pb-4 rounded-b-xl" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Especialidad</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Licencia</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Contacto</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Total Facturado</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-gray-400">
                    <Stethoscope className="w-8 h-8 mx-auto text-gray-600 mb-1 animate-pulse" />
                    <p className="text-xs font-medium">Cargando médicos...</p>
                  </td>
                </tr>
              ) : medicos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-gray-400">
                    <Stethoscope className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron médicos con los filtros aplicados.</p>
                  </td>
                </tr>
              ) : (
                medicos.map((med) => {
                  const activo = med.activo ?? true;
                  return (
                    <tr key={med.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-2 py-1.5 text-white font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center text-xs font-bold text-purple-300">
                            {med.nombre?.charAt(0)?.toUpperCase() || 'M'}
                          </div>
                          <span>{med.nombre}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">
                        {med.especialidad || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-300 font-mono whitespace-nowrap">
                        {med.numero_licencia || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">
                        <div className="text-xs">
                          {med.correo && <div className="text-gray-400">{med.correo}</div>}
                          {med.telefono && <div>Tel: {med.telefono}</div>}
                          {!med.correo && !med.telefono && '-'}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            activo
                              ? 'bg-green-900/40 text-green-300 border border-green-700/40'
                              : 'bg-rose-900/40 text-rose-300 border border-rose-700/40'
                          }`}
                        >
                          {activo ? '● Activo' : '● Inactivo'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-semibold text-emerald-400 whitespace-nowrap">
                        ${Number(med.total_facturado || 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setDetalleMedicoId(med.id)}
                            title="Ver detalles, consultas y facturación del médico"
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded text-xs font-semibold transition"
                          >
                            <FileText size={14} />
                            <span>Detalle</span>
                          </button>
                          
                          {puedeGestionarMedicos && (
                            <>
                              <button
                                onClick={() => abrirModalEditar(med)}
                                title="Modificar la especialidad o licencia del médico"
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded text-xs font-semibold transition"
                              >
                                <Award size={14} />
                                <span>Editar</span>
                              </button>
                              
                              <button
                                onClick={() => handleToggleEstado(med)}
                                title={activo ? 'Desactivar a este médico' : 'Reactivar a este médico'}
                                className={`flex items-center gap-1.5 px-2.5 py-1 border rounded text-xs font-semibold transition ${
                                  activo
                                    ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border-rose-500/30'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border-emerald-500/30'
                                }`}
                              >
                                <Power size={14} />
                                <span>{activo ? 'Desactivar' : 'Activar'}</span>
                              </button>
                            </>
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
      </div>

      {/* MODAL CRUD */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Stethoscope size={20} className="text-purple-400" />
                {medicoEditando ? 'Editar Médico' : 'Registrar Nuevo Médico'}
              </h2>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
            <MedicoForm
              initialData={
                medicoEditando || {
                  usuario_id: '',
                  especialidad: '',
                  numero_licencia: '',
                }
              }
              usuarios={usuariosDisponibles}
              onSubmit={handleGuardar}
              onCancel={cerrarModal}
              loading={guardando}
              isEditing={!!medicoEditando}
            />
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {detalleMedicoId && (
        <MedicoDetalleModal
          medicoId={detalleMedicoId}
          onClose={() => setDetalleMedicoId(null)}
        />
      )}

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() =>
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
        }
      />
    </div>
  );
};

export default Medicos;