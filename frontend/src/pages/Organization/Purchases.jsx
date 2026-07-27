// frontend/src/pages/organization/Purchases.jsx
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  cancelPurchase,
  marcarComoPagada,
  getPurchaseDashboard,
  getEvolucionGastos,
  getComparacionPagos,
  getTopProductosMes,
  exportarComprasFiltradas,
  exportarTodasCompras,
  exportarEvolucionGastos,
  exportarComparacionPagos,
  exportarTopProductos,
  generarPDFCompra,
  getAniosDisponiblesCompras,
} from '../../api/purchases';
import { getProveedores } from '../../api/proveedores';
import { getProductos } from '../../api/productos';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import PurchaseForm from '../../components/forms/PurchaseForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { getTodayLocal } from '../../utils/dateUtils';
import { Printer } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Download,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Search,
  X,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  CreditCard,
  Users,
  CheckCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#8b5cf6', '#f43f5e'];

const Purchases = () => {
  const [compras, setCompras] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Dashboard data
  const [dashboard, setDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Gráficas independientes
  const [evolucionData, setEvolucionData] = useState([]);
  const [comparacionPagosData, setComparacionPagosData] = useState([]);
  const [topProductosData, setTopProductosData] = useState([]);
  const [loadingGraficas, setLoadingGraficas] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    search: '',
    mes: '',
    anio: new Date().getFullYear(),
    proveedor_id: '',
    estado_comprobante: '',
    tipo_documento: '',
    tipo_egreso: '',
    condicion_operacion: '',
    solo_con_vencimiento: '',
    page: 1,
    limit: 10,
  });
  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

  // Años disponibles
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  // Modales
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4'];

  // Cargar años disponibles (solo años con datos)
  useEffect(() => {
    const loadAnios = async () => {
      try {
        const data = await getAniosDisponiblesCompras();
        if (data && data.length > 0) {
          setAniosDisponibles(data);
          // Si el año actual no está en la lista, usar el primero
          const currentYear = new Date().getFullYear();
          if (!data.includes(currentYear)) {
            setFiltros(prev => ({ ...prev, anio: data[0] }));
            setFiltrosTemp(prev => ({ ...prev, anio: data[0] }));
          }
        } else {
          const year = new Date().getFullYear();
          setAniosDisponibles([year]);
        }
      } catch (error) {
        console.error('Error cargando años disponibles:', error);
        // Si falla, usar el año actual
        const year = new Date().getFullYear();
        setAniosDisponibles([year]);
        // No mostrar error al usuario para no romper la UI
      }
    };
    loadAnios();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [provs, prods] = await Promise.all([
          getProveedores({ limit: 99999 }).catch(() => ({ proveedores: [] })),
          getProductos({ limit: 99999 }).catch(() => ({ productos: [] })),
        ]);
        setProveedores(provs.proveedores || []);
        setProductos(prods.productos || []);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    loadCatalogos();
  }, []);

  // Cargar gráficas
  const loadGraficas = useCallback(async () => {
    try {
      setLoadingGraficas(true);
      const [evolucion, comparacion, topProductos] = await Promise.all([
        getEvolucionGastos({ anio: filtros.anio }).catch(() => []),
        getComparacionPagos({ anio: filtros.anio }).catch(() => []),
        getTopProductosMes({ mes: filtros.mes, anio: filtros.anio }).catch(() => []),
      ]);
      setEvolucionData(evolucion || []);
      setComparacionPagosData(comparacion || []);
      setTopProductosData(topProductos || []);
    } catch (error) {
      console.error('Error loading gráficas:', error);
      // No mostrar error al usuario para no romper la UI
    } finally {
      setLoadingGraficas(false);
    }
  }, [filtros.anio, filtros.mes]);

  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const params = {
        mes: filtros.mes,
        anio: filtros.anio,
      };
      const data = await getPurchaseDashboard(params).catch(() => null);
      setDashboard(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setDashboard(null);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Preparar los parámetros de filtro
      const params = { ...filtros };

      // 2. Eliminar filtros vacíos para no enviarlos al backend
      if (!params.search) delete params.search;
      if (!params.proveedor_id) delete params.proveedor_id;
      if (!params.estado_comprobante) delete params.estado_comprobante;
      if (!params.tipo_documento) delete params.tipo_documento;
      if (!params.tipo_egreso) delete params.tipo_egreso;
      if (!params.condicion_operacion) delete params.condicion_operacion;
      
      // 3. Manejar el filtro de "solo con vencimiento"
      // Si el usuario hizo clic en Alertas de Vencimiento, este filtro estará activo
      if (params.solo_con_vencimiento === 'true') {
        // Lo dejamos como 'true' para que el backend filtre solo las que tienen fecha_vencimiento
      } else {
        delete params.solo_con_vencimiento; // Si no está activo, no lo enviamos
      }

      // 4. Llamar a la API con los filtros
      const data = await getPurchases(params);

      // 5. Actualizar el estado con los datos recibidos
      setCompras(data.compras || []);
      setPaginacion({
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 10,
        totalPages: data.totalPages || 1,
      });
    } catch (err) {
      console.error('Error loading compras:', err);
      setError(err.message || 'Error al cargar compras');
      toast.error('Error al cargar compras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadData();
    loadGraficas();
  }, [
    filtros.page,
    filtros.mes,
    filtros.anio,
    filtros.search,
    filtros.proveedor_id,
    filtros.estado_comprobante,
    filtros.tipo_documento,
    filtros.tipo_egreso,
    filtros.condicion_operacion,
    filtros.solo_con_vencimiento,
    loadGraficas,
  ]);

  useLayoutEffect(() => {
    if (!loading && tableRef.current && scrollPosition > 0) {
      requestAnimationFrame(() => {
        if (tableRef.current) tableRef.current.scrollTop = scrollPosition;
      });
    }
  }, [loading, compras, scrollPosition]);

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
      mes: '',
      anio: new Date().getFullYear(),
      proveedor_id: '',
      estado_comprobante: '',
      tipo_documento: '',
      tipo_egreso: '',
      condicion_operacion: '',
      solo_con_vencimiento: '',
      page: 1,
      limit: 10,
    };
    setFiltros(filtrosLimpios);
    setFiltrosTemp(filtrosLimpios);
    if (tableRef.current) setScrollPosition(0);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') aplicarFiltros();
  };

  const getTablaTitle = () => {
    const partes = [];
    if (filtros.search) partes.push(`🔍 "${filtros.search}"`);
    if (filtros.proveedor_id) {
      const prov = proveedores.find(p => p.id === parseInt(filtros.proveedor_id));
      if (prov) partes.push(`Proveedor: ${prov.razon_social}`);
    }
    if (filtros.estado_comprobante) partes.push(`Estado: ${filtros.estado_comprobante}`);
    if (filtros.tipo_documento) partes.push(`Tipo: ${filtros.tipo_documento}`);
    if (filtros.tipo_egreso) partes.push(`Egreso: ${filtros.tipo_egreso}`);
    if (filtros.condicion_operacion) partes.push(`Condición: ${filtros.condicion_operacion}`);
    if (partes.length === 0) return 'Todas las compras';
    return `Filtrado por: ${partes.join(' | ')}`;
  };

  const goToPage = (page) => {
    if (tableRef.current) setScrollPosition(tableRef.current.scrollTop);
    setFiltros({ ...filtros, page });
  };

  // CRUD
  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updatePurchase(editing.id, data);
        toast.success('Compra actualizada');
      } else {
        await createPurchase(data);
        toast.success('Compra creada');
      }
      setShowForm(false);
      setEditing(null);
      loadData();
      loadDashboard();
      loadGraficas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Compra',
      message: `¿Estás seguro de cancelar la compra N° ${nombre}? Se revertirá el stock.`,
      onConfirm: async () => {
        try {
          await cancelPurchase(id);
          toast.success('Compra cancelada');
          loadData();
          loadDashboard();
          loadGraficas();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al cancelar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleMarcarPagada = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Marcar como Pagada',
      message: `¿Estás seguro de marcar la compra N° ${nombre} como pagada?`,
      onConfirm: async () => {
        try {
          await marcarComoPagada(id);
          toast.success('Compra marcada como pagada');
          loadData();
          loadDashboard();
          loadGraficas();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al marcar como pagada');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleVerDetalle = async (id) => {
    try {
      const data = await getPurchase(id);
      setSelectedCompra(data);
      setShowDetailModal(true);
    } catch (err) {
      toast.error('Error al cargar detalle');
    }
  };

  const handleGenerarPDF = async (id) => {
    try {
      const blob = await generarPDFCompra(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF generado');
    } catch (err) {
      toast.error(err.message || 'Error al generar PDF');
    }
  };

  // Exportar
  const handleExportarTodas = async () => {
    try {
      const params = { anio: filtros.anio };
      const blob = await exportarTodasCompras(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compras_todas_${filtros.anio}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Todas las compras exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarFiltrados = async () => {
    try {
      const params = { ...filtros };
      delete params.page;
      delete params.limit;
      const blob = await exportarComprasFiltradas(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compras_filtradas_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Compras filtradas exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarEvolucion = async () => {
    try {
      const blob = await exportarEvolucionGastos({ anio: filtros.anio });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evolucion_gastos_${filtros.anio}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Evolución de gastos exportada');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarComparacionPagos = async () => {
    try {
      const blob = await exportarComparacionPagos({ anio: filtros.anio });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparacion_pagos_${filtros.anio}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Comparación de pagos exportada');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarTopProductos = async () => {
    try {
      const params = { mes: filtros.mes, anio: filtros.anio };
      const blob = await exportarTopProductos(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `top_productos_compras_${filtros.mes}_${filtros.anio}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Top productos exportado');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  // Al hacer clic en alertas, filtrar pendientes con crédito
  const handleAlertasClick = () => {
    setFiltros({
      ...filtros,
      estado_comprobante: 'Pendiente',
      condicion_operacion: 'Credito',
      solo_con_vencimiento: 'true',
      page: 1,
    });
    setFiltrosTemp({
      ...filtrosTemp,
      estado_comprobante: 'Pendiente',
      condicion_operacion: 'Credito',
      solo_con_vencimiento: 'true'
    });
  };

  // Si hay un error crítico y no hay datos, mostrar mensaje
  if (loading && compras.length === 0 && !dashboard) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some(v => v && v !== '' && v !== 1 && v !== false);

  const { kpis, gastosPorMes, topProveedores, alertas, periodo } = dashboard || {};

  // Preparar datos para gráficas
  const mesesData = (gastosPorMes || []).map(item => ({
    mes: new Date(2024, item.mes - 1).toLocaleString('es', { month: 'short' }),
    compras: item.compras || 0,
    gastos: item.gastos || 0,
    total: item.total || 0,
  }));

  const comparacionData = (comparacionPagosData || []).map(item => ({
    mes: new Date(2024, item.mes - 1).toLocaleString('es', { month: 'short' }),
    pagadas: item.pagadas || 0,
    pendientes: item.pendientes || 0,
  }));

  // Datos para gráfico de dona
  const totalCompras = kpis?.total_compras || 0;
  const totalGastos = kpis?.total_gastos || 0;
  const pieData = [
    { name: 'Compras', value: totalCompras || 0 },
    { name: 'Gastos Operativos', value: totalGastos || 0 },
  ];

  // Datos para top productos (barras horizontales)
  const topProductosChart = (topProductosData || []).map(item => ({
    name: item.producto || item.nombre || 'Producto',
    ingresos: item.total_ingresos || item.total || 0,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-purple-400" /> Gestión de Compras
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Control de compras y gastos con DTE.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-300 font-semibold">Año:</span>
            <select
              value={filtros.anio}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setFiltros(prev => ({ ...prev, anio: val, page: 1 }));
                setFiltrosTemp(prev => ({ ...prev, anio: val }));
              }}
              className="bg-transparent border-none text-white text-sm font-bold focus:outline-none focus:ring-0 cursor-pointer"
            >
              {aniosDisponibles.length > 0 ? (
                aniosDisponibles.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))
              ) : (
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              )}
            </select>
          </div>
          <button
            onClick={handleExportarTodas}
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar Todo
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
          >
            <Plus size={14} /> Nueva Compra
          </button>
        </div>
      </div>

      {/* KPIs */}
      {!loadingDashboard && dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
            <p className="text-sm text-gray-400">Total Egresos</p>
            <p className="text-2xl font-bold text-purple-400">${(kpis?.total_egresos || 0).toFixed(2)}</p>
          </div>
          <div
            className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition"
            onClick={handleAlertasClick}
          >
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" /> Cuentas por Pagar
            </p>
            <p className="text-2xl font-bold text-amber-400">${(kpis?.cuentas_por_pagar || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
            <p className="text-sm text-gray-400">IVA Crédito Fiscal</p>
            <p className="text-2xl font-bold text-cyan-400">${(kpis?.iva_credito_fiscal || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
            <p className="text-sm text-gray-400">Total Compras</p>
            <p className="text-2xl font-bold text-emerald-400">${(kpis?.total_compras || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
            <p className="text-sm text-gray-400">Total Gastos Operativos</p>
            <p className="text-2xl font-bold text-rose-400">${(kpis?.total_gastos || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* GRÁFICAS */}
      {!loadingGraficas && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfica 1: Evolución del Gasto */}
          <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-200">
                Evolución del Gasto ({filtros.anio})
              </h3>
              <button
                onClick={handleExportarEvolucion}
                className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
              >
                <Download size={13} /> Exportar
              </button>
            </div>
            {mesesData.some(d => d.total > 0 || d.compras > 0 || d.gastos > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={mesesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="mes" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="compras" stroke="#8b5cf6" name="Compras" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="gastos" stroke="#f43f5e" name="Gastos Op." strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="total" stroke="#10b981" name="Total" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                No hay datos de evolución
              </div>
            )}
          </div>

          {/* Gráfica 2: Comparación Pagadas vs Pendientes */}
          <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-200">
                Pagadas vs Pendientes ({filtros.anio})
              </h3>
              <button
                onClick={handleExportarComparacionPagos}
                className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
              >
                <Download size={13} /> Exportar
              </button>
            </div>
            {comparacionData.some(d => d.pagadas > 0 || d.pendientes > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={comparacionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="mes" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="pagadas" stroke="#10b981" name="Pagadas" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="pendientes" stroke="#f59e0b" name="Pendientes" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                No hay datos de comparación de pagos
              </div>
            )}
          </div>

          {/* Gráfica 3: Distribución de Egresos (pastel) */}
          <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-200">
                Distribución de Egresos
              </h3>
              <button
                onClick={handleExportarFiltrados}
                className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
              >
                <Download size={13} /> Exportar
              </button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  fill="#8884d8"
                  dataKey="value"
                  // Eliminamos las labels de texto para que no se corten
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                {/* Agregamos una Leyenda lateral para evitar textos cortados */}
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', color: '#e5e7eb' }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica 4: Top 5 Productos Comprados (barras horizontales) */}
          <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="...">Top 5 Productos {filtros.mes ? `(${filtros.mes}/${filtros.anio})` : `(${filtros.anio})`}</h3>
              <button
                onClick={handleExportarTopProductos}
                className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
              >
                <Download size={13} /> Exportar
              </button>
            </div>
            {topProductosChart.some(d => d.ingresos > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                {/* Reducimos márgenes y ajustamos la tabla para que quepan los 5 */}
                <BarChart data={topProductosChart} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                  {/* interval={0} fuerza a que se rendericen los 5 productos aunque estén apretados */}
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={9} width={90} interval={0} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="ingresos" barSize={15}>
                    {/* Hacemos un map para darle un color diferente de la paleta a cada producto */}
                    {topProductosChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                No hay datos de productos
              </div>
            )}
          </div>

        </div>
      )}

      {/* TABLAS DE ALERTAS Y TOP PROVEEDORES */}
      {!loadingDashboard && dashboard && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition"
            onClick={handleAlertasClick}
          >
            <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" /> Alertas de Vencimiento
            </h3>
            {alertas && alertas.length > 0 ? (
              <div className="overflow-y-auto max-h-40">
                <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                  <thead className="bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left text-gray-400">Proveedor</th>
                      <th className="px-2 py-1 text-left text-gray-400">Monto</th>
                      <th className="px-2 py-1 text-left text-gray-400">Vence en</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60">
                    {alertas.slice(0, 5).map((a, i) => {
                      const dias = Math.ceil((new Date(a.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                      
                      // Lógica corregida para identificar facturas vencidas
                      let textoDias = `${dias} días`;
                      let color = 'text-emerald-400';
                      
                      if (dias < 0) {
                        textoDias = `Vencida (hace ${Math.abs(dias)} d)`;
                        color = 'text-rose-600 font-bold'; // Rojo intenso para vencidas
                      } else if (dias === 0) {
                        textoDias = 'Vence hoy';
                        color = 'text-rose-500 font-bold';
                      } else if (dias <= 3) {
                        color = 'text-rose-400';
                      } else if (dias <= 5) {
                        color = 'text-amber-400';
                      }

                      return (
                        <tr key={i} className="hover:bg-gray-700/30">
                          <td className="px-2 py-1 text-gray-300">{a.proveedor_nombre}</td>
                          <td className="px-2 py-1 text-emerald-400 font-bold">${parseFloat(a.total).toFixed(2)}</td>
                          <td className={`px-2 py-1 font-semibold ${color}`}>{textoDias}</td>
                        </tr>
                      );
                    })}
                    {alertas.length > 5 && (
                      <tr>
                        <td colSpan="3" className="px-2 py-1 text-center text-gray-400 text-xs">
                          + {alertas.length - 5} más. Haz clic para ver todas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No hay alertas de vencimiento</p>
            )}
          </div>

          <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Top 5 Proveedores
            </h3>
            {topProveedores && topProveedores.length > 0 ? (
              <div className="overflow-y-auto max-h-40">
                <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                  <thead className="bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left text-gray-400">Proveedor</th>
                      <th className="px-2 py-1 text-left text-gray-400">NIT</th>
                      <th className="px-2 py-1 text-left text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60">
                    {topProveedores.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-700/30">
                        <td className="px-2 py-1 text-gray-300">{p.razon_social}</td>
                        <td className="px-2 py-1 text-gray-300 font-mono">{p.numero_documento || '-'}</td>
                        <td className="px-2 py-1 text-emerald-400 font-bold">${parseFloat(p.total_compras).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No hay datos de proveedores</p>
            )}
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${showFilters ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'}`}
            >
              <Filter size={14} />
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Compras'}
            </button>
            <button
              onClick={handleExportarFiltrados}
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={13} /> Exportar Vista
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="italic">{getTablaTitle()}</span>
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
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por comprobante, proveedor, NIT..."
                value={filtrosTemp.search}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, search: e.target.value })}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-7 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filtrosTemp.proveedor_id}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, proveedor_id: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.razon_social}</option>
              ))}
            </select>
            <select
              value={filtrosTemp.estado_comprobante}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, estado_comprobante: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Pagado">Pagado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
            <select
              value={filtrosTemp.tipo_documento}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, tipo_documento: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los tipos</option>
              <option value="Credito_Fiscal">Crédito Fiscal</option>
              <option value="Consumidor_Final">Consumidor Final</option>
              <option value="Sujeto_Excluido">Sujeto Excluido</option>
              <option value="Recibo">Recibo/Ticket</option>
            </select>
            <select
              value={filtrosTemp.tipo_egreso}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, tipo_egreso: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los egresos</option>
              <option value="Compra">Compra</option>
              <option value="Gasto_Operativo">Gasto Operativo</option>
            </select>
            <select
              value={filtrosTemp.mes}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, mes: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los meses</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
            <select
              value={filtrosTemp.condicion_operacion}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, condicion_operacion: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas las condiciones</option>
              <option value="Contado">Contado</option>
              <option value="Credito">Crédito</option>
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

      {/* TABLA */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Compras</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {total}
          </span>
        </div>

        <div ref={tableRef} className="overflow-x-auto" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">N° Comprobante</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Proveedor</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Fecha</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Tipo</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Total</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Condición</th>
                <th className="px-2 py-2 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {compras.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-400">
                    <DollarSign className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron compras.</p>
                  </td>
                </tr>
              ) : (
                compras.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-2 py-1.5 text-white font-semibold whitespace-nowrap">{c.numero_comprobante}</td>
                    <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">{c.proveedor_nombre}</td>
                    <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">
                      {new Date(c.fecha_registro).toLocaleDateString('es-SV')}
                    </td>
                    <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">
                      {c.tipo_documento === 'Credito_Fiscal' ? 'CCF' :
                       c.tipo_documento === 'Consumidor_Final' ? 'FCF' :
                       c.tipo_documento === 'Sujeto_Excluido' ? 'FSE' : c.tipo_documento}
                    </td>
                    <td className="px-2 py-1.5 text-emerald-400 font-bold whitespace-nowrap">${parseFloat(c.total).toFixed(2)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {c.estado_comprobante === 'Pagado' ? (
                        <span className="text-emerald-400 font-semibold">Pagado</span>
                      ) : c.estado_comprobante === 'Cancelado' ? (
                        <span className="text-gray-500 font-semibold">Cancelado</span>
                      ) : c.estado_comprobante === 'Pendiente' && c.condicion_operacion === 'Credito' ? (
                        <span className="text-amber-400 font-semibold">Pendiente (Crédito)</span>
                      ) : (
                        <span className="text-yellow-400 font-semibold">Pendiente</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">{c.condicion_operacion || 'Contado'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleVerDetalle(c.id)}
                          title="Ver detalle"
                          className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => handleGenerarPDF(c.id)}
                          title="Generar PDF"
                          className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <FileText size={12} />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const blob = await generarPDFCompra(c.id);
                              const url = window.URL.createObjectURL(blob);
                              const printWindow = window.open(url, '_blank');
                              if (printWindow) {
                                printWindow.onload = () => {
                                  printWindow.print();
                                };
                              }
                              toast.success('Abriendo PDF para impresión');
                            } catch (err) {
                              toast.error('Error al abrir el PDF');
                            }
                          }}
                          title="Imprimir PDF"
                          className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Printer size={12} />
                        </button>

                        {c.estado_comprobante === 'Pendiente' && (
                          <button
                            onClick={() => handleMarcarPagada(c.id, c.numero_comprobante)}
                            title="Marcar como pagada"
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <CheckCircle size={12} />
                          </button>
                        )}
                        {c.estado_comprobante !== 'Pagado' && c.estado_comprobante !== 'Cancelado' && (
                          <>
                            <button
                              onClick={() => { setEditing(c); setShowForm(true); }}
                              title="Editar"
                              className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleCancel(c.id, c.numero_comprobante)}
                              title="Cancelar"
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-2 border-t border-gray-700/80 bg-gray-900/50 text-xs">
            <span className="text-gray-400">
              Mostrando página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> ({total} compras)
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
                    className={`px-2.5 py-1 rounded text-xs font-bold transition ${p === page ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
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
      {showDetailModal && selectedCompra && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                Detalle de Compra - {selectedCompra.numero_comprobante}
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Proveedor:</span> <span className="text-white">{selectedCompra.proveedor_nombre}</span></div>
                <div><span className="text-gray-400">NIT:</span> <span className="text-white">{selectedCompra.proveedor_nit || '-'}</span></div>
                <div><span className="text-gray-400">Tipo Documento:</span> <span className="text-white">{selectedCompra.tipo_documento}</span></div>
                <div><span className="text-gray-400">Tipo Egreso:</span> <span className="text-white">{selectedCompra.tipo_egreso}</span></div>
                <div><span className="text-gray-400">Fecha:</span> <span className="text-white">{new Date(selectedCompra.fecha_registro).toLocaleDateString('es-SV')}</span></div>
                <div><span className="text-gray-400">Condición:</span> <span className="text-white">{selectedCompra.condicion_operacion}</span></div>
                {selectedCompra.fecha_vencimiento && (
                  <div><span className="text-gray-400">Vencimiento:</span> <span className="text-white">{new Date(selectedCompra.fecha_vencimiento).toLocaleDateString('es-SV')}</span></div>
                )}
                <div><span className="text-gray-400">Estado:</span> <span className="text-white">{selectedCompra.estado_comprobante}</span></div>
                <div><span className="text-gray-400">UUID:</span> <span className="text-white font-mono text-xs">{selectedCompra.uuid_dte || '-'}</span></div>
                <div><span className="text-gray-400">N° Control:</span> <span className="text-white">{selectedCompra.numero_control || '-'}</span></div>
              </div>

              <div className="mt-4 border-t border-gray-700 p-2">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Productos</h4>
                <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-2 py-1 text-left text-gray-400">Producto</th>
                      <th className="px-2 py-1 text-left text-gray-400">Cant.</th>
                      <th className="px-2 py-1 text-left text-gray-400">Precio</th>
                      <th className="px-2 py-1 text-left text-gray-400">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60">
                    {(selectedCompra.detalles || []).map((d, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 text-gray-300">{d.producto_nombre}</td>
                        <td className="px-2 py-1 text-gray-300">{d.cantidad}</td>
                        <td className="px-2 py-1 text-gray-300">${parseFloat(d.precio_unitario).toFixed(2)}</td>
                        <td className="px-2 py-1 text-gray-300">${parseFloat(d.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex justify-end text-sm border-t border-gray-700 p-2">
                <div className="space-y-1">
                  <div><span className="text-gray-400">Subtotal:</span> <span className="text-white">${parseFloat(selectedCompra.monto_subtotal).toFixed(2)}</span></div>
                  <div><span className="text-gray-400">IVA:</span> <span className="text-white">${parseFloat(selectedCompra.iva_credito_fiscal || 0).toFixed(2)}</span></div>
                  {selectedCompra.retencion_iva > 0 && (
                    <div><span className="text-gray-400">Retención:</span> <span className="text-white">${parseFloat(selectedCompra.retencion_iva).toFixed(2)}</span></div>
                  )}
                  {selectedCompra.percepcion_iva > 0 && (
                    <div><span className="text-gray-400">Percepción:</span> <span className="text-white">${parseFloat(selectedCompra.percepcion_iva).toFixed(2)}</span></div>
                  )}
                  <div><span className="text-gray-400 font-bold">Total:</span> <span className="text-emerald-400 font-bold">${parseFloat(selectedCompra.total).toFixed(2)}</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-3 border-t border-gray-700">
              {/* Botón de Imprimir directo */}
              <button
                onClick={async () => {
                  try {
                    const blob = await generarPDFCompra(selectedCompra.id);
                    const url = window.URL.createObjectURL(blob);
                    const printWindow = window.open(url, '_blank');
                    if (printWindow) {
                      printWindow.onload = () => {
                        printWindow.print();
                      };
                    }
                  } catch (err) {
                    toast.error('Error al abrir el PDF');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition"
              >
                <Printer size={16} /> Imprimir
              </button>

              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editing ? 'Editar Compra' : 'Nueva Compra'}
            </h2>
            <PurchaseForm
              initialData={editing || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              loading={saving}
              proveedores={proveedores}
              productos={productos}
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

export default Purchases;