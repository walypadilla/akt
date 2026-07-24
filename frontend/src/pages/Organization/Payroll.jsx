// frontend/src/pages/organization/Payroll.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  getPayrolls,
  generatePayroll,
  updatePayrollStatus,
  deletePayroll,
  generatePayrollMasiva,
  registrarHorasExtras,
  registrarAusencia,
  getAniosDisponibles,
  exportarPlanillas,
  generarBoletaPDF,
  obtenerAusencias,
  obtenerHorasExtras,
  exportarAusencias,
  exportarHorasExtras,
  cambiarEstadoMultiple,
  generarAguinaldos,
  generarVacaciones,
} from '../../api/payroll';
import { getEmployees } from '../../api/payroll';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import { getTodayLocal } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import {
  Download,
  Plus,
  Calendar,
  Filter,
  Search,
  X,
  DollarSign,
  Clock,
  Users,
  AlertCircle,
  TrendingUp,
  FileText,
  UserCheck,
  RotateCcw,
  Trash2,
  CheckCircle,
  Eye,
  BarChart2,
  Settings,
  Edit3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [filtros, setFiltros] = useState({
    mes: '',
    anio: new Date().getFullYear(),
    estado: '',
    empleado_id: '',
    page: 1,
    limit: 10,
  });
  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  // Modales
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showHorasExtrasModal, setShowHorasExtrasModal] = useState(false);
  const [showAusenciasModal, setShowAusenciasModal] = useState(false);
  const [showVerAusenciasModal, setShowVerAusenciasModal] = useState(false);
  const [showVerHorasExtrasModal, setShowVerHorasExtrasModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioGeneracion, setAnioGeneracion] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [tipoPeriodo, setTipoPeriodo] = useState('Mensual');
  const [editData, setEditData] = useState(null);

  const [periodoPagoGlobal, setPeriodoPagoGlobal] = useState(() => {
    return localStorage.getItem('periodoPago') || 'Mensual';
  });

  const [selectedPlanillas, setSelectedPlanillas] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [horasExtrasData, setHorasExtrasData] = useState({
    empleado_id: '',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    horas: 0,
    descripcion: '',
  });

  const [ausenciaData, setAusenciaData] = useState({
    empleado_id: '',
    fecha: new Date().toISOString().split('T')[0],
    dias: 1,
    tipo: 'Justificada',
    remunerada: true,
    observacion: '',
  });

  const [resumen, setResumen] = useState({
    totalPagado: 0,
    totalHorasExtras: 0,
    empleadosActivos: 0,
    pendientes: 0,
    ausenciasMes: 0,
    totalISSSPatronal: 0,
    totalAFPPatronal: 0,
    totalAguinaldos: 0, // Nuevo estado para Aguinaldos
    totalVacaciones: 0, // Nuevo estado para Vacaciones
    mesActual: new Date().getMonth() + 1,
    anioActual: new Date().getFullYear(),
  });

  const [datosGrafica, setDatosGrafica] = useState([]);
  const [ausenciasData, setAusenciasData] = useState([]);
  const [horasExtrasDataList, setHorasExtrasDataList] = useState([]);
  const [loadingAusencias, setLoadingAusencias] = useState(false);
  const [loadingHorasExtras, setLoadingHorasExtras] = useState(false);

  // Cargar años disponibles
  useEffect(() => {
    const cargarAnios = async () => {
      try {
        const anios = await getAniosDisponibles();
        const currentYear = new Date().getFullYear();
        let aniosFinales = anios || [];
        if (!aniosFinales.includes(currentYear)) {
          aniosFinales.push(currentYear);
          aniosFinales.sort((a, b) => b - a);
        }
        setAniosDisponibles(aniosFinales);
        setAnioSeleccionado(currentYear);
      } catch (error) {
        console.error('Error cargando años disponibles:', error);
        const year = new Date().getFullYear();
        setAniosDisponibles([year]);
        setAnioSeleccionado(year);
      }
    };
    cargarAnios();
  }, []);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...filtros,
        anio: anioSeleccionado,
      };
      const payrollsData = await getPayrolls(params);
      setPayrolls(payrollsData.planillas || []);
      setPaginacion(payrollsData.paginacion || { total: 0, page: 1, limit: 10, totalPages: 1 });

      const empleadosData = await getEmployees({ activo: true, limit: 99999 });
      setEmpleados(empleadosData.empleados || []);

      const planillas = payrollsData.planillas || [];
      const totalPagado = planillas.reduce((acc, p) => acc + (p.estado === 'Pagada' ? parseFloat(p.salario_neto_pagar || 0) : 0), 0);
      const totalHorasExtras = planillas.reduce((acc, p) => acc + parseFloat(p.horas_extras_monto || 0), 0);
      const pendientes = planillas.filter(p => p.estado === 'Borrador' || p.estado === 'Cerrada').length;
      const empleadosActivos = (empleadosData.empleados || []).filter(e => e.activo === 1).length;
      const totalISSSPatronal = planillas.reduce((acc, p) => acc + parseFloat(p.isss_patronal || 0), 0);
      const totalAFPPatronal = planillas.reduce((acc, p) => acc + parseFloat(p.afp_patronal || 0), 0);
      
      // Nuevos cálculos para Aguinaldos y Vacaciones
      const totalAguinaldos = planillas.reduce((acc, p) => acc + (p.tipo_periodo === 'Aguinaldo' && p.estado === 'Pagada' ? parseFloat(p.salario_neto_pagar || 0) : 0), 0);
      const totalVacaciones = planillas.reduce((acc, p) => acc + (p.tipo_periodo === 'Vacaciones' && p.estado === 'Pagada' ? parseFloat(p.salario_neto_pagar || 0) : 0), 0);

      const hoy = new Date();
      const mesActual = hoy.getMonth() + 1;
      const anioActual = hoy.getFullYear();
      const ausenciasData = await obtenerAusencias({ mes: mesActual, anio: anioActual });
      const ausenciasMes = ausenciasData ? ausenciasData.length : 0;

      setResumen({
        totalPagado,
        totalHorasExtras,
        empleadosActivos,
        pendientes,
        ausenciasMes,
        totalISSSPatronal,
        totalAFPPatronal,
        totalAguinaldos,
        totalVacaciones,
        mesActual,
        anioActual,
      });

      const meses = {};
      planillas.forEach(p => {
        const key = `${p.mes}/${p.anio}`;
        if (!meses[key]) meses[key] = { mes: key, total_pagado: 0, horas_extras: 0 };
        meses[key].total_pagado += parseFloat(p.salario_neto_pagar || 0);
        meses[key].horas_extras += parseFloat(p.horas_extras_monto || 0);
      });
      const graphData = Object.values(meses).sort((a, b) => {
        const [mesA, añoA] = a.mes.split('/');
        const [mesB, añoB] = b.mes.split('/');
        return (parseInt(añoA) - parseInt(añoB)) || (parseInt(mesA) - parseInt(mesB));
      });
      setDatosGrafica(graphData);
    } catch (err) {
      console.error('Error loading payroll data:', err);
      setError(err.message || 'Error al cargar datos');
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtros.page, filtros.mes, filtros.estado, filtros.empleado_id, anioSeleccionado]);

  useEffect(() => {
    if (!loading && tableRef.current && scrollPosition > 0) {
      requestAnimationFrame(() => {
        if (tableRef.current) {
          tableRef.current.scrollTop = scrollPosition;
        }
      });
    }
  }, [loading, payrolls]);

  // Modificado: Ya no se fuerza el scroll al aplicar filtros
  const aplicarFiltros = () => {
    setFiltros({ ...filtrosTemp, page: 1 });
    setShowFilters(false);
  };

  const cancelarFiltros = () => {
    setFiltrosTemp({ ...filtros });
    setShowFilters(false);
  };

  // Modificado: Ya no se fuerza el scroll al limpiar filtros
  const limpiarFiltros = () => {
    const filtrosLimpios = {
      mes: '',
      anio: new Date().getFullYear(),
      estado: '',
      empleado_id: '',
      page: 1,
      limit: 10,
    };
    setFiltros(filtrosLimpios);
    setFiltrosTemp(filtrosLimpios);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      aplicarFiltros();
    }
  };

  const getTablaTitle = () => {
    const partes = [];
    if (filtros.mes) partes.push(`Mes: ${new Date(2024, parseInt(filtros.mes) - 1).toLocaleString('es', { month: 'long' })}`);
    if (filtros.anio) partes.push(`Año: ${filtros.anio}`);
    if (filtros.estado) partes.push(`Estado: ${filtros.estado}`);
    if (filtros.empleado_id) {
      const emp = empleados.find(e => e.id === parseInt(filtros.empleado_id));
      if (emp) partes.push(`Empleado: ${emp.nombre} ${emp.apellidos || ''}`);
    }
    if (partes.length === 0) return 'Todas las planillas';
    return `Filtrado por: ${partes.join(' | ')}`;
  };

  // Modificado: Sin guardarScroll para la paginación a menos que lo desees específicamente
  const goToPage = (page) => {
    setFiltros({ ...filtros, page });
  };

  // Acciones
  const handleGenerateIndividual = async (data) => {
    setSaving(true);
    try {
      await generatePayroll(data);
      toast.success('Planillas generadas correctamente');
      setShowGenerateModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar planilla');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMasiva = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Generar Planilla Masiva',
      message: (
        <div>
          <p>¿Generar planilla para todos los empleados en {new Date(anioGeneracion, mesSeleccionado - 1).toLocaleString('es', { month: 'long' })} {anioGeneracion}?</p>
          <p className="text-xs text-gray-400 mt-1">Se generarán en estado "Borrador" para que puedas revisarlas.</p>
        </div>
      ),
      onConfirm: async () => {
        try {
          setSaving(true);
          await generatePayrollMasiva({
            mes: mesSeleccionado,
            anio: anioGeneracion,
            tipo_periodo: tipoPeriodo,
          });
          toast.success('Planillas masivas generadas en Borrador');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al generar planillas masivas');
        } finally {
          setSaving(false);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      },
    });
  };

  const handleStatusChange = (id, nuevoEstado) => {
    const planilla = payrolls.find(p => p.id === id);
    if (!planilla) return;
    if (planilla.estado === 'Pagada') {
      toast.error('No se puede cambiar el estado de una planilla pagada');
      return;
    }
    if (nuevoEstado === 'Pagada' && planilla.estado !== 'Cerrada') {
      toast.error('Para pagar, la planilla debe estar en estado "Cerrada"');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Cambiar Estado',
      message: `¿Marcar esta planilla como "${nuevoEstado}"?`,
      onConfirm: async () => {
        try {
          await updatePayrollStatus(id, { estado: nuevoEstado });
          toast.success(`Planilla ${nuevoEstado}`);
          loadData();
        } catch (err) {
          toast.error('Error al cambiar estado');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleDelete = (id) => {
    const planilla = payrolls.find(p => p.id === id);
    if (!planilla) return;
    if (planilla.estado === 'Pagada') {
      toast.error('No se puede anular una planilla pagada');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Anular Planilla',
      message: '¿Está seguro de anular esta planilla?',
      onConfirm: async () => {
        try {
          await deletePayroll(id);
          toast.success('Planilla anulada');
          loadData();
        } catch (err) {
          toast.error('Error al anular');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleRegistrarHorasExtras = async () => {
    if (!horasExtrasData.empleado_id || horasExtrasData.horas <= 0) {
      toast.error('Seleccione un empleado y una cantidad de horas válida');
      return;
    }
    try {
      await registrarHorasExtras(horasExtrasData);
      toast.success('Horas extras registradas');
      setShowHorasExtrasModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar horas extras');
    }
  };

  const handleRegistrarAusencia = async () => {
    if (!ausenciaData.empleado_id || ausenciaData.dias <= 0) {
      toast.error('Seleccione un empleado y una cantidad de días válida');
      return;
    }
    try {
      await registrarAusencia(ausenciaData);
      toast.success('Ausencia registrada');
      setShowAusenciasModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar ausencia');
    }
  };

  const handleExportar = async () => {
    try {
      const params = { ...filtros, anio: anioSeleccionado };
      const blob = await exportarPlanillas(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planillas_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Planillas exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleGenerarBoleta = async (id) => {
    try {
      const blob = await generarBoletaPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boleta_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Boleta generada');
    } catch (err) {
      toast.error(err.message || 'Error al generar boleta');
    }
  };

  const abrirHorasExtras = () => {
    setHorasExtrasData({
      empleado_id: '',
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      horas: 0,
      descripcion: '',
    });
    setShowHorasExtrasModal(true);
  };

  const abrirAusencias = () => {
    setAusenciaData({
      empleado_id: '',
      fecha: new Date().toISOString().split('T')[0],
      dias: 1,
      tipo: 'Justificada',
      remunerada: true,
      observacion: '',
    });
    setShowAusenciasModal(true);
  };

  const verAusencias = async (empleadoId = null) => {
    setLoadingAusencias(true);
    try {
      const params = {};
      if (empleadoId) params.empleado_id = empleadoId;
      if (filtros.mes) params.mes = filtros.mes;
      if (filtros.anio) params.anio = filtros.anio;
      const data = await obtenerAusencias(params);
      setAusenciasData(data || []);
      setShowVerAusenciasModal(true);
    } catch (err) {
      toast.error('Error al cargar ausencias');
    } finally {
      setLoadingAusencias(false);
    }
  };

  const verHorasExtras = async (periodoId = null) => {
    setLoadingHorasExtras(true);
    try {
      const params = {};
      if (periodoId) params.periodo_id = periodoId;
      const data = await obtenerHorasExtras(params);
      setHorasExtrasDataList(data || []);
      setShowVerHorasExtrasModal(true);
    } catch (err) {
      toast.error('Error al cargar horas extras');
    } finally {
      setLoadingHorasExtras(false);
    }
  };

  const exportarAusenciasCSV = async () => {
    try {
      const params = {};
      if (filtros.mes) params.mes = filtros.mes;
      if (filtros.anio) params.anio = filtros.anio;
      const blob = await exportarAusencias(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ausencias_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Ausencias exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const exportarHorasExtrasCSV = async () => {
    try {
      const params = {};
      if (filtros.mes) params.mes = filtros.mes;
      if (filtros.anio) params.anio = filtros.anio;
      const blob = await exportarHorasExtras(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `horas_extras_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Horas extras exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  // Modificado: Sin guardarScroll
  const filtrarPorEstado = (estado) => {
    setFiltros({ ...filtros, estado, page: 1 });
    setFiltrosTemp({ ...filtrosTemp, estado });
  };

  const cambiarPeriodoPago = () => {
    const nuevoPeriodo = periodoPagoGlobal === 'Mensual' ? 'Quincenal' :
                         periodoPagoGlobal === 'Quincenal' ? 'Semanal' : 'Mensual';
    setConfirmModal({
      isOpen: true,
      title: 'Cambiar Período de Pago',
      message: `¿Está seguro de cambiar el período de pago a "${nuevoPeriodo}"? Esto afectará los cálculos de planillas futuras.`,
      onConfirm: () => {
        setPeriodoPagoGlobal(nuevoPeriodo);
        localStorage.setItem('periodoPago', nuevoPeriodo);
        toast.info(`Período de pago cambiado a ${nuevoPeriodo}`);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  // Selección múltiple (excluir pagadas y anuladas)
  const toggleSelectAll = () => {
    const ids = payrolls
      .filter(p => p.estado !== 'Pagada' && p.estado !== 'Anulada')
      .map(p => p.id);
    if (selectAll) {
      setSelectedPlanillas([]);
    } else {
      setSelectedPlanillas(ids);
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectOne = (id) => {
    setSelectedPlanillas(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCambiarEstadoMultiple = async (estado) => {
    if (selectedPlanillas.length === 0) {
      toast.error('Selecciona al menos una planilla');
      return;
    }
    // Filtrar solo las que no están pagadas ni anuladas
    const idsValidos = selectedPlanillas.filter(id => {
      const p = payrolls.find(p => p.id === id);
      return p && p.estado !== 'Pagada' && p.estado !== 'Anulada';
    });
    if (idsValidos.length === 0) {
      toast.error('Las planillas seleccionadas no pueden ser modificadas');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: `Cambiar ${idsValidos.length} planillas a "${estado}"`,
      message: `¿Estás seguro de cambiar ${idsValidos.length} planillas a "${estado}"?`,
      onConfirm: async () => {
        try {
          await cambiarEstadoMultiple(idsValidos, estado);
          toast.success(`${idsValidos.length} planillas actualizadas a ${estado}`);
          setSelectedPlanillas([]);
          setSelectAll(false);
          loadData();
        } catch (err) {
          toast.error('Error al cambiar estado');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  // Editar planilla (abrir modal con datos)
  const abrirEditar = (planilla) => {
    setEditData(planilla);
    setShowEditModal(true);
  };

  const handleEditarPlanilla = async (data) => {
    setSaving(true);
    try {
      // Solo permitir editar horas extras, días trabajados, etc.
      await updatePayrollStatus(editData.id, {
        dias_trabajados: data.dias_trabajados,
        horas_extras_monto: data.horas_extras_monto,
        nocturnidad_monto: data.nocturnidad_monto,
      });
      toast.success('Planilla actualizada');
      setShowEditModal(false);
      setEditData(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarAguinaldos = () => {
    const anio = new Date().getFullYear();
    setConfirmModal({
      isOpen: true,
      title: 'Generar Aguinaldos',
      message: `¿Generar aguinaldos para el año ${anio} según la ley de El Salvador?`,
      onConfirm: async () => {
        try {
          await generarAguinaldos({ anio });
          toast.success('Aguinaldos generados');
          loadData();
        } catch (err) {
          toast.error('Error al generar aguinaldos');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleGenerarVacaciones = () => {
    const anio = new Date().getFullYear();
    setConfirmModal({
      isOpen: true,
      title: 'Generar Vacaciones',
      message: `¿Generar vacaciones para el año ${anio} según la ley de El Salvador?`,
      onConfirm: async () => {
        try {
          await generarVacaciones({ anio });
          toast.success('Vacaciones generadas');
          loadData();
        } catch (err) {
          toast.error('Error al generar vacaciones');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some(v => v && v !== '' && v !== 1 && v !== false);
  const nombreMes = new Date(2024, resumen.mesActual - 1).toLocaleString('es', { month: 'long' });

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-purple-400" /> Gestión de Planillas
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Control de pagos, horas extras, ausencias y boletas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={cambiarPeriodoPago}
            title="Cambiar período de pago"
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Settings size={14} />
            Pago: {periodoPagoGlobal}
          </button>
          <div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-300 font-semibold">Año Fiscal:</span>
            {aniosDisponibles.length > 0 && (
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
                className="bg-transparent border-none text-white text-sm font-bold focus:outline-none focus:ring-0 cursor-pointer"
              >
                {aniosDisponibles.map((year) => (
                  <option key={year} value={year} className="bg-gray-800">
                    {year}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={handleExportar}
            title="Exportar planillas a CSV"
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar
          </button>
          <button
            onClick={abrirHorasExtras}
            title="Registrar horas extras"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Clock size={14} /> Horas Extras
          </button>
          <button
            onClick={abrirAusencias}
            title="Registrar ausencia"
            className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <AlertCircle size={14} /> Ausencias
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            title="Generar planilla individual"
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Plus size={14} /> Generar
          </button>
          <button
            onClick={handleGenerateMasiva}
            title="Generar planilla masiva"
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Users size={14} /> Masiva
          </button>
          <button
            onClick={handleGenerarAguinaldos}
            className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Calendar size={14} /> Aguinaldos
          </button>
          <button
            onClick={handleGenerarVacaciones}
            className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Calendar size={14} /> Vacaciones
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => filtrarPorEstado('Pagada')}
          title={`Total pagado acumulado`}
        >
          <DollarSign className="w-8 h-8 text-emerald-400" />
          <div>
            <p className="text-sm text-gray-400">Total Pagado</p>
            <p className="text-2xl font-bold text-emerald-400">${resumen.totalPagado.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-amber-400" />
          <div>
            <p className="text-sm text-gray-400">Horas Extras</p>
            <p className="text-2xl font-bold text-amber-400">${resumen.totalHorasExtras.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-blue-400" />
          <div>
            <p className="text-sm text-gray-400">Empleados Activos</p>
            <p className="text-2xl font-bold text-blue-400">{resumen.empleadosActivos}</p>
          </div>
        </div>
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => filtrarPorEstado('Borrador')}
          title={`Planillas pendientes de aprobación/pago`}
        >
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <div>
            <p className="text-sm text-gray-400">Pendientes</p>
            <p className="text-2xl font-bold text-rose-400">{resumen.pendientes}</p>
          </div>
        </div>
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => {
            const hoy = new Date();
            setFiltros({ ...filtros, mes: hoy.getMonth() + 1, anio: hoy.getFullYear(), page: 1 });
            setFiltrosTemp({ ...filtrosTemp, mes: hoy.getMonth() + 1, anio: hoy.getFullYear() });
            verAusencias();
          }}
          title={`Ausencias registradas en ${nombreMes} ${resumen.anioActual}`}
        >
          <Calendar className="w-8 h-8 text-purple-400" />
          <div>
            <p className="text-sm text-gray-400">Ausencias del Mes</p>
            <p className="text-2xl font-bold text-purple-400">{resumen.ausenciasMes}</p>
          </div>
        </div>
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => {
            const hoy = new Date();
            setFiltros({ ...filtros, mes: hoy.getMonth() + 1, anio: hoy.getFullYear(), page: 1 });
            setFiltrosTemp({ ...filtrosTemp, mes: hoy.getMonth() + 1, anio: hoy.getFullYear() });
          }}
          title={`ISSS Patronal del mes (${nombreMes})`}
        >
          <DollarSign className="w-8 h-8 text-cyan-400" />
          <div>
            <p className="text-sm text-gray-400">ISSS Patronal</p>
            <p className="text-2xl font-bold text-cyan-400">${resumen.totalISSSPatronal.toFixed(2)}</p>
          </div>
        </div>
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => {
            const hoy = new Date();
            setFiltros({ ...filtros, mes: hoy.getMonth() + 1, anio: hoy.getFullYear(), page: 1 });
            setFiltrosTemp({ ...filtrosTemp, mes: hoy.getMonth() + 1, anio: hoy.getFullYear() });
          }}
          title={`AFP Patronal del mes (${nombreMes})`}
        >
          <DollarSign className="w-8 h-8 text-indigo-400" />
          <div>
            <p className="text-sm text-gray-400">AFP Patronal</p>
            <p className="text-2xl font-bold text-indigo-400">${resumen.totalAFPPatronal.toFixed(2)}</p>
          </div>
        </div>
        
        {/* === NUEVAS TARJETAS DE AGUINALDOS Y VACACIONES === */}
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-orange-400" />
          <div>
            <p className="text-sm text-gray-400">Aguinaldos Pagados</p>
            <p className="text-2xl font-bold text-orange-400">${resumen.totalAguinaldos.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-teal-400" />
          <div>
            <p className="text-sm text-gray-400">Vacaciones Pagadas</p>
            <p className="text-2xl font-bold text-teal-400">${resumen.totalVacaciones.toFixed(2)}</p>
          </div>
        </div>
        {/* ================================================= */}

      </div>

      {/* Gráfica */}
      {datosGrafica.length > 0 && (
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Comparativa: Total Pagado vs Horas Extras</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={datosGrafica}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: '10px' }} />
              <Line type="monotone" dataKey="total_pagado" stroke="#8b5cf6" name="Total Pagado" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="horas_extras" stroke="#f43f5e" name="Horas Extras" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              title="Mostrar u ocultar filtros"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                showFilters
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'
              }`}
            >
              <Filter size={14} />
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Planillas'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="italic">{getTablaTitle()}</span>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                title="Eliminar todos los filtros"
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-700/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por empleado..."
                value={filtrosTemp.search || ''}
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
              value={filtrosTemp.mes}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, mes: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={filtrosTemp.estado}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, estado: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Cerrada">Cerrada</option>
              <option value="Pagada">Pagada</option>
              <option value="Anulada">Anulada</option>
            </select>
            <div className="col-span-full flex justify-end gap-2 mt-1">
              <button
                onClick={cancelarFiltros}
                title="Cancelar cambios"
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarFiltros}
                title="Aplicar filtros"
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
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Planillas</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {total}
          </span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/40 border-b border-gray-700/80 flex-wrap">
          <span className="text-xs text-gray-400">{selectedPlanillas.length} seleccionadas</span>
          <button
            onClick={() => handleCambiarEstadoMultiple('Cerrada')}
            disabled={selectedPlanillas.length === 0}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs font-semibold disabled:opacity-50"
          >
            Cerrar seleccionadas
          </button>
          <button
            onClick={() => handleCambiarEstadoMultiple('Pagada')}
            disabled={selectedPlanillas.length === 0}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold disabled:opacity-50"
          >
            Pagar seleccionadas
          </button>
          <button
            onClick={() => handleCambiarEstadoMultiple('Anulada')}
            disabled={selectedPlanillas.length === 0}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold disabled:opacity-50"
          >
            Anular seleccionadas
          </button>
        </div>

        <div ref={tableRef} className="overflow-x-auto" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                </th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Empleado</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Período</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Tipo</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Días Trab.</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Horas Extras</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">ISSS</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">AFP</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Renta</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">ISSS Patr.</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">AFP Patr.</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Neto</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-2 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan="14" className="px-4 py-10 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron planillas.</p>
                  </td>
                </tr>
              ) : (
                payrolls.map((p) => {
                  const isDisabled = p.estado === 'Pagada' || p.estado === 'Anulada';
                  return (
                    <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedPlanillas.includes(p.id)}
                          onChange={() => toggleSelectOne(p.id)}
                          disabled={isDisabled}
                          className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-white font-semibold whitespace-nowrap">{p.empleado_nombre}</td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">{p.mes}/{p.anio}</td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">{p.tipo_periodo || 'Mensual'}</td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">{p.dias_trabajados}</td>
                      <td className="px-2 py-1.5 text-amber-400 font-bold whitespace-nowrap">${parseFloat(p.horas_extras_monto || 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">${parseFloat(p.descuento_isss || 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">${parseFloat(p.descuento_afp || 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">${parseFloat(p.descuento_renta || 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">${parseFloat(p.isss_patronal || 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">${parseFloat(p.afp_patronal || 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-emerald-400 font-bold whitespace-nowrap">${parseFloat(p.salario_neto_pagar || 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {p.estado === 'Pagada' ? (
                          <span className="text-emerald-400 font-semibold">Pagada</span>
                        ) : p.estado === 'Cerrada' ? (
                          <span className="text-yellow-400 font-semibold">Cerrada</span>
                        ) : p.estado === 'Anulada' ? (
                          <span className="text-gray-500 font-semibold">Anulada</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">Borrador</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleGenerarBoleta(p.id)}
                            title="Generar boleta PDF"
                            className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded text-xs font-semibold transition"
                          >
                            <FileText size={12} />
                          </button>
                          <button
                            onClick={() => verAusencias(p.empleado_id)}
                            title="Ver ausencias del empleado"
                            className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded text-xs font-semibold transition"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => verHorasExtras(p.periodo_id)}
                            title="Ver horas extras del período"
                            className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/30 rounded text-xs font-semibold transition"
                          >
                            <BarChart2 size={12} />
                          </button>
                          {p.estado === 'Borrador' && (
                            <>
                              <button
                                onClick={() => abrirEditar(p)}
                                title="Editar planilla"
                                className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded text-xs font-semibold transition"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(p.id, 'Cerrada')}
                                title="Cerrar planilla"
                                className="px-2 py-1 bg-yellow-600/10 hover:bg-yellow-600 text-yellow-400 hover:text-white border border-yellow-600/30 rounded text-xs font-semibold transition"
                              >
                                <CheckCircle size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                title="Anular planilla"
                                className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded text-xs font-semibold transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                          {p.estado === 'Cerrada' && (
                            <button
                              onClick={() => handleStatusChange(p.id, 'Pagada')}
                              title="Marcar como pagada"
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-xs font-semibold transition"
                            >
                              <CheckCircle size={12} />
                            </button>
                          )}
                          {p.estado === 'Pagada' && (
                            <span className="text-gray-500 text-xs italic">Bloqueada</span>
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
              Mostrando página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> ({total} planillas)
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

      {/* ========== MODALES ========== */}

      {/* Modal Generar Planilla Individual */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Generar Planilla Individual</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerateIndividual({
                  empleado_id: parseInt(selectedEmployee),
                  mes: mesSeleccionado,
                  anio: anioGeneracion,
                  tipo_periodo: tipoPeriodo,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Empleado</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.apellidos || ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Mes</label>
                  <select
                    value={mesSeleccionado}
                    onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Año</label>
                  <select
                    value={anioGeneracion}
                    onChange={(e) => setAnioGeneracion(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {aniosDisponibles.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
                  <select
                    value={tipoPeriodo}
                    onChange={(e) => setTipoPeriodo(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Semanal">Semanal</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? 'Generando...' : 'Generar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Horas Extras */}
      {showHorasExtrasModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Registrar Horas Extras</h3>
              <button onClick={() => setShowHorasExtrasModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleRegistrarHorasExtras(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Empleado</label>
                <select
                  value={horasExtrasData.empleado_id}
                  onChange={(e) => setHorasExtrasData({ ...horasExtrasData, empleado_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.apellidos || ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Mes</label>
                  <select
                    value={horasExtrasData.mes}
                    onChange={(e) => setHorasExtrasData({ ...horasExtrasData, mes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Año</label>
                  <select
                    value={horasExtrasData.anio}
                    onChange={(e) => setHorasExtrasData({ ...horasExtrasData, anio: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {aniosDisponibles.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cantidad de Horas</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={horasExtrasData.horas}
                  onChange={(e) => setHorasExtrasData({ ...horasExtrasData, horas: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                <input
                  type="text"
                  value={horasExtrasData.descripcion}
                  onChange={(e) => setHorasExtrasData({ ...horasExtrasData, descripcion: e.target.value })}
                  placeholder="Motivo de las horas extras"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowHorasExtrasModal(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ausencias */}
      {showAusenciasModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Registrar Ausencia</h3>
              <button onClick={() => setShowAusenciasModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleRegistrarAusencia(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Empleado</label>
                <select
                  value={ausenciaData.empleado_id}
                  onChange={(e) => setAusenciaData({ ...ausenciaData, empleado_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.apellidos || ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Fecha</label>
                <input
                  type="date"
                  value={ausenciaData.fecha}
                  onChange={(e) => setAusenciaData({ ...ausenciaData, fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Días</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={ausenciaData.dias}
                  onChange={(e) => setAusenciaData({ ...ausenciaData, dias: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
                <select
                  value={ausenciaData.tipo}
                  onChange={(e) => setAusenciaData({ ...ausenciaData, tipo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Justificada">Justificada</option>
                  <option value="Injustificada">Injustificada</option>
                  <option value="Incapacidad_ISSS">Incapacidad ISSS</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remunerada"
                  checked={ausenciaData.remunerada}
                  onChange={(e) => setAusenciaData({ ...ausenciaData, remunerada: e.target.checked })}
                  className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="remunerada" className="text-sm text-gray-300">Ausencia remunerada</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Observación</label>
                <input
                  type="text"
                  value={ausenciaData.observacion}
                  onChange={(e) => setAusenciaData({ ...ausenciaData, observacion: e.target.value })}
                  placeholder="Motivo de la ausencia"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAusenciasModal(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Ausencias */}
      {showVerAusenciasModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📋 Ausencias Registradas</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportarAusenciasCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download size={14} /> Exportar
                </button>
                <button onClick={() => setShowVerAusenciasModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            {loadingAusencias ? (
              <LoadingSpinner />
            ) : ausenciasData.length === 0 ? (
              <p className="text-gray-400 text-center">No hay ausencias registradas.</p>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                  <thead className="bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Empleado</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Fecha</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Días</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Tipo</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Remunerada</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Descuento</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Observación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60">
                    {ausenciasData.map((a, idx) => {
                      const descuento = !a.remunerada ? (parseFloat(a.salario_base) / 30) * parseFloat(a.dias) : 0;
                      return (
                        <tr key={idx} className="hover:bg-gray-700/30">
                          <td className="px-2 py-1.5 text-white">{a.empleado_nombre} {a.apellidos || ''}</td>
                          <td className="px-2 py-1.5 text-gray-300">{new Date(a.fecha).toLocaleDateString('es-SV')}</td>
                          <td className="px-2 py-1.5 text-gray-300">{a.dias}</td>
                          <td className="px-2 py-1.5 text-gray-300">{a.tipo}</td>
                          <td className="px-2 py-1.5 text-gray-300">{a.remunerada ? 'Sí' : 'No'}</td>
                          <td className="px-2 py-1.5 text-rose-400 font-bold">${descuento.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-gray-300">{a.observacion || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Ver Horas Extras */}
      {showVerHorasExtrasModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">⏱️ Horas Extras Registradas</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportarHorasExtrasCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download size={14} /> Exportar
                </button>
                <button onClick={() => setShowVerHorasExtrasModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            {loadingHorasExtras ? (
              <LoadingSpinner />
            ) : horasExtrasDataList.length === 0 ? (
              <p className="text-gray-400 text-center">No hay horas extras registradas.</p>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                  <thead className="bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Empleado</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Período</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Horas</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Monto</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-300">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60">
                    {horasExtrasDataList.map((h, idx) => (
                      <tr key={idx} className="hover:bg-gray-700/30">
                        <td className="px-2 py-1.5 text-white">{h.empleado_nombre} {h.apellidos || ''}</td>
                        <td className="px-2 py-1.5 text-gray-300">{h.mes}/{h.anio}</td>
                        <td className="px-2 py-1.5 text-gray-300">{h.horas}</td>
                        <td className="px-2 py-1.5 text-amber-400 font-bold">${parseFloat(h.monto_total || 0).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-gray-300">{h.descripcion || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar Planilla (Borrador) */}
      {showEditModal && editData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Editar Planilla</h3>
              <button onClick={() => { setShowEditModal(false); setEditData(null); }} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleEditarPlanilla(editData);
            }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Empleado</label>
                <input
                  type="text"
                  value={editData.empleado_nombre}
                  disabled
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Días Trabajados</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editData.dias_trabajados}
                    onChange={(e) => setEditData({ ...editData, dias_trabajados: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Horas Extras ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.horas_extras_monto}
                    onChange={(e) => setEditData({ ...editData, horas_extras_monto: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nocturnidad ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editData.nocturnidad_monto || 0}
                  onChange={(e) => setEditData({ ...editData, nocturnidad_monto: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditData(null); }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
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

export default Payroll;