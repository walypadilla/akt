// frontend/src/pages/organization/Clients.jsx
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  reactivarCliente,
  exportarTodosClientes,
  exportarClientesFiltrados,
  generarClientePDF,
  getClientesPorMes,
  getTopClientes,
  exportarGraficaClientesPorMes,
  exportarTopClientes,
  getAniosDisponiblesClientes,
} from '../../api/clients';
import { getDepartamentos, getMunicipios, getActividades } from '../../api/catalogos';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ClientForm from '../../components/forms/ClientForm';
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
  FileText,
  Calendar,
  Printer
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
} from 'recharts';

const Clients = () => {
  const [clientes, setClientes] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [totales, setTotales] = useState({ activos: 0, inactivos: 0, nuevosMes: 0 });

  const [filtros, setFiltros] = useState({
    nombre: '',
    nit: '',
    dui: '',
    tipo_contribuyente: '',
    giro: '',
    activo: 'true',
    page: 1,
    limit: 10,
  });
  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [datosPorMes, setDatosPorMes] = useState([]);
  const [topClientes, setTopClientes] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [actividades, setActividades] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);

  // Cargar catálogos
  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [acts, deptos] = await Promise.all([
          getActividades(),
          getDepartamentos(),
        ]);
        setActividades(acts || []);
        setDepartamentos(deptos || []);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    loadCatalogos();
  }, []);

  // Cargar años disponibles
  useEffect(() => {
    const loadAnios = async () => {
      try {
        const data = await getAniosDisponiblesClientes();
        if (data && data.length > 0) {
          setAniosDisponibles(data);
          setAnioSeleccionado(data[0]);
        } else {
          const year = new Date().getFullYear();
          setAniosDisponibles([year]);
          setAnioSeleccionado(year);
        }
      } catch (error) {
        console.error('Error cargando años:', error);
        const year = new Date().getFullYear();
        setAniosDisponibles([year]);
        setAnioSeleccionado(year);
      }
    };
    loadAnios();
  }, []);

  // Cargar datos de gráficas
  const loadGraficas = async () => {
    try {
      const [porMes, top] = await Promise.all([
        getClientesPorMes(anioSeleccionado),
        getTopClientes(anioSeleccionado, 5),
      ]);
      setDatosPorMes(porMes || []);
      setTopClientes(top || []);
    } catch (error) {
      console.error('Error cargando gráficas:', error);
    }
  };

  useEffect(() => {
    if (anioSeleccionado) loadGraficas();
  }, [anioSeleccionado]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filtros };
      if (!params.activo) delete params.activo;
      const data = await getClients(params);
      setClientes(data.clientes || []);
      setPaginacion({
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 10,
        totalPages: data.totalPages || 1,
      });
      setTotales({
        activos: data.totalActivos || 0,
        inactivos: data.totalInactivos || 0,
        nuevosMes: data.totalNuevosMes || 0,
      });
      await loadGraficas();
    } catch (err) {
      console.error('Error loading clientes:', err);
      setError(err.message || 'Error al cargar clientes');
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    filtros.page,
    filtros.nombre,
    filtros.nit,
    filtros.dui,
    filtros.tipo_contribuyente,
    filtros.giro,
    filtros.activo,
  ]);

  // 🔥 CORRECCIÓN DEL SCROLL: usar useLayoutEffect + setTimeout
  useLayoutEffect(() => {
    if (!loading && tableRef.current && scrollPosition > 0) {
      // Esperar a que el DOM se actualice completamente
      setTimeout(() => {
        if (tableRef.current) {
          tableRef.current.scrollTop = scrollPosition;
        }
      }, 50);
    }
  }, [loading, clientes, scrollPosition]);

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
      nombre: '',
      nit: '',
      dui: '',
      tipo_contribuyente: '',
      giro: '',
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

  const getTablaTitle = () => {
    const partes = [];
    if (filtros.nombre) partes.push(`🔍 "${filtros.nombre}"`);
    if (filtros.nit) partes.push(`NIT: ${filtros.nit}`);
    if (filtros.dui) partes.push(`DUI: ${filtros.dui}`);
    if (filtros.tipo_contribuyente) partes.push(`Tipo: ${filtros.tipo_contribuyente}`);
    if (filtros.giro) {
      const act = actividades.find(a => a.codigo_giro === filtros.giro);
      if (act) partes.push(`Giro: ${act.descripcion_giro}`);
    }
    if (filtros.activo === 'true') partes.push('✅ Activos');
    if (filtros.activo === 'false') partes.push('🚫 Inactivos');
    if (partes.length === 0) return 'Todos los clientes registrados';
    return `Filtrado por: ${partes.join(' | ')}`;
  };

  // Exportar
  const handleExportarTodos = async () => {
    try {
      const blob = await exportarTodosClientes();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_todos_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Todos los clientes exportados');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarFiltrados = async () => {
    try {
      const params = { ...filtros };
      delete params.page;
      delete params.limit;
      const blob = await exportarClientesFiltrados(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_filtrados_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Clientes filtrados exportados');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarGraficaClientesPorMes = async () => {
    try {
      const blob = await exportarGraficaClientesPorMes(anioSeleccionado);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_nuevos_por_mes_${anioSeleccionado}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Gráfica de clientes nuevos exportada');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarTopClientes = async () => {
    try {
      const blob = await exportarTopClientes(anioSeleccionado, 5);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `top_clientes_${anioSeleccionado}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Top clientes exportado');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  // CRUD
  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateClient(editing.id, data);
        toast.success('Cliente actualizado');
      } else {
        await createClient(data);
        toast.success('Cliente creado');
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

  const handleDelete = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desactivar Cliente',
      message: `¿Estás seguro de desactivar a "${nombre}"? Podrás reactivarlo más adelante.`,
      onConfirm: async () => {
        try {
          await deleteClient(id);
          toast.success('Cliente desactivado');
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
      title: 'Reactivar Cliente',
      message: `¿Estás seguro de reactivar a "${nombre}" en el sistema?`,
      onConfirm: async () => {
        try {
          await reactivarCliente(id);
          toast.success('Cliente reactivado');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al reactivar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleGenerarPDF = async (id) => {
    try {
      const blob = await generarClientePDF(id);
      // Forzamos el tipo application/pdf para que el navegador lo abra nativamente
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Abrir en una nueva pestaña
      window.open(url, '_blank');
      toast.success('PDF generado');
      
      // Limpiamos la URL después de un tiempo prudencial para evitar fugas de memoria
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      toast.error(err.message || 'Error al generar PDF');
    }
  };

  const goToPage = (page) => {
    if (tableRef.current) {
      setScrollPosition(tableRef.current.scrollTop);
    }
    setFiltros({ ...filtros, page });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some(v => v && v !== '' && v !== 1 && v !== false);

  const mesesData = datosPorMes.map(d => ({
    mes: new Date(2024, d.mes - 1).toLocaleString('es', { month: 'short' }),
    total: d.total,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" /> Gestión de Clientes
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Registro de clientes compatible con DTE.</p>
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
            <Plus size={14} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => {
            setFiltros({ ...filtros, activo: 'true', page: 1 });
            setFiltrosTemp({ ...filtrosTemp, activo: 'true' });
          }}
        >
          <UserCheck className="w-8 h-8 text-emerald-400" />
          <div>
            <p className="text-sm text-gray-400">Clientes Activos</p>
            <p className="text-2xl font-bold text-emerald-400">{totales.activos}</p>
          </div>
        </div>
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => {
            setFiltros({ ...filtros, activo: 'false', page: 1 });
            setFiltrosTemp({ ...filtrosTemp, activo: 'false' });
          }}
        >
          <UserX className="w-8 h-8 text-rose-400" />
          <div>
            <p className="text-sm text-gray-400">Clientes Inactivos</p>
            <p className="text-2xl font-bold text-rose-400">{totales.inactivos}</p>
          </div>
        </div>
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => {
            toast.info('Mostrando clientes creados en el mes actual');
          }}
        >
          <Calendar className="w-8 h-8 text-blue-400" />
          <div>
            <p className="text-sm text-gray-400">Nuevos este Mes</p>
            <p className="text-2xl font-bold text-blue-400">{totales.nuevosMes}</p>
          </div>
        </div>
      </div>

      {/* GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-200">
              Clientes Nuevos por Mes ({anioSeleccionado})
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {aniosDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button
                onClick={handleExportarGraficaClientesPorMes}
                title="Exportar datos de la gráfica"
                className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
              >
                <Download size={13} />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={mesesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-200">
              Top 5 Clientes por Compras ({anioSeleccionado})
            </h3>
            <button
              onClick={handleExportarTopClientes}
              title="Exportar top clientes"
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
            >
              <Download size={13} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topClientes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" fontSize={10} />
              <YAxis dataKey="nombre" type="category" stroke="#9ca3af" fontSize={9} width={70} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="total_compras" fill="#f43f5e" />
            </BarChart>
          </ResponsiveContainer>
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
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Clientes'}
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
                placeholder="Nombre del cliente..."
                value={filtrosTemp.nombre}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, nombre: e.target.value })}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-7 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <input
              type="text"
              placeholder="NIT (ej: 0000-000000-000-0)"
              value={filtrosTemp.nit}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, nit: e.target.value })}
              className="px-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="DUI (ej: 00000000-0)"
              value={filtrosTemp.dui}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, dui: e.target.value })}
              className="px-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={filtrosTemp.tipo_contribuyente}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, tipo_contribuyente: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los tipos</option>
              <option value="Grande">Grande</option>
              <option value="Mediano">Mediano</option>
              <option value="Pequeño">Pequeño</option>
              <option value="Exento">Exento</option>
            </select>
            <select
              value={filtrosTemp.giro}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, giro: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los giros</option>
              {actividades.map((act) => (
                <option key={act.codigo_giro} value={act.codigo_giro}>
                  {act.codigo_giro} - {act.descripcion_giro}
                </option>
              ))}
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

      {/* TABLA */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Clientes</h3>
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
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Documento</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">NRC</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Giro</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Contribuyente</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Teléfono</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-10 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron clientes.</p>
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-2 py-1 text-white font-semibold whitespace-nowrap">{c.nombre}</td>
                    <td className="px-2 py-1 text-gray-300 font-mono whitespace-nowrap">
                      {c.nit ? `NIT: ${c.nit}` : c.dui ? `DUI: ${c.dui}` : '-'}
                    </td>
                    <td className="px-2 py-1 text-gray-300 font-mono whitespace-nowrap">{c.nrc || '-'}</td>
                    <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{c.giro || '-'}</td>
                    <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{c.tipo_contribuyente}</td>
                    <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{c.telefono || '-'}</td>
                    <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{c.correo || '-'}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {c.activo === 1 ? (
                        <span className="text-emerald-400 font-semibold">Activo</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">Inactivo</span>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleGenerarPDF(c.id)}
                          title="Imprimir PDF"
                          className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Printer size={12} /> Imprimir
                        </button>
                        {c.activo === 1 ? (
                          <>
                            <button
                              onClick={() => { setEditing(c); setShowForm(true); }}
                              title="Editar cliente"
                              className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Edit3 size={12} /> Editar
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.nombre)}
                              title="Desactivar cliente"
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Trash2 size={12} /> Desactivar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleReactivar(c.id, c.nombre)}
                            title="Reactivar cliente"
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <RotateCcw size={12} /> Reactivar
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

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-2 border-t border-gray-700/80 bg-gray-900/50 text-xs">
            <span className="text-gray-400">
              Mostrando página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> ({total} clientes)
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
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editing ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <ClientForm
              initialData={editing || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              loading={saving}
              departamentos={departamentos}
              actividades={actividades}
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

export default Clients;