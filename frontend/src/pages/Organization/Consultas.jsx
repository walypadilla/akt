// frontend/src/pages/organization/Consultas.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clipboard, Search, Plus, Edit2, Eye, X, Download, Filter,
  Printer, FileText, CheckCircle, Clock, DollarSign, Calendar, Hash, User, Activity, AlertCircle,
  TrendingUp, TrendingDown, Users
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getConsultas,
  createConsulta,
  updateConsulta,
  getConsulta,
  facturarConsulta,
  exportarConsultas,
  exportarConsultasFiltrados,
  getPacientes,
  getMedicos,
  getAniosConsultas,
  getExamenesInternosConsulta,
  getVacunasAplicadasConsulta,
} from '../../api/clinica';
import { getProductos } from '../../api/productos';
import ConsultaForm from '../../components/forms/clinica/ConsultaForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import ErrorMessage from '../../components/common/ErrorMessage';
import { toast } from 'react-toastify';
import { getTodayLocal } from '../../utils/dateUtils';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const Consultas = () => {
  const { user } = useAuth();
  const tipoOrg = user?.organizacion?.tipo_organizacion || 'Empresa Comercial';
  const hoy = new Date();

  const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };
  const tipoNormalizado = normalizarTexto(tipoOrg);
  const isClinica = ['clinica general', 'clinica dental', 'clinica veterinaria'].includes(tipoNormalizado);

  // Estados principales
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const [showFilters, setShowFilters] = useState(false);

  // Estados de KPIs
  const [kpis, setKpis] = useState({
    totalConsultas: 0,
    variacionConsultas: 0,
    totalFacturado: 0,
    pacientesAtendidos: 0,
  });

  // Filtros con año/mes (por defecto mes actual)
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [aniosDisponibles, setAniosDisponibles] = useState([hoy.getFullYear()]);
  const [busqueda, setBusqueda] = useState('');

  const [filtros, setFiltros] = useState({
    paciente_id: '',
    medico_id: '',
  });

  // Modales
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [showFacturar, setShowFacturar] = useState(false);
  const [facturaData, setFacturaData] = useState({
    servicios: [{ producto_id: '', cantidad: 1, precio_unitario: 0, tipo_venta: 'Gravado' }],
    tipo_documento: 'FAF',
    estado: 'Emitida',
    condicion_operacion: 'Contado',
  });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // ============ CARGA DE DATOS ============
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        anio,
        mes,
        limit: 9999, // Asegurar traer todas las consultas del mes para el KPI
      };
      if (busqueda) params.search = busqueda;
      if (filtros.paciente_id) params.paciente_id = filtros.paciente_id;
      if (filtros.medico_id) params.medico_id = filtros.medico_id;

      // Calcular mes anterior para la variación
      let prevMes = mes - 1;
      let prevAnio = anio;
      if (prevMes === 0) {
        prevMes = 12;
        prevAnio = anio - 1;
      }
      const prevParams = { anio: prevAnio, mes: prevMes, limit: 9999 };

      // Ejecutar peticiones en paralelo
      const [consultasData, pacientesData, medicosData, productosData, prevConsultasData] = await Promise.all([
        getConsultas(params),
        getPacientes({ limit: 99999 }),
        getMedicos(),
        getProductos({ limit: 99999 }),
        getConsultas(prevParams).catch(() => []), // Si falla, no rompe el flujo
      ]);

      const consultasArr = Array.isArray(consultasData) ? consultasData : consultasData.consultas || [];
      const prevConsultasArr = Array.isArray(prevConsultasData) ? prevConsultasData : prevConsultasData.consultas || [];

      setConsultas(consultasArr);
      setPacientes(pacientesData.pacientes || pacientesData || []);
      setMedicos(medicosData || []);
      setProductos(productosData.productos || productosData || []);

      // --- CÁLCULO DE KPIs ---
      const totalActual = consultasArr.length;
      const totalPrev = prevConsultasArr.length;

      // Variación consultas
      let variacion = 0;
      if (totalPrev > 0) {
        variacion = ((totalActual - totalPrev) / totalPrev) * 100;
      } else if (totalActual > 0) {
        variacion = 100; // Crecimiento desde 0
      }

      // Total Facturado (Solo consultas no anuladas)
      const facturado = consultasArr.reduce((acc, c) => {
        const total = (c.factura_estado !== 'Anulada' && c.factura_total) ? parseFloat(c.factura_total) : 0;
        return acc + total;
      }, 0);

      // Pacientes únicos atendidos
      const pacientesUnicos = new Set(consultasArr.map(c => c.paciente_id)).size;

      setKpis({
        totalConsultas: totalActual,
        variacionConsultas: variacion,
        totalFacturado: facturado,
        pacientesAtendidos: pacientesUnicos,
      });

    } catch (err) {
      console.error('Error loading consultas:', err);
      setError(err.message || 'Error al cargar consultas');
      toast.error('Error al cargar consultas');
    } finally {
      setLoading(false);
    }
  }, [anio, mes, busqueda, filtros.paciente_id, filtros.medico_id, setLoading, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cargar años disponibles una vez
  useEffect(() => {
    const cargarAnios = async () => {
      try {
        const data = await getAniosConsultas();
        if (Array.isArray(data) && data.length > 0) {
          setAniosDisponibles(data);
        }
      } catch (err) {
        console.error('Error al cargar años:', err);
      }
    };
    cargarAnios();
  }, []);

  const volverMesActual = () => {
    setAnio(hoy.getFullYear());
    setMes(hoy.getMonth() + 1);
    setBusqueda('');
  };

  // ============ CRUD ============
  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateConsulta(editing.id, data);
        toast.success('Consulta actualizada');
      } else {
        await createConsulta(data);
        toast.success('Consulta creada');
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

  const handleEdit = (consulta) => {
    setEditing(consulta);
    setShowForm(true);
  };

  const handleVerDetalle = async (id) => {
    try {
      const data = await getConsulta(id);
      setSelectedConsulta(data);
      setShowDetail(true);
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  const handleFacturar = async (consultaId) => {
    try {
      const [consulta, examenesInternos, vacunasAplicadas] = await Promise.all([
        getConsulta(consultaId),
        getExamenesInternosConsulta(consultaId).catch(() => []),
        getVacunasAplicadasConsulta(consultaId).catch(() => []),
      ]);

      setSelectedConsulta(consulta);

      const serviciosExamenes = (examenesInternos || []).map((ex) => ({
        producto_id: ex.producto_id,
        cantidad: 1,
        precio_unitario: parseFloat(ex.precio || 0),
        tipo_venta: 'Gravado',
        _esExamen: true,
        _examenNombre: ex.examen_nombre,
      }));

      const serviciosVacunas = (vacunasAplicadas || []).map((v) => ({
        producto_id: v.producto_id,
        cantidad: 1,
        precio_unitario: parseFloat(v.precio_unitario || 0),
        tipo_venta: 'Gravado',
        _esVacuna: true,
        _vacunaNombre: v.vacuna_nombre,
        _lote: v.lote,
      }));

      const serviciosSugeridos = [...serviciosExamenes, ...serviciosVacunas];

      setFacturaData({
        servicios: serviciosSugeridos.length > 0
          ? serviciosSugeridos
          : [{ producto_id: '', cantidad: 1, precio_unitario: 0, tipo_venta: 'Gravado' }],
        tipo_documento: 'FAF',
        estado: 'Emitida',
        condicion_operacion: 'Contado',
      });
      setShowFacturar(true);
    } catch (error) {
      console.error('Error al preparar facturación:', error);
      toast.error('Error al preparar facturación');
    }
  };

  const handleFacturarSubmit = async (e) => {
    e.preventDefault();
    try {
      const serviciosValidos = facturaData.servicios.filter((s) => s.producto_id);
      if (serviciosValidos.length === 0) {
        toast.warning('Agregue al menos un servicio');
        return;
      }

      const totalCalculado = serviciosValidos.reduce((acc, s) => {
        const sub = parseFloat(s.cantidad || 0) * parseFloat(s.precio_unitario || 0);
        return acc + sub + (s.tipo_venta === 'Gravado' ? sub * 0.13 : 0);
      }, 0);

      const result = await facturarConsulta(selectedConsulta.id, {
        servicios: serviciosValidos,
        tipo_documento: facturaData.tipo_documento,
        estado: facturaData.estado,
        condicion_operacion: facturaData.condicion_operacion,
      });

      toast.success(`Factura generada: ${result.numero_correlativo} - $${result.total.toFixed(2)}`);
      setShowFacturar(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al facturar');
    }
  };

  const addServicio = () => {
    setFacturaData({
      ...facturaData,
      servicios: [...facturaData.servicios, { producto_id: '', cantidad: 1, precio_unitario: 0, tipo_venta: 'Gravado' }],
    });
  };

  const removeServicio = (index) => {
    if (facturaData.servicios.length === 1) return;
    const nuevos = facturaData.servicios.filter((_, i) => i !== index);
    setFacturaData({ ...facturaData, servicios: nuevos });
  };

  const updateServicio = (index, field, value) => {
    const nuevos = [...facturaData.servicios];
    nuevos[index][field] = value;
    if (field === 'producto_id') {
      const prod = productos.find((p) => p.id == value);
      nuevos[index].precio_unitario = prod ? parseFloat(prod.precio_unitario) : 0;
    }
    setFacturaData({ ...facturaData, servicios: nuevos });
  };

  // ============ EXPORTAR ============
  const handleExportarTodos = async () => {
    try {
      const blob = await exportarConsultas();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consultas_todos_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Todas las consultas exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarFiltrados = async () => {
    try {
      const params = { anio, mes };
      if (busqueda) params.search = busqueda;
      if (filtros.paciente_id) params.paciente_id = filtros.paciente_id;
      if (filtros.medico_id) params.medico_id = filtros.medico_id;

      const blob = await exportarConsultasFiltrados(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consultas_filtrados_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Consultas filtradas exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleImprimirReceta = (consulta) => {
    if (!consulta.receta) {
      toast.warning('Esta consulta no tiene receta');
      return;
    }
    const ventana = window.open('', '_blank', 'width=600,height=800');
    if (!ventana) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }
    const fecha = new Date(consulta.fecha_consulta).toLocaleDateString('es-SV');
    const paciente = consulta.paciente_nombre || 'Paciente';
    const medico = consulta.medico_nombre || 'Médico';

    ventana.document.write(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>Receta Médica</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }
        .header { text-align: center; border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #8b5cf6; margin: 0; }
        .header .empresa { font-size: 14px; color: #666; }
        .info { margin-bottom: 20px; }
        .info p { margin: 5px 0; }
        .info .label { font-weight: bold; color: #555; }
        .receta { background: #f5f5f5; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6; white-space: pre-wrap; min-height: 100px; }
        .footer { text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; }
        .firma { margin-top: 30px; text-align: center; }
        .firma .linea { border-top: 1px solid #333; width: 200px; margin: 20px auto 5px; }
      </style>
      </head><body>
        <div class="header"><h1>📋 RECETA MÉDICA</h1>
          <div class="empresa">${user?.organizacion?.nombre_empresa || 'Clínica'}</div></div>
        <div class="info">
          <p><span class="label">SKU:</span> ${consulta.codigo_sku || '-'}</p>
          <p><span class="label">Paciente:</span> ${paciente}</p>
          <p><span class="label">Fecha:</span> ${fecha}</p>
          <p><span class="label">Médico:</span> ${medico}</p>
          ${consulta.diagnostico_texto ? `<p><span class="label">Diagnóstico:</span> ${consulta.diagnostico_texto}</p>` : ''}
        </div>
        <div class="receta">${consulta.receta.replace(/\n/g, '<br>')}</div>
        <div class="firma"><div class="linea"></div><p>Firma del Médico</p></div>
        <div class="footer">Documento generado el ${new Date().toLocaleDateString('es-SV')}</div>
        <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    ventana.document.close();
  };

  if (!isClinica) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Clipboard className="w-12 h-12 mx-auto text-gray-600 mb-2" />
        <p className="text-lg font-semibold">Esta función solo está disponible para clínicas.</p>
      </div>
    );
  }

  if (loading && consultas.length === 0) return <LoadingSpinner />;
  if (error && consultas.length === 0) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  const isPositivo = kpis.variacionConsultas >= 0;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Clipboard className="w-6 h-6 text-purple-400" /> Consultas
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Historial clínico y atención de pacientes.</p>
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
            <Plus size={14} /> Nueva Consulta
          </button>
        </div>
      </div>

      {/* FILTROS DE PERÍODO */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <Calendar size={14} className="text-purple-400" />
          Período
        </span>
        <select
          value={anio}
          onChange={(e) => setAnio(parseInt(e.target.value))}
          className="bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {aniosDisponibles.map((a) => (
            <option key={a} value={a}>Año: {a}</option>
          ))}
        </select>
        <select
          value={mes}
          onChange={(e) => setMes(parseInt(e.target.value))}
          className="bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {MESES.map((n, i) => (
            <option key={i + 1} value={i + 1}>{n}</option>
          ))}
        </select>
        <button
          onClick={volverMesActual}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 font-semibold transition"
        >
          Mes Actual
        </button>
        <span className="text-xs text-gray-500 ml-auto italic">
          Mostrando: {MESES[mes - 1]} {anio}
        </span>
      </div>

      {/* ============ KPI CARDS ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Consultas */}
        <div className="bg-gray-800/90 rounded-xl border border-gray-700/80 p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Consultas Mes</p>
            <p className="text-2xl font-bold text-white">{kpis.totalConsultas}</p>
          </div>
          <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
            <Clipboard size={22} />
          </div>
        </div>

        {/* KPI 2: Variación */}
        <div className="bg-gray-800/90 rounded-xl border border-gray-700/80 p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Variación vs Mes Ant.</p>
            <div className={`flex items-center gap-1 text-2xl font-bold ${isPositivo ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositivo ? '+' : ''}{kpis.variacionConsultas.toFixed(1)}%
              {isPositivo ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${isPositivo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
             {isPositivo ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
        </div>

        {/* KPI 3: Pacientes Atendidos */}
        <div className="bg-gray-800/90 rounded-xl border border-gray-700/80 p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pacientes Atendidos</p>
            <p className="text-2xl font-bold text-cyan-400">{kpis.pacientesAtendidos}</p>
          </div>
          <div className="p-3 bg-cyan-500/20 rounded-lg text-cyan-400">
            <Users size={22} />
          </div>
        </div>

        {/* KPI 4: Total Facturado */}
        <div className="bg-gray-800/90 rounded-xl border border-gray-700/80 p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Facturado</p>
            <p className="text-2xl font-bold text-emerald-400">${kpis.totalFacturado.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* FILTROS AVANZADOS */}
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
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Consultas'}
            </button>
            <button
              onClick={handleExportarFiltrados}
              disabled={consultas.length === 0}
              className="bg-cyan-600/20 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-300 hover:text-white border border-cyan-500/40 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={13} /> Exportar Vista
            </button>
          </div>
          <span className="text-xs text-gray-400 italic">
            {consultas.length} consultas
          </span>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 p-3 border-t border-gray-700/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por paciente o SKU..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="pl-8 pr-7 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filtros.paciente_id}
              onChange={(e) => setFiltros({ ...filtros, paciente_id: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los pacientes</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellidos || ''}</option>
              ))}
            </select>
            <select
              value={filtros.medico_id}
              onChange={(e) => setFiltros({ ...filtros, medico_id: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los médicos</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition"
            >
              Aplicar Filtros
            </button>
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Consultas</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {consultas.length}
          </span>
        </div>

        <div ref={tableRef} className="overflow-x-auto min-h-[380px] pb-4 rounded-b-xl" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">
                  <Hash size={11} className="inline mr-1" />SKU
                </th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Fecha</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Paciente</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Médico</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Diagnóstico</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Receta</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Factura</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {consultas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-400">
                    <Clipboard className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">
                      No hay consultas en {MESES[mes - 1]} {anio}.
                    </p>
                  </td>
                </tr>
              ) : (
                consultas.map((c) => {
                  // CONSTRUCCIÓN DEL TOOLTIP/DESCRIPCIÓN COMPLETA
                  const descripcionCompleta = [
                    c.diagnostico_texto,
                    c.diagnostico_codigo ? `(${c.diagnostico_codigo})` : '',
                    (c.sintomas || c.sintomatologia) ? `\nSíntomas: ${c.sintomas || c.sintomatologia}` : '',
                    c.subjetivo ? `\nSubjetivo: ${c.subjetivo}` : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <tr key={c.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-2 py-1 text-purple-300 font-mono text-xs whitespace-nowrap">
                        {c.codigo_sku || '-'}
                      </td>
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap">
                        {new Date(c.fecha_consulta).toLocaleString('es-SV')}
                      </td>
                      <td className="px-2 py-1 text-white font-semibold whitespace-nowrap">
                        {c.paciente_nombre || 'N/A'} {c.paciente_apellidos || ''}
                      </td>
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{c.medico_nombre || 'N/A'}</td>
                      
                      {/* CELDA CON TOOLTIP INTEGRADO PARA MOSTRAR LA DESCRIPCIÓN COMPLETA */}
                      <td 
                        className="px-2 py-1 text-gray-300 max-w-[220px] truncate cursor-help"
                        title={descripcionCompleta || 'Sin diagnóstico detallado'}
                      >
                        <span className="font-medium text-white">{c.diagnostico_texto || '-'}</span>
                        {c.diagnostico_codigo && (
                          <span className="text-xs text-gray-400 ml-1">({c.diagnostico_codigo})</span>
                        )}
                      </td>

                      <td className="px-2 py-1 text-center">
                        {c.receta ? (
                          <button
                            onClick={() => handleImprimirReceta(c)}
                            className="text-cyan-400 hover:text-cyan-300"
                            title="Imprimir receta"
                          >
                            <Printer size={14} />
                          </button>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {(() => {
                            const tieneFacturaActiva = c.factura_id && c.factura_estado !== 'Anulada';
                            if (!tieneFacturaActiva) {
                              return (
                                <button
                                  onClick={() => handleFacturar(c.id)}
                                  title="Facturar consulta"
                                  className="w-24 inline-flex items-center justify-center gap-1.5 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-medium transition-colors"
                                >
                                  <DollarSign size={14} /> <span>Facturar</span>
                                </button>
                              );
                            }
                            const colores = {
                              Pagada: 'bg-green-500/10 text-green-400 border-green-500/40',
                              Emitida: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40',
                              Borrador: 'bg-gray-500/10 text-gray-400 border-gray-500/40',
                            };
                            const colorClase = colores[c.factura_estado] || colores['Emitida'];
                            return (
                              <span
                                title={`Factura ${c.factura_numero || c.factura_id} - ${c.factura_estado}`}
                                className={`w-24 inline-flex items-center justify-center gap-1.5 px-2 py-1 border rounded-lg text-xs font-medium ${colorClase}`}
                              >
                                <CheckCircle size={14} /> {c.factura_estado}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleVerDetalle(c.id)}
                            title="Ver detalle"
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent hover:bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Eye size={14} /> <span>Detalle</span>
                          </button>
                          <button
                            onClick={() => handleEdit(c)}
                            title="Editar"
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent hover:bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Edit2 size={14} /> <span>Editar</span>
                          </button>
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

      {/* MODAL FORM CONSULTA */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[95vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Editar Consulta' : 'Nueva Consulta'}
                {editing?.codigo_sku && (
                  <span className="ml-3 text-sm font-mono text-purple-300">
                    {editing.codigo_sku}
                  </span>
                )}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <ConsultaForm
              initialData={editing || {}}
              tipoOrganizacion={tipoOrg}
              pacientes={pacientes}
              medicos={medicos}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              loading={saving}
              isEditing={!!editing}
            />
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {showDetail && selectedConsulta && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Detalle de Consulta
                {selectedConsulta.codigo_sku && (
                  <span className="ml-3 text-sm font-mono text-purple-300">
                    {selectedConsulta.codigo_sku}
                  </span>
                )}
              </h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-400">Paciente:</span> <span className="text-white">{selectedConsulta.paciente_nombre}</span></div>
                <div><span className="text-gray-400">Médico:</span> <span className="text-white">{selectedConsulta.medico_nombre}</span></div>
                <div><span className="text-gray-400">Fecha:</span> <span className="text-white">{new Date(selectedConsulta.fecha_consulta).toLocaleString('es-SV')}</span></div>
                {selectedConsulta.diagnostico_codigo && (
                  <div><span className="text-gray-400">CIE-10:</span> <span className="text-white">{selectedConsulta.diagnostico_codigo}</span></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-400 font-semibold">S:</span><p className="text-white mt-1">{selectedConsulta.subjetivo || '-'}</p></div>
                <div><span className="text-gray-400 font-semibold">O:</span><p className="text-white mt-1">{selectedConsulta.objetivo || '-'}</p></div>
                <div><span className="text-gray-400 font-semibold">A:</span><p className="text-white mt-1">{selectedConsulta.analisis || '-'}</p></div>
                <div><span className="text-gray-400 font-semibold">P:</span><p className="text-white mt-1">{selectedConsulta.plan || '-'}</p></div>
              </div>
              {selectedConsulta.receta && (
                <div className="bg-cyan-900/20 border border-cyan-700 p-3 rounded-lg">
                  <span className="text-gray-400 font-semibold">Receta:</span>
                  <div className="text-white mt-1 whitespace-pre-wrap">{selectedConsulta.receta}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => handleImprimirReceta(selectedConsulta)}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition flex items-center gap-2"
              >
                <Printer size={16} /> Imprimir Receta
              </button>
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FACTURACIÓN */}
      {showFacturar && selectedConsulta && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Facturar Consulta {selectedConsulta.codigo_sku && `· ${selectedConsulta.codigo_sku}`}
                <p className="text-sm font-normal text-gray-400 mt-0.5">{selectedConsulta.paciente_nombre}</p>
              </h2>
              <button onClick={() => setShowFacturar(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleFacturarSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Tipo Documento
                  </label>
                  <select
                    value={facturaData.tipo_documento}
                    onChange={(e) => setFacturaData({ ...facturaData, tipo_documento: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="FAF">FAF</option>
                    <option value="CCF">CCF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Estado
                  </label>
                  <select
                    value={facturaData.estado}
                    onChange={(e) => setFacturaData({ ...facturaData, estado: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Emitida">Emitida</option>
                    <option value="Pagada">Pagada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Condición
                  </label>
                  <select
                    value={facturaData.condicion_operacion}
                    onChange={(e) => setFacturaData({ ...facturaData, condicion_operacion: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Credito">Crédito</option>
                  </select>
                </div>
              </div>

              {/* Servicios */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={14} className="text-purple-400" />
                    Servicios / Productos
                  </h4>
                  <button
                    type="button"
                    onClick={addServicio}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition shadow-sm hover:shadow-purple-900/30"
                  >
                    <Plus size={12} /> Agregar servicio
                  </button>
                </div>

                {/* Encabezados de columnas */}
                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-5">Servicio</div>
                  <div className="col-span-1 text-center">Cant.</div>
                  <div className="col-span-2 text-center">Precio</div>
                  <div className="col-span-3 text-center">Tipo / IVA</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Filas */}
                <div className="space-y-2">
                  {facturaData.servicios.map((serv, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-gray-900/40 border border-gray-700/70 rounded-lg p-2"
                    >
                      <div className="col-span-5 relative">
                        <select
                          value={serv.producto_id}
                          onChange={(e) => updateServicio(idx, 'producto_id', e.target.value)}
                          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Seleccionar servicio</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} - ${parseFloat(p.precio_unitario).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        {serv._esExamen && (
                          <span
                            className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-purple-600 text-white rounded-full text-[9px] font-bold shadow-md whitespace-nowrap"
                            title={`Examen asociado: ${serv._examenNombre}`}
                          >
                            🔬 Examen
                          </span>
                        )}
                        {serv._esVacuna && (
                          <span
                            className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-pink-600 text-white rounded-full text-[9px] font-bold shadow-md whitespace-nowrap"
                            title={`Vacuna aplicada: ${serv._vacunaNombre}${serv._lote ? ' · Lote: ' + serv._lote : ''}`}
                          >
                            💉 Vacuna
                          </span>
                        )}
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={serv.cantidad}
                        onChange={(e) => updateServicio(idx, 'cantidad', parseInt(e.target.value) || 1)}
                        className="col-span-1 px-1 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />

                      <div className="col-span-2 relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={serv.precio_unitario}
                          onChange={(e) => updateServicio(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-1 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="col-span-3">
                        <select
                          value={serv.tipo_venta}
                          onChange={(e) => updateServicio(idx, 'tipo_venta', e.target.value)}
                          className={`w-full px-2 py-1.5 border rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            serv.tipo_venta === 'Gravado'
                              ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-200'
                              : serv.tipo_venta === 'Exento'
                              ? 'bg-cyan-900/30 border-cyan-700/50 text-cyan-200'
                              : 'bg-gray-700/60 border-gray-600 text-gray-300'
                          }`}
                        >
                          <option value="Gravado">Gravado · IVA 13%</option>
                          <option value="Exento">Exento · Sin IVA</option>
                          <option value="No_Sujeto">No Sujeto · Sin IVA</option>
                        </select>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        {facturaData.servicios.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeServicio(idx)}
                            className="text-rose-400 hover:text-rose-300 transition"
                            title="Eliminar servicio"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen de totales */}
              {(() => {
                const subtotal = facturaData.servicios.reduce((acc, s) => {
                  return acc + (parseFloat(s.cantidad || 0) * parseFloat(s.precio_unitario || 0));
                }, 0);
                const iva13 = facturaData.servicios.reduce((acc, s) => {
                  const sub = parseFloat(s.cantidad || 0) * parseFloat(s.precio_unitario || 0);
                  return acc + (s.tipo_venta === 'Gravado' ? sub * 0.13 : 0);
                }, 0);
                const total = subtotal + iva13;

                return (
                  <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-gray-200 font-mono">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">IVA 13%</span>
                      <span className="text-gray-200 font-mono">${iva13.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-700 pt-1.5 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-200 uppercase tracking-wider">Total a Pagar</span>
                      <span className="text-xl font-bold text-emerald-400 font-mono">${total.toFixed(2)}</span>
                    </div>
                    
                    {(() => {
                      const numExamenes = facturaData.servicios.filter((s) => s._esExamen).length;
                      const numVacunas = facturaData.servicios.filter((s) => s._esVacuna).length;
                      if (numExamenes === 0 && numVacunas === 0) return null;
                      return (
                        <p className="text-xs text-purple-300 pt-1 flex items-center gap-1">
                          <Activity size={12} />
                          Incluye {numExamenes > 0 ? `${numExamenes} examen(es)` : ''} 
                          {numExamenes > 0 && numVacunas > 0 ? ' y ' : ''}
                          {numVacunas > 0 ? `${numVacunas} vacuna(s)` : ''} 
                          interno(s) asociado(s) a esta consulta.
                        </p>
                      );
                    })()}
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowFacturar(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-md shadow-emerald-900/30 flex items-center gap-2"
                >
                  <CheckCircle size={14} /> Generar Factura
                </button>
              </div>
            </form>
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

export default Consultas;