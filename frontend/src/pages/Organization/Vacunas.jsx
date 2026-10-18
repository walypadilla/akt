import React, { useState, useEffect } from 'react';
import {
  Syringe, Plus, Edit2, Trash2, X, Search, Filter, Download,
  Calendar, CheckCircle, Clock, AlertCircle, User, Package,
  TrendingUp, RotateCcw, Eye, FileText, Link as LinkIcon, Home, Building2,
  History, ShieldAlert
} from 'lucide-react';
import {
  getVacunas, createVacuna, updateVacuna, deleteVacuna, reactivarVacuna,
  getPacientes, getConsultas, getDashboardVacunas, getAniosVacunas,
  exportarVacunas, aplicarVacuna, getHistorialGlobalVacunas, exportarTopVacunas
} from '../../api/clinica';
import VacunaForm from '../../components/forms/clinica/VacunaForm';
import CartillaModal from '../../components/common/clinica/CartillaModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { getTodayLocal } from '../../utils/dateUtils';
import Select from 'react-select';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const Vacunas = () => {
  const hoy = new Date();
  const [activeTab, setActiveTab] = useState('catalogo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Catálogo
  const [vacunas, setVacunas] = useState([]);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [showFormCatalogo, setShowFormCatalogo] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Datos auxiliares
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);

  // Aplicación
  const [showFormAplicar, setShowFormAplicar] = useState(false);
  const [formAplicar, setFormAplicar] = useState({
    paciente_id: '', vacuna_id: '', consulta_id: '',
    fecha_aplicacion: new Date().toISOString().split('T')[0],
    fecha_proxima: '', lote: '', observaciones: '',
  });

  // Dashboard y Período
  const [dashboard, setDashboard] = useState({ aplicadasMes: 0, proximas: 0, vencidas: 0, topVacunas: [] });
  const [anioDashboard, setAnioDashboard] = useState(hoy.getFullYear());
  const [mesDashboard, setMesDashboard] = useState(hoy.getMonth() + 1);
  const [aniosDisponibles, setAniosDisponibles] = useState([hoy.getFullYear()]);
  const [cargandoDashboard, setCargandoDashboard] = useState(false);

  // Historial Global y Buscador
  const [historialGlobal, setHistorialGlobal] = useState([]);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [filtroHistorial, setFiltroHistorial] = useState('todas'); // todas, aplicadas, proximas, vencidas
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Modales
  const [cartillaModal, setCartillaModal] = useState({ isOpen: false, paciente: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // ============ CARGA DE DATOS ============
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vacunasData, pacientesData, consultasData] = await Promise.all([
        getVacunas({ activo: 'todos' }),
        getPacientes({ limit: 99999 }),
        getConsultas({ limit: 99999 }),
      ]);

      setVacunas(Array.isArray(vacunasData) ? vacunasData : vacunasData.vacunas || []);
      setPacientes(pacientesData.pacientes || pacientesData || []);
      setConsultas(consultasData.consultas || consultasData || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos');
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarDashboard = async () => {
    setCargandoDashboard(true);
    try {
      const [data, anios] = await Promise.all([
        getDashboardVacunas({ anio: anioDashboard, mes: mesDashboard }),
        getAniosVacunas()
      ]);
      setDashboard(data || {});
      if (Array.isArray(anios) && anios.length > 0) {
        setAniosDisponibles(anios);
      }
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setCargandoDashboard(false);
    }
  };

  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const data = await getHistorialGlobalVacunas({
        anio: anioDashboard,
        mes: mesDashboard,
        filtro: filtroHistorial,
      });
      setHistorialGlobal(data || []);
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  
  useEffect(() => {
    cargarDashboard();
    if (activeTab === 'historial') {
      cargarHistorial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anioDashboard, mesDashboard, activeTab]);

  useEffect(() => {
    if (activeTab === 'historial') {
      cargarHistorial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroHistorial]);

  // ============ CATÁLOGO CRUD ============
  const handleSubmitCatalogo = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateVacuna(editing.id, data);
        toast.success('Vacuna actualizada');
      } else {
        await createVacuna(data);
        toast.success('Vacuna creada');
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

  const handleDeleteCatalogo = (vacuna) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desactivar Vacuna',
      message: `¿Desactivar "${vacuna.nombre}"? No se elimina, puedes reactivarla.`,
      onConfirm: async () => {
        try {
          await deleteVacuna(vacuna.id);
          toast.success('Vacuna desactivada');
          loadData();
        } catch { toast.error('Error al desactivar'); }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleReactivar = (vacuna) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reactivar Vacuna',
      message: `¿Reactivar "${vacuna.nombre}"?`,
      onConfirm: async () => {
        try {
          await reactivarVacuna(vacuna.id);
          toast.success('Vacuna reactivada');
          loadData();
        } catch { toast.error('Error al reactivar'); }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  // ============ APLICAR VACUNA ============
  const handleAplicarSubmit = async (e) => {
    e.preventDefault();
    if (!formAplicar.paciente_id || !formAplicar.vacuna_id || !formAplicar.consulta_id) {
      toast.warning('Complete paciente, vacuna y consulta');
      return;
    }
    try {
      await aplicarVacuna(formAplicar);
      toast.success('Vacuna aplicada');
      setShowFormAplicar(false);
      setFormAplicar({
        paciente_id: '', vacuna_id: '', consulta_id: '',
        fecha_aplicacion: new Date().toISOString().split('T')[0],
        fecha_proxima: '', lote: '', observaciones: '',
      });
      loadData();
      cargarDashboard();
      if (activeTab === 'historial') cargarHistorial();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aplicar vacuna');
    }
  };

  // ============ EXPORTAR ============
  const handleExportar = async (todos = false) => {
    try {
      const params = {};
      if (!todos) {
        if (anioDashboard) params.anio = anioDashboard;
        if (mesDashboard) params.mes = mesDashboard;
      }
      const blob = await exportarVacunas(params);
      descargarCSV(blob, `vacunas_${todos ? 'todas' : 'mes'}_${getTodayLocal()}.csv`);
      toast.success(`Reporte ${todos ? 'completo' : 'del mes'} exportado`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al exportar');
    }
  };

  const exportarDetalleTop = async (vacunaId, vacunaNombre) => {
    try {
      const params = { anio: anioDashboard, mes: mesDashboard, vacuna_id: vacunaId };
      const blob = await exportarVacunas(params);
      descargarCSV(blob, `detalle_${vacunaNombre.replace(/\s+/g, '_')}.csv`);
      toast.success('Detalle exportado');
    } catch {
      toast.error('Error al exportar detalle');
    }
  };

  const volverMesActual = () => {
    setAnioDashboard(hoy.getFullYear());
    setMesDashboard(hoy.getMonth() + 1);
  };

  const handleExportarMes = async () => {
    try {
      const params = { anio: anioDashboard, mes: mesDashboard };
      const blob = await exportarVacunas(params);
      descargarCSV(blob, `vacunas_mes_${mesDashboard}_${anioDashboard}.csv`);
      toast.success('Reporte del mes exportado');
    } catch (err) {
      toast.error('No hay datos para el mes seleccionado o error al exportar');
    }
  };

  const handleExportarAnio = async () => {
    try {
      const params = { anio: anioDashboard };
      const blob = await exportarVacunas(params);
      descargarCSV(blob, `vacunas_anio_${anioDashboard}.csv`);
      toast.success('Reporte del año exportado');
    } catch (err) {
      toast.error('No hay datos para el año seleccionado o error al exportar');
    }
  };

  const handleExportarTop5 = async () => {
    try {
      const params = { anio: anioDashboard, mes: mesDashboard };
      const blob = await exportarTopVacunas(params);
      descargarCSV(blob, `top5_vacunas_${mesDashboard}_${anioDashboard}.csv`);
      toast.success('Reporte Top 5 exportado');
    } catch (err) {
      toast.error('No hay datos para exportar Top 5');
    }
  };

  const descargarCSV = (blob, nombreArchivo) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filtros locales
  const vacunasFiltradas = vacunas.filter(v => 
    v.nombre.toLowerCase().includes(busquedaCatalogo.toLowerCase())
  );

  const historialFiltrado = historialGlobal.filter(h => {
    const term = busquedaHistorial.toLowerCase();
    const paciente = `${h.paciente_nombre || ''} ${h.paciente_apellidos || ''}`.toLowerCase();
    const cliente = (h.cliente_nombre || '').toLowerCase();
    const vacuna = (h.vacuna_nombre || '').toLowerCase();
    return paciente.includes(term) || cliente.includes(term) || vacuna.includes(term);
  });

  const consultasDisponibles = consultas.filter(c => 
    !formAplicar.paciente_id || c.paciente_id === parseInt(formAplicar.paciente_id)
  ).filter(c => !c.factura_id || c.factura_estado === 'Anulada');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Syringe className="w-6 h-6 text-purple-400" /> Vacunas y Cartillas
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Catálogo, aplicación, cartilla digital y recordatorios.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-lg border border-gray-700">
            <button
              onClick={() => setActiveTab('catalogo')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                activeTab === 'catalogo' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              Catálogo ({vacunas.length})
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                activeTab === 'historial' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30' : 'text-gray-400 hover:text-white'
              }`}
            >
              Historial Global
            </button>
          </div>

          {activeTab === 'catalogo' && (
            <button
              onClick={() => { setEditing(null); setShowFormCatalogo(true); }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
            >
              <Plus size={14} /> Nueva Vacuna
            </button>
          )}
        </div>
      </div>

      {/* FILTRO DE PERÍODO */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <Calendar size={14} className="text-purple-400" /> Período
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
        <button
          onClick={volverMesActual}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 font-semibold transition"
        >
          Mes Actual
        </button>
        
        {activeTab === 'catalogo' && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleExportar(true)}
              disabled={vacunasFiltradas.length === 0}
              className="bg-gray-600/20 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-white border border-gray-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={14} /> Exportar Todos
            </button>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleExportarMes}
              disabled={dashboard.aplicadasMes === 0}
              className="bg-cyan-600/20 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={14} /> Exportar Mes
            </button>
            <button
              onClick={handleExportarAnio}
              className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={14} /> Exportar Todo ({anioDashboard})
            </button>
          </div>
        )}
      </div>

      {/* KPIs Y TOP 5 */}
      {activeTab === 'historial' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setFiltroHistorial('aplicadas')}
              className={`cursor-pointer p-4 rounded-xl shadow-lg border flex items-center gap-3 transition ${filtroHistorial === 'aplicadas' ? 'bg-cyan-900/40 border-cyan-500' : 'bg-gray-800/90 border-gray-700 hover:bg-gray-800'}`}
            >
              <CheckCircle className={`w-8 h-8 ${filtroHistorial === 'aplicadas' ? 'text-white' : 'text-cyan-400'}`} />
              <div>
                <p className="text-sm text-gray-300">Aplicadas {MESES_CORTO[mesDashboard - 1]}</p>
                <p className="text-2xl font-bold text-white">{dashboard.aplicadasMes || 0}</p>
              </div>
            </div>
            <div 
              onClick={() => setFiltroHistorial('proximas')}
              className={`cursor-pointer p-4 rounded-xl shadow-lg border flex items-center gap-3 transition ${filtroHistorial === 'proximas' ? 'bg-yellow-900/40 border-yellow-500' : 'bg-gray-800/90 border-gray-700 hover:bg-gray-800'}`}
            >
              <Clock className={`w-8 h-8 ${filtroHistorial === 'proximas' ? 'text-white' : 'text-yellow-400'}`} />
              <div>
                <p className="text-sm text-gray-300">Próximas (30 días)</p>
                <p className="text-2xl font-bold text-white">{dashboard.proximas || 0}</p>
              </div>
            </div>
            <div 
              onClick={() => setFiltroHistorial('vencidas')}
              className={`cursor-pointer p-4 rounded-xl shadow-lg border flex items-center gap-3 transition ${filtroHistorial === 'vencidas' ? 'bg-rose-900/40 border-rose-500' : 'bg-gray-800/90 border-gray-700 hover:bg-gray-800'}`}
            >
              <AlertCircle className={`w-8 h-8 ${filtroHistorial === 'vencidas' ? 'text-white' : 'text-rose-400'}`} />
              <div>
                <p className="text-sm text-gray-300">Vencidas</p>
                <p className="text-2xl font-bold text-white">{dashboard.vencidas || 0}</p>
              </div>
            </div>
          </div>

          {/* TARJETA MEJORADA Y REORDENADA DEL TOP 5 */}
          {dashboard.topVacunas?.length > 0 && (
            <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-400" /> Top 5 Vacunas ({MESES[mesDashboard - 1]} {anioDashboard})
                </h3>
                <button
                  onClick={handleExportarTop5}
                  className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download size={13} /> Exportar Reporte Top 5
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {dashboard.topVacunas.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => exportarDetalleTop(t.id, t.nombre)}
                    className="bg-gray-700/40 hover:bg-gray-700/70 p-3 rounded-lg border border-gray-600 flex items-center justify-between cursor-pointer transition group"
                    title="Haz clic para descargar detalle"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white font-semibold truncate group-hover:text-purple-300 transition">{t.nombre}</p>
                      <p className="text-xs text-gray-400">{t.total} {t.total === 1 ? 'aplicación' : 'aplicaciones'}</p>
                    </div>
                    <Download size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition ml-1" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== TAB CATÁLOGO ==================== */}
      {activeTab === 'catalogo' && (
        <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex flex-col sm:flex-row justify-between items-center gap-2">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Catálogo de Vacunas</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar vacuna..."
                value={busquedaCatalogo}
                onChange={(e) => setBusquedaCatalogo(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700/80 text-xs">
              <thead className="bg-gray-900/90">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Nombre</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Producto (Stock)</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Recordatorio</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Precio</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
                {vacunasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-gray-400">
                      <Syringe className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                      <p className="text-xs font-medium">No hay vacunas que coincidan.</p>
                    </td>
                  </tr>
                ) : (
                  vacunasFiltradas.map((v) => (
                    <tr key={v.id} className={`hover:bg-gray-700/30 transition-colors ${!v.activo ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2 text-white font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Syringe size={12} className="text-purple-400" /> {v.nombre}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                        {v.producto_nombre ? (
                          <span className="inline-flex items-center gap-1">
                            <Package size={10} className="text-purple-400" /> {v.producto_nombre}
                            <span className={`ml-1 text-xs ${v.producto_stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>({v.producto_stock})</span>
                          </span>
                        ) : (
                          <span className="text-rose-400 italic">Sin producto</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{v.dias_recordatorio} días</td>
                      <td className="px-3 py-2 text-emerald-400 font-bold whitespace-nowrap">${parseFloat(v.producto_precio || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${v.activo ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' : 'bg-rose-900/40 text-rose-300 border-rose-700/50'}`}>
                          {v.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {v.activo ? (
                            <>
                              <button onClick={() => { setEditing(v); setShowFormCatalogo(true); }} className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded transition" title="Editar"><Edit2 size={12} /></button>
                              <button onClick={() => handleDeleteCatalogo(v)} className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded transition" title="Desactivar"><Trash2 size={12} /></button>
                            </>
                          ) : (
                            <button onClick={() => handleReactivar(v)} className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded transition" title="Reactivar"><RotateCcw size={12} /></button>
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
      )}

      {/* ==================== TAB HISTORIAL ==================== */}
      {activeTab === 'historial' && (
        <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <History size={14} className="text-cyan-400" />
              {filtroHistorial === 'todas' ? 'Todas las Vacunas' : `Vacunas ${filtroHistorial}`} ({MESES[mesDashboard - 1]} {anioDashboard})
            </h3>
            
            {/* BUSCADOR GENERAL REQUERIDO */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Buscar paciente, dueño o vacuna..."
                  value={busquedaHistorial}
                  onChange={(e) => setBusquedaHistorial(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {busquedaHistorial && (
                  <button onClick={() => setBusquedaHistorial('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <X size={12} />
                  </button>
                )}
              </div>
              <button onClick={() => setFiltroHistorial('todas')} className="text-xs text-purple-400 hover:text-purple-300 underline whitespace-nowrap">
                Ver Todas
              </button>
            </div>
          </div>

          {cargandoHistorial ? (
            <div className="text-center py-10"><LoadingSpinner /></div>
          ) : historialFiltrado.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>No hay registros para la búsqueda o filtro seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                <thead className="bg-gray-900/90">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Paciente</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Dueño</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Vacuna</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Aplicada</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Próxima</th>
                    <th className="px-3 py-2 text-center font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                    <th className="px-3 py-2 text-center font-bold text-gray-300 uppercase tracking-wider">Cartilla</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
                  {historialFiltrado.map((h) => {
                    let estadoBadge = '';
                    let estadoText = '';
                    if (h.fecha_proxima && h.dias_restantes < 0) {
                      estadoBadge = 'bg-rose-900/40 text-rose-300 border-rose-700/50';
                      estadoText = `Vencida (${Math.abs(h.dias_restantes)}d)`;
                    } else if (h.fecha_proxima && h.dias_restantes <= 30) {
                      estadoBadge = 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50';
                      estadoText = `Próxima (${h.dias_restantes}d)`;
                    } else {
                      estadoBadge = 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
                      estadoText = 'Al día';
                    }

                    return (
                      <tr key={h.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-2 text-white font-semibold whitespace-nowrap">
                          {h.paciente_nombre} {h.paciente_apellidos || ''} {h.especie ? `(${h.especie})` : ''}
                        </td>
                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{h.cliente_nombre}</td>
                        <td className="px-3 py-2 text-purple-300 whitespace-nowrap">{h.vacuna_nombre}</td>
                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{new Date(h.fecha_aplicacion).toLocaleDateString('es-SV')}</td>
                        <td className="px-3 py-2 text-amber-400 whitespace-nowrap">{h.fecha_proxima ? new Date(h.fecha_proxima).toLocaleDateString('es-SV') : '-'}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${estadoBadge}`}>{estadoText}</span>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              const pac = pacientes.find((x) => x.id === h.paciente_id);
                              if (pac) setCartillaModal({ isOpen: true, paciente: pac });
                            }}
                            className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded transition mx-auto"
                            title="Ver cartilla"
                          >
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Botón flotante para Aplicar Vacuna */}
      <button
        onClick={() => setShowFormAplicar(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm transition-all hover:scale-105 z-40"
      >
        <Syringe size={18} /> Aplicar Vacuna
      </button>

      {/* MODAL CATÁLOGO */}
      {showFormCatalogo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Syringe size={20} className="text-purple-400" />
                {editing ? 'Editar Vacuna' : 'Nueva Vacuna'}
              </h2>
              <button onClick={() => { setShowFormCatalogo(false); setEditing(null); }} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <VacunaForm initialData={editing || {}} onSubmit={handleSubmitCatalogo} onCancel={() => { setShowFormCatalogo(false); setEditing(null); }} loading={saving} isEditing={!!editing} />
          </div>
        </div>
      )}

      {/* MODAL APLICAR VACUNA */}
      {showFormAplicar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Syringe size={20} className="text-purple-400" /> Aplicar Vacuna
              </h2>
              <button onClick={() => setShowFormAplicar(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleAplicarSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <User size={14} className="text-purple-400" /> Paciente *
                </label>
                <select
                  value={formAplicar.paciente_id}
                  onChange={(e) => setFormAplicar({ ...formAplicar, paciente_id: e.target.value, consulta_id: '' })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos || ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Calendar size={14} className="text-purple-400" /> Consulta (No facturada) *
                </label>
                <Select
                  options={consultasDisponibles.map((c) => ({
                    value: c.id,
                    label: `${c.codigo_sku || 'S/N'} · ${new Date(c.fecha_consulta).toLocaleDateString('es-SV')} · ${c.diagnostico_texto || 'Sin diagnóstico'}`,
                  }))}
                  value={
                    formAplicar.consulta_id
                      ? {
                          value: formAplicar.consulta_id,
                          label: (() => {
                            const c = consultas.find((x) => x.id === parseInt(formAplicar.consulta_id));
                            if (!c) return '';
                            return `${c.codigo_sku || 'S/N'} · ${new Date(c.fecha_consulta).toLocaleDateString('es-SV')} · ${c.diagnostico_texto || 'Sin diagnóstico'}`;
                          })(),
                        }
                      : null
                  }
                  onChange={(opt) => setFormAplicar({ ...formAplicar, consulta_id: opt ? opt.value : '' })}
                  placeholder={!formAplicar.paciente_id ? 'Selecciona paciente primero...' : 'Buscar consulta...'}
                  isClearable
                  isSearchable
                  isDisabled={!formAplicar.paciente_id}
                  noOptionsMessage={() => 'No hay consultas pendientes de facturar'}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: '#374151',
                      borderColor: state.isFocused ? '#a855f7' : '#4b5563',
                      boxShadow: state.isFocused ? '0 0 0 1px #a855f7' : 'none',
                      color: 'white',
                      '&:hover': {
                        borderColor: '#a855f7'
                      }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'white',
                    }),
                    input: (base) => ({
                      ...base,
                      color: 'white',
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: '#1f2937',
                      border: '1px solid #4b5563',
                      zIndex: 50
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected 
                        ? '#7e22ce' 
                        : state.isFocused 
                          ? '#581c87' 
                          : '#1f2937',
                      color: 'white',
                      cursor: 'pointer',
                      '&:active': {
                        backgroundColor: '#6b21a8'
                      }
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: '#9ca3af',
                    })
                  }}
                />
                <p className="text-xs text-amber-400 mt-1">
                  🔗 Solo se muestran consultas que no tienen factura emitida.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Syringe size={14} className="text-purple-400" /> Vacuna *
                </label>
                <select
                  value={formAplicar.vacuna_id}
                  onChange={(e) => setFormAplicar({ ...formAplicar, vacuna_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="">Seleccionar vacuna</option>
                  {vacunas.filter((v) => v.activo && v.producto_id && v.producto_stock > 0).map((v) => (
                    <option key={v.id} value={v.id}>{v.nombre} — Stock: {v.producto_stock}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fecha aplicación *</label>
                  <input type="date" value={formAplicar.fecha_aplicacion} onChange={(e) => setFormAplicar({ ...formAplicar, fecha_aplicacion: e.target.value })} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Próxima dosis</label>
                  <input type="date" value={formAplicar.fecha_proxima} onChange={(e) => setFormAplicar({ ...formAplicar, fecha_proxima: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lote</label>
                <input type="text" value={formAplicar.lote} onChange={(e) => setFormAplicar({ ...formAplicar, lote: e.target.value })} placeholder="Ej: LOTE-2024-A123" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Observaciones</label>
                <textarea value={formAplicar.observaciones} onChange={(e) => setFormAplicar({ ...formAplicar, observaciones: e.target.value })} rows={2} placeholder="Ej: Leve dolor en zona de inyección" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setShowFormAplicar(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition shadow-md shadow-purple-900/30">Aplicar Vacuna</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cartillaModal.isOpen && (
        <CartillaModal paciente={cartillaModal.paciente} onClose={() => setCartillaModal({ isOpen: false, paciente: null })} />
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })} />
    </div>
  );
};

export default Vacunas;