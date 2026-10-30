// frontend/src/pages/organization/Examenes.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Search, Plus, Edit2, Trash2, CheckCircle, XCircle, X,
  FileText, Download, Filter, FlaskConical, Clock, User, Calendar,
  ClipboardList, TrendingUp, Send, Link as LinkIcon, Check,
  Eye, Home, Building2, Activity, RotateCcw, Package, AlertCircle, ChevronDown
} from 'lucide-react';
import {
  getExamenes,
  createExamen,
  updateExamen,
  deleteExamen,
  reactivarExamen,
  getSolicitudesExamen,
  solicitarExamen,
  completarExamen,
  cancelarSolicitudExamen,
  getPacientes,
  getConsultas,
  generarExamenPDF,
  getDashboardExamenes,
  getEstadoWhatsApp,
  exportarSolicitudesExamen,
  exportarCatalogoExamenes,
  enviarResultadoWhatsApp,
} from '../../api/clinica';
import ExamenForm from '../../components/forms/clinica/ExamenForm';
import ResultadosModal from '../../components/common/clinica/ResultadosModal';
import VisorResultadoModal from '../../components/common/clinica/VisorResultadoModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { getTodayLocal } from '../../utils/dateUtils';
import Select from 'react-select';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const normalizar = (t) =>
  !t ? '' : t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const Examenes = () => {
  const hoy = new Date();
  const { user } = useAuth();
  
  const tieneWhatsappActivado = 
    user?.organizacion?.whatsapp_activado === 1 || 
    user?.organizacion?.whatsapp_activado === true || 
    user?.organizacion?.whatsapp_activado === '1';

  const [activeTab, setActiveTab] = useState('catalogo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para desplegable por Clic + Hover
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Catálogo
  const [examenes, setExamenes] = useState([]);
  const [showFormCatalogo, setShowFormCatalogo] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchCatalogo, setSearchCatalogo] = useState('');

  // Solicitudes
  const [solicitudes, setSolicitudes] = useState([]);
  const [showFormSolicitud, setShowFormSolicitud] = useState(false);
  const [formSolicitud, setFormSolicitud] = useState({
    paciente_id: '',
    consulta_id: '',
    examen_id: '',
    tipo_ejecucion: 'Interno',
  });
  const [filtros, setFiltros] = useState({
    search: '',
    estado: '',
    examen_id: '',
    fecha_inicio: '',
    fecha_fin: '',
  });

  const catalogosFiltrados = examenes.filter((e) => {
    if (!searchCatalogo) return true;
    const term = normalizar(searchCatalogo);
    const nombre = normalizar(e.nombre || '');
    const desc = normalizar(e.descripcion || '');
    return nombre.includes(term) || desc.includes(term);
  });

  const [showFilters, setShowFilters] = useState(false);

  // Dashboard
  const [dashboard, setDashboard] = useState({
    pendientes: 0,
    delMes: 0,
    completadosMes: 0,
    topExamenes: [],
    aniosDisponibles: [hoy.getFullYear()],
  });
  const [anioDashboard, setAnioDashboard] = useState(hoy.getFullYear());
  const [mesDashboard, setMesDashboard] = useState(hoy.getMonth() + 1);
  const [aniosDisponibles, setAniosDisponibles] = useState([hoy.getFullYear()]);
  const [cargandoDashboard, setCargandoDashboard] = useState(false);

  // WhatsApp
  const [whatsappDisponible, setWhatsappDisponible] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Datos auxiliares
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);

  // Modales
  const [resultadosModal, setResultadosModal] = useState({ isOpen: false, solicitud: null, plantilla: '' });
  const [visorModal, setVisorModal] = useState({ isOpen: false, solicitud: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // ============ CARGA DE DATOS ============
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [examenesData, solicitudesData, pacientesData, consultasData, wa] =
        await Promise.all([
          getExamenes(),
          getSolicitudesExamen(),
          getPacientes({ limit: 99999 }),
          getConsultas({ limit: 99999 }),
          getEstadoWhatsApp().catch(() => ({ activo: false })),
        ]);

      setExamenes(Array.isArray(examenesData) ? examenesData : examenesData.examenes || []);
      setSolicitudes(Array.isArray(solicitudesData) ? solicitudesData : solicitudesData.solicitudes || []);
      setPacientes(pacientesData.pacientes || pacientesData || []);
      setConsultas(consultasData.consultas || consultasData || []);
      setWhatsappDisponible(wa?.activo === true);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos. Verifica la conexión.');
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarDashboard = async () => {
    setCargandoDashboard(true);
    try {
      const data = await getDashboardExamenes({ anio: anioDashboard, mes: mesDashboard });
      setDashboard(data || {});
      if (Array.isArray(data?.aniosDisponibles) && data.aniosDisponibles.length > 0) {
        setAniosDisponibles(data.aniosDisponibles);
      }
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setCargandoDashboard(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { cargarDashboard(); }, [anioDashboard, mesDashboard]);

  // ============ CATÁLOGO CRUD ============
  const handleSubmitCatalogo = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateExamen(editing.id, data);
        toast.success('Examen actualizado');
      } else {
        await createExamen(data);
        toast.success('Examen creado');
      }
      setShowFormCatalogo(false);
      setEditing(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCatalogo = (examen) => {
    setEditing(examen);
    setShowFormCatalogo(true);
  };

  const handleDeleteCatalogo = (examen) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desactivar Examen',
      message: `¿Desactivar el examen "${examen.nombre}"? Ya no aparecerá para nuevas solicitudes. Podrás reactivarlo más adelante.`,
      onConfirm: async () => {
        try {
          await deleteExamen(examen.id);
          toast.success('Examen desactivado');
          loadData();
        } catch {
          toast.error('Error al desactivar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleReactivarCatalogo = (examen) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reactivar Examen',
      message: `¿Reactivar el examen "${examen.nombre}"? Volverá a estar disponible para nuevas solicitudes.`,
      onConfirm: async () => {
        try {
          await reactivarExamen(examen.id);
          toast.success('Examen reactivado');
          loadData();
        } catch {
          toast.error('Error al reactivar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleExportarCatalogo = async () => {
    try {
      const blob = await exportarCatalogoExamenes({ search: searchCatalogo });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalogo_examenes_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Catálogo exportado exitosamente');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al exportar catálogo');
    }
  };

  // ============ SOLICITUDES ============
  const handleSubmitSolicitud = async (e) => {
    e.preventDefault();
    if (!formSolicitud.paciente_id || !formSolicitud.examen_id) {
      toast.warning('Complete los campos obligatorios');
      return;
    }
    if (!formSolicitud.consulta_id) {
      toast.warning('Debes asociar el examen a una consulta para poder facturarlo');
      return;
    }
    try {
      await solicitarExamen(formSolicitud);
      toast.success('Examen solicitado');
      setShowFormSolicitud(false);
      setFormSolicitud({ paciente_id: '', consulta_id: '', examen_id: '', tipo_ejecucion: 'Interno' });
      loadData();
      cargarDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al solicitar examen');
    }
  };

  const handleAbrirResultados = (solicitud) => {
    const examen = examenes.find((e) => e.id === solicitud.examen_id);
    setResultadosModal({ isOpen: true, solicitud, plantilla: examen?.plantilla_resultados || '' });
  };

  const handleGuardarResultados = async ({ resultado_texto }) => {
    try {
      await completarExamen(resultadosModal.solicitud.id, { resultado_texto });
      toast.success('Resultados guardados');
      setResultadosModal({ isOpen: false, solicitud: null, plantilla: '' });
      loadData();
      cargarDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar resultados');
    }
  };

  const handleCancelarSolicitud = (solicitud) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Solicitud',
      message: `¿Cancelar la solicitud de "${solicitud.examen_nombre}" para ${solicitud.paciente_nombre}?`,
      onConfirm: async () => {
        try {
          await cancelarSolicitudExamen(solicitud.id);
          toast.success('Solicitud cancelada');
          loadData();
          cargarDashboard();
        } catch {
          toast.error('Error al cancelar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleDescargarPDF = async (solicitud) => {
    try {
      const blob = await generarExamenPDF(solicitud.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultado_${solicitud.examen_nombre.replace(/\s/g, '_')}_${solicitud.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch {
      toast.error('Error al generar PDF');
    }
  };

  const handleEnviarWhatsApp = (solicitud) => {
    setConfirmModal({
      isOpen: true,
      title: 'Enviar por WhatsApp',
      message: (
        <div className="space-y-2">
          <p>¿Enviar el resultado de "<strong>{solicitud.examen_nombre}</strong>" a <strong>{solicitud.paciente_nombre}</strong>?</p>
          <p className="text-xs text-gray-400">Se incluirá el link público válido por 7 días.</p>
        </div>
      ),
      onConfirm: async () => {
        try {
          const result = await enviarResultadoWhatsApp(solicitud.id);
          toast.success(`Enviado a ${result.telefono}`);
          cargarDashboard();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al enviar WhatsApp');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleCopiarLink = async (solicitud) => {
    if (!solicitud.token_publico) {
      toast.error('Este examen no tiene link público generado');
      return;
    }
    const url = `${window.location.origin}/resultado/${solicitud.token_publico}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(solicitud.id);
      toast.success('Link copiado. Válido 7 días.');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('No se pudo copiar el link');
    }
  };

  const handleExportarCSV = async () => {
    try {
      const params = {};
      if (filtros.search) params.search = filtros.search;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.examen_id) params.examen_id = filtros.examen_id;
      if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
      if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;

      const blob = await exportarSolicitudesExamen(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solicitudes_examen_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Solicitudes exportadas');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al exportar');
    }
  };

  // ============ FILTROS ============
  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtros.search) {
      const term = normalizar(filtros.search);
      const paciente = normalizar(`${s.paciente_nombre || ''} ${s.paciente_apellidos || ''}`);
      if (!paciente.includes(term)) return false;
    }
    if (filtros.estado && s.estado !== filtros.estado) return false;
    if (filtros.examen_id && s.examen_id !== parseInt(filtros.examen_id)) return false;
    if (filtros.fecha_inicio) {
      const f = new Date(s.fecha_solicitud);
      if (f < new Date(filtros.fecha_inicio)) return false;
    }
    if (filtros.fecha_fin) {
      const f = new Date(s.fecha_solicitud);
      const fin = new Date(filtros.fecha_fin);
      fin.setHours(23, 59, 59);
      if (f > fin) return false;
    }
    return true;
  });

  const limpiarFiltros = () => setFiltros({ search: '', estado: '', examen_id: '', fecha_inicio: '', fecha_fin: '' });
  const tieneFiltrosActivos = filtros.search || filtros.estado || filtros.examen_id || filtros.fecha_inicio || filtros.fecha_fin;

  const getEstadoBadge = (estado) => {
    const config = {
      Pendiente: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
      Completado: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
      Cancelado: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
    };
    return config[estado] || 'bg-gray-700 text-gray-300 border-gray-600';
  };

  const getEstadoIcon = (estado) => {
    if (estado === 'Completado') return <CheckCircle size={12} />;
    if (estado === 'Cancelado') return <XCircle size={12} />;
    return <Clock size={12} />;
  };

  const volverMesActual = () => {
    const h = new Date();
    setAnioDashboard(h.getFullYear());
    setMesDashboard(h.getMonth() + 1);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-400" /> Exámenes y Laboratorio
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Catálogo, solicitudes, resultados y envío al paciente.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-lg border border-gray-700">
            <button
              onClick={() => setActiveTab('catalogo')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                activeTab === 'catalogo' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              Catálogo ({examenes.length})
            </button>
            <button
              onClick={() => setActiveTab('solicitudes')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                activeTab === 'solicitudes' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              Solicitudes ({solicitudes.length})
            </button>
          </div>

          {activeTab === 'catalogo' && (
            <button
              onClick={() => { setEditing(null); setShowFormCatalogo(true); }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
            >
              <Plus size={14} /> Nuevo Examen
            </button>
          )}

          {activeTab === 'solicitudes' && (
            <>
              <button
                onClick={handleExportarCSV}
                disabled={solicitudesFiltradas.length === 0}
                className="bg-emerald-600/20 hover:bg-emerald-600 disabled:opacity-50 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download size={14} /> Exportar CSV
              </button>
              <button
                onClick={() => {
                  setFormSolicitud({ paciente_id: '', consulta_id: '', examen_id: '', tipo_ejecucion: 'Interno' });
                  setShowFormSolicitud(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-cyan-900/30"
              >
                <Plus size={14} /> Solicitar Examen
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==================== TAB SOLICITUDES (DASHBOARD) ==================== */}
      {activeTab === 'solicitudes' && (
        <>
          <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-purple-400" /> Período del resumen
            </span>
            <select
              value={anioDashboard}
              onChange={(e) => setAnioDashboard(parseInt(e.target.value))}
              className="bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              {aniosDisponibles.map((a) => <option key={a} value={a}>Año: {a}</option>)}
            </select>
            <select
              value={mesDashboard}
              onChange={(e) => setMesDashboard(parseInt(e.target.value))}
              className="bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              {MESES.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
            </select>
            <button onClick={volverMesActual} className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 font-semibold transition">
              Mes Actual
            </button>
            <span className="text-xs text-gray-500 ml-auto italic">
              {cargandoDashboard ? 'Cargando...' : `Mostrando: ${MESES[mesDashboard - 1]} ${anioDashboard}`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-400">Pendientes (global)</p>
                <p className="text-2xl font-bold text-yellow-400">{dashboard.pendientes || 0}</p>
              </div>
            </div>
            <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-sm text-gray-400">Solicitados {MESES_CORTO[mesDashboard - 1]} {anioDashboard}</p>
                <p className="text-2xl font-bold text-cyan-400">{dashboard.delMes || 0}</p>
              </div>
            </div>
            <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-sm text-gray-400">Completados {MESES_CORTO[mesDashboard - 1]} {anioDashboard}</p>
                <p className="text-2xl font-bold text-emerald-400">{dashboard.completadosMes || 0}</p>
              </div>
            </div>
          </div>

          {dashboard.topExamenes?.length > 0 && (
            <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-purple-400" /> Top 5 Exámenes Más Solicitados ({MESES[mesDashboard - 1]} {anioDashboard})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {dashboard.topExamenes.map((t, idx) => (
                  <div key={t.id} className="bg-gray-700/30 p-3 rounded-lg border border-gray-600 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs font-bold text-purple-300">{idx + 1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white font-medium truncate" title={t.nombre}>{t.nombre}</p>
                      <p className="text-xs text-gray-400">{t.total} solicitudes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== TAB CATÁLOGO ==================== */}
      {activeTab === 'catalogo' && (
        <div className="space-y-4">
          <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchCatalogo}
                onChange={(e) => setSearchCatalogo(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={handleExportarCatalogo}
              disabled={catalogosFiltrados.length === 0}
              className="bg-emerald-600/20 hover:bg-emerald-600 disabled:opacity-50 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>

          <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Catálogo de Exámenes</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">Total: {catalogosFiltrados.length}</span>
            </div>

            <div className="overflow-x-auto min-h-[380px] pb-4 rounded-b-xl" style={{ maxHeight: '550px', overflowY: 'auto' }}>
              <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Nombre</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Producto</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Descripción</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Plantilla</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Precio</th>
                    <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                    <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
                  {catalogosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-10 text-center text-gray-400">
                        <FlaskConical className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                        <p className="text-xs font-medium">No se encontraron resultados.</p>
                      </td>
                    </tr>
                  ) : (
                    catalogosFiltrados.map((e) => (
                      <tr key={e.id} className={`hover:bg-gray-700/30 transition-colors ${!e.activo ? 'opacity-50' : ''}`}>
                        <td className="px-2 py-1 text-white font-semibold whitespace-nowrap">{e.nombre}</td>
                        <td className="px-2 py-1 text-gray-300 whitespace-nowrap">
                          {e.producto_nombre ? (
                            <span className="inline-flex items-center gap-1"><Package size={10} className="text-purple-400" /> {e.producto_nombre}</span>
                          ) : (
                            <span className="text-gray-500 italic">Sin producto</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-gray-300 max-w-md truncate">{e.descripcion || <span className="text-gray-500 italic">Sin descripción</span>}</td>
                        <td className="px-2 py-1">
                          {e.plantilla_resultados ? (
                            <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 border border-purple-700/50 rounded text-xs font-semibold" title={e.plantilla_resultados}>✓ Configurada</span>
                          ) : (
                            <span className="text-gray-500 text-xs italic">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-emerald-400 font-bold whitespace-nowrap">${parseFloat(e.precio || 0).toFixed(2)}</td>
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${e.activo ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' : 'bg-rose-900/40 text-rose-300 border-rose-700/50'}`}>
                            {e.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {e.activo ? (
                              <>
                                <button
                                  onClick={() => handleEditCatalogo(e)}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded-lg transition font-medium text-xs"
                                >
                                  <Edit2 size={14} /> <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteCatalogo(e)}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg transition font-medium text-xs"
                                >
                                  <Trash2 size={14} /> <span>Desactivar</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleReactivarCatalogo(e)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg transition font-medium text-xs"
                              >
                                <RotateCcw size={14} /> <span>Reactivar</span>
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
          </div>
        </div>
      )}

      {/* ==================== TAB SOLICITUDES (TABLA) ==================== */}
      {activeTab === 'solicitudes' && (
        <>
          <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    showFilters ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'
                  }`}
                >
                  <Filter size={14} />
                  {showFilters ? 'Ocultar Filtros' : 'Filtrar Solicitudes'}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="italic">{tieneFiltrosActivos ? `${solicitudesFiltradas.length} resultados` : 'Todas las solicitudes'}</span>
                {tieneFiltrosActivos && (
                  <button onClick={limpiarFiltros} className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition">
                    <X size={12} /> Limpiar
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 p-3 border-t border-gray-700/70">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Buscar por paciente..."
                    value={filtros.search}
                    onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                    className="pl-8 pr-7 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full"
                  />
                </div>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                  className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs"
                >
                  <option value="">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Completado">Completado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                <select
                  value={filtros.examen_id}
                  onChange={(e) => setFiltros({ ...filtros, examen_id: e.target.value })}
                  className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs"
                >
                  <option value="">Todos los exámenes</option>
                  {examenes.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <input
                  type="date"
                  value={filtros.fecha_inicio}
                  onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
                  className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs"
                />
                <input
                  type="date"
                  value={filtros.fecha_fin}
                  onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
                  className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs"
                />
              </div>
            )}
          </div>

          <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Solicitudes de Examen</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">Total: {solicitudesFiltradas.length}</span>
            </div>

            {/* Contenedor sin padding adicional masivo para evitar el espacio feo al final */}
            <div className="overflow-x-auto min-h-[380px] pb-4 rounded-b-xl" style={{ maxHeight: '550px', overflowY: 'auto' }}>
              <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Paciente</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Examen</th>
                    <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Tipo</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Solicitado</th>
                    <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Resultado</th>
                    <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                    <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
                  {solicitudesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-10 text-center text-gray-400">
                        <ClipboardList className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                        <p className="text-xs font-medium">{tieneFiltrosActivos ? 'No hay solicitudes con los filtros aplicados.' : 'No hay solicitudes registradas.'}</p>
                      </td>
                    </tr>
                  ) : (
                    solicitudesFiltradas.map((s, index) => {
                      // Solo abre hacia arriba si es de las últimas 2 filas Y hay más de 4 registros
                      const esUltimaFila = index >= solicitudesFiltradas.length - 2 && solicitudesFiltradas.length > 4;

                      return (
                        <tr key={s.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-2 py-1 text-white font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-[10px] font-bold text-purple-300">
                                {s.paciente_nombre?.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                              <span>{s.paciente_nombre} {s.paciente_apellidos || ''}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{s.examen_nombre}</td>
                          <td className="px-2 py-1 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${s.tipo_ejecucion === 'Externo' ? 'bg-orange-900/40 text-orange-300 border-orange-700/50' : 'bg-blue-900/40 text-blue-300 border-blue-700/50'}`}>
                              {s.tipo_ejecucion === 'Externo' ? <Building2 size={10} /> : <Home size={10} />}
                              {s.tipo_ejecucion || 'Interno'}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{s.fecha_solicitud ? new Date(s.fecha_solicitud).toLocaleDateString('es-SV') : '-'}</td>
                          <td className="px-2 py-1 text-gray-300 max-w-xs">
                            {s.resultado_texto ? (
                              <span className="italic text-gray-400 truncate block" title={s.resultado_texto}>
                                {s.resultado_texto.length > 60 ? s.resultado_texto.substring(0, 60) + '...' : s.resultado_texto}
                              </span>
                            ) : (
                              <span className="text-gray-500 italic">Sin resultados</span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border ${getEstadoBadge(s.estado)}`}>
                              {getEstadoIcon(s.estado)} {s.estado}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-center whitespace-nowrap relative">
                            
                            {/* MENÚ FLOTANTE DINÁMICO */}
                            <div className="relative group inline-block text-left" onMouseLeave={() => setOpenDropdownId(null)}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(openDropdownId === `sol-${s.id}` ? null : `sol-${s.id}`);
                                }}
                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-700/60 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white transition-colors focus:outline-none"
                              >
                                Acciones
                                <ChevronDown 
                                  size={14} 
                                  className={`transition-transform duration-200 ${
                                    openDropdownId === `sol-${s.id}`
                                      ? esUltimaFila ? 'rotate-0' : 'rotate-180' 
                                      : esUltimaFila ? 'rotate-180 group-hover:rotate-0' : 'group-hover:rotate-180'
                                  }`} 
                                />
                              </button>

                              <div 
                                className={`absolute right-0 w-52 origin-top-right transition-all duration-150 z-50 ${
                                  esUltimaFila ? 'bottom-full mb-1 origin-bottom-right' : 'top-full -mt-1 origin-top-right'
                                } ${
                                  openDropdownId === `sol-${s.id}` ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                                }`}
                              >
                                <div className="bg-gray-800/95 border border-gray-600/80 rounded-xl shadow-2xl p-1.5 space-y-1.5 backdrop-blur-md">
                                  
                                  {s.estado === 'Pendiente' && (
                                    <>
                                      <button
                                        onClick={() => { handleAbrirResultados(s); setOpenDropdownId(null); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-emerald-300 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                      >
                                        <FileText size={14} className="text-emerald-400 group-hover/btn:text-white transition-colors" />
                                        <span>Ingresar resultados</span>
                                      </button>
                                      <button
                                        onClick={() => { handleCancelarSolicitud(s); setOpenDropdownId(null); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-rose-300 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                      >
                                        <XCircle size={14} className="text-rose-400 group-hover/btn:text-white transition-colors" />
                                        <span>Cancelar solicitud</span>
                                      </button>
                                    </>
                                  )}

                                  {s.estado === 'Completado' && (
                                    <>
                                      <button
                                        onClick={() => { setVisorModal({ isOpen: true, solicitud: s }); setOpenDropdownId(null); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-cyan-300 bg-cyan-500/10 hover:bg-cyan-600 hover:text-white border border-cyan-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                      >
                                        <Eye size={14} className="text-cyan-400 group-hover/btn:text-white transition-colors" />
                                        <span>Ver resultado</span>
                                      </button>
                                      <button
                                        onClick={() => { handleDescargarPDF(s); setOpenDropdownId(null); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-emerald-300 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                      >
                                        <Download size={14} className="text-emerald-400 group-hover/btn:text-white transition-colors" />
                                        <span>Descargar PDF</span>
                                      </button>

                                      {tieneWhatsappActivado && whatsappDisponible && (
                                        <button
                                          onClick={() => { handleEnviarWhatsApp(s); setOpenDropdownId(null); }}
                                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-green-300 bg-green-500/10 hover:bg-green-600 hover:text-white border border-green-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                        >
                                          <Send size={14} className="text-green-400 group-hover/btn:text-white transition-colors" />
                                          <span>Enviar por WhatsApp</span>
                                        </button>
                                      )}

                                      {s.token_publico && (
                                        <button
                                          onClick={() => { handleCopiarLink(s); setOpenDropdownId(null); }}
                                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-purple-300 bg-purple-500/10 hover:bg-purple-600 hover:text-white border border-purple-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                        >
                                          {copiedId === s.id ? (
                                            <Check size={14} className="text-purple-400 group-hover/btn:text-white transition-colors" />
                                          ) : (
                                            <LinkIcon size={14} className="text-purple-400 group-hover/btn:text-white transition-colors" />
                                          )}
                                          <span>{copiedId === s.id ? '¡Link copiado!' : 'Copiar link público'}</span>
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
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
        </>
      )}

      {/* ==================== MODAL CATÁLOGO ==================== */}
      {showFormCatalogo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FlaskConical size={20} className="text-purple-400" />
                {editing ? 'Editar Examen' : 'Nuevo Examen'}
              </h2>
              <button onClick={() => { setShowFormCatalogo(false); setEditing(null); }} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
            </div>
            <ExamenForm
              initialData={editing || {}}
              onSubmit={handleSubmitCatalogo}
              onCancel={() => { setShowFormCatalogo(false); setEditing(null); }}
              loading={saving}
              isEditing={!!editing}
            />
          </div>
        </div>
      )}

      {/* ==================== MODAL SOLICITUD ==================== */}
      {showFormSolicitud && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardList size={20} className="text-cyan-400" /> Solicitar Examen</h2>
              <button onClick={() => setShowFormSolicitud(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitSolicitud} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2"><User size={14} className="text-purple-400" /> Paciente *</label>
                <select
                  value={formSolicitud.paciente_id}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, paciente_id: e.target.value, consulta_id: '' })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos || ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2"><Calendar size={14} className="text-purple-400" /> Consulta a asociar *</label>
                <Select
                  options={consultas
                    .filter((c) => !formSolicitud.paciente_id || c.paciente_id === parseInt(formSolicitud.paciente_id))
                    .map((c) => ({
                      value: c.id,
                      label: `${c.codigo_sku || 'S/N'} · ${new Date(c.fecha_consulta).toLocaleDateString('es-SV')} · ${c.diagnostico_texto || 'Sin diagnóstico'}`,
                    }))}
                  value={
                    formSolicitud.consulta_id
                      ? {
                          value: formSolicitud.consulta_id,
                          label: (() => {
                            const c = consultas.find((x) => x.id === parseInt(formSolicitud.consulta_id));
                            if (!c) return '';
                            return `${c.codigo_sku || 'S/N'} · ${new Date(c.fecha_consulta).toLocaleDateString('es-SV')} · ${c.diagnostico_texto || 'Sin diagnóstico'}`;
                          })(),
                        }
                      : null
                  }
                  onChange={(opt) => setFormSolicitud({ ...formSolicitud, consulta_id: opt ? opt.value : '' })}
                  placeholder={!formSolicitud.paciente_id ? 'Selecciona primero un paciente...' : 'Buscar por SKU, fecha o diagnóstico...'}
                  isClearable isSearchable isDisabled={!formSolicitud.paciente_id}
                  noOptionsMessage={() => formSolicitud.paciente_id ? 'Este paciente no tiene consultas registradas' : 'Selecciona primero un paciente'}
                  styles={{ control: (base, state) => ({ ...base, backgroundColor: '#374151', borderColor: state.isFocused ? '#a855f7' : '#4b5563', boxShadow: state.isFocused ? '0 0 0 1px #a855f7' : 'none', color: 'white' }), singleValue: (base) => ({ ...base, color: 'white' }), input: (base) => ({ ...base, color: 'white' }), menu: (base) => ({ ...base, backgroundColor: '#1f2937', border: '1px solid #4b5563', zIndex: 50 }), option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? '#7e22ce' : state.isFocused ? '#581c87' : '#1f2937', color: 'white', cursor: 'pointer' }), placeholder: (base) => ({ ...base, color: '#9ca3af' }) }}
                />
                <p className="text-xs text-amber-400 mt-1">🔗 Obligatorio asociar a una consulta para facturación.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2"><FlaskConical size={14} className="text-purple-400" /> Examen *</label>
                <select
                  value={formSolicitud.examen_id}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, examen_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="">Seleccionar examen</option>
                  {examenes.filter((e) => e.activo).map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre} — ${parseFloat(e.precio || 0).toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2"><Activity size={14} className="text-purple-400" /> Tipo de ejecución *</label>
                <div className="flex gap-3">
                  <label className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-lg border flex-1 transition ${formSolicitud.tipo_ejecucion === 'Interno' ? 'bg-blue-900/30 border-blue-600/50 text-blue-200' : 'bg-gray-700/40 border-gray-600 text-gray-300'}`}>
                    <input type="radio" name="tipo_ejecucion" value="Interno" checked={formSolicitud.tipo_ejecucion === 'Interno'} onChange={(e) => setFormSolicitud({ ...formSolicitud, tipo_ejecucion: e.target.value })} className="w-4 h-4 text-purple-600" />
                    <Home size={14} /> Interno
                  </label>
                  <label className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-lg border flex-1 transition ${formSolicitud.tipo_ejecucion === 'Externo' ? 'bg-orange-900/30 border-orange-600/50 text-orange-200' : 'bg-gray-700/40 border-gray-600 text-gray-300'}`}>
                    <input type="radio" name="tipo_ejecucion" value="Externo" checked={formSolicitud.tipo_ejecucion === 'Externo'} onChange={(e) => setFormSolicitud({ ...formSolicitud, tipo_ejecucion: e.target.value })} className="w-4 h-4 text-purple-600" />
                    <Building2 size={14} /> Externo
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setShowFormSolicitud(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition shadow-md shadow-cyan-900/30">Solicitar Examen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL RESULTADOS ==================== */}
      {resultadosModal.isOpen && (
        <ResultadosModal
          solicitud={resultadosModal.solicitud}
          examenPlantilla={resultadosModal.plantilla}
          onSave={handleGuardarResultados}
          onClose={() => setResultadosModal({ isOpen: false, solicitud: null, plantilla: '' })}
        />
      )}

      {/* ==================== VISOR DE RESULTADOS ==================== */}
      {visorModal.isOpen && (
        <VisorResultadoModal
          solicitud={visorModal.solicitud}
          onClose={() => setVisorModal({ isOpen: false, solicitud: null })}
        />
      )}

      {/* ==================== CONFIRM MODAL ==================== */}
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

export default Examenes;