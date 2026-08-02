import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  getInventoryDashboard,
  getProductos,
  getKardex,
  createAjuste,
  registrarCostoHistorico,
  exportarReporte,
  getProyeccionAgotamientoMasiva,
  getCategorias,
  getMarcas,
  getAniosDisponibles,
} from '../../api/inventory';
import { getBodegas, createWarehouse, updateWarehouse, deleteWarehouse } from '../../api/warehouses';
import { getEtiquetas } from '../../api/tags';
import { getProveedores } from '../../api/proveedores';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import ProductSearchSelect from '../../components/common/ProductSearchSelect';
import { getLocalDate, getTodayLocal } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { Search, Download, AlertTriangle, Settings, X, Calendar, Warehouse, TrendingUp, Filter, Box, CheckCircle2, XCircle } from 'lucide-react';

const InventarioDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [productos, setProductos] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableContainerRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros aplicados
  const [filtros, setFiltros] = useState({
    search: '',
    tipo: '',
    estado_stock: '',
    bodega_id: '',
    categoria_id: '',
    marca_id: '',
    etiqueta_id: '',
    incluir_desactivados: false,
    page: 1,
    limit: 12,
  });

  // Filtros temporales
  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

  // Catálogos
  const [bodegas, setBodegas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [proveedoresList, setProveedoresList] = useState([]);

  // Estados para búsqueda de proveedor en modal de costo
  const [proveedorInput, setProveedorInput] = useState('');
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false);

  // Modales
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [showAjusteGeneralModal, setShowAjusteGeneralModal] = useState(false);
  const [showCostoModal, setShowCostoModal] = useState(false);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showReportesModal, setShowReportesModal] = useState(false);
  const [showGestionBodegas, setShowGestionBodegas] = useState(false);
  const [showEditarBodega, setShowEditarBodega] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [productoSeleccionadoAjuste, setProductoSeleccionadoAjuste] = useState(null);
  const [kardexData, setKardexData] = useState([]);
  const [bodegasList, setBodegasList] = useState([]);
  const [bodegaEditando, setBodegaEditando] = useState(null);
  const [formBodega, setFormBodega] = useState({ nombre: '', direccion: '', responsable: '' });

  // Fechas para reportes
  const hoyStr = getTodayLocal();
  const hace3meses = new Date();
  hace3meses.setMonth(hace3meses.getMonth() - 3);
  const hace3mesesStr = getLocalDate(hace3meses);

  const [reporteFechas, setReporteFechas] = useState({
    fecha_inicio: hace3mesesStr,
    fecha_fin: hoyStr,
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Estados para formularios
  const [ajusteData, setAjusteData] = useState({
    producto_id: '',
    bodega_id: '',
    tipo_ajuste: 'Salida',
    cantidad: 0,
    motivo: 'Merma',
    descripcion: '',
  });

  const [ajusteGeneralData, setAjusteGeneralData] = useState({
    producto_id: '',
    bodega_id: '',
    tipo_ajuste: 'Salida',
    cantidad: 0,
    motivo: 'Merma',
    descripcion: '',
  });

  const [costoData, setCostoData] = useState({
    producto_id: '',
    proveedor_id: '',
    costo_nuevo: 0,
    motivo: 'Aumento',
    descripcion: '',
  });

  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  // Sincronizar filtrosTemp
  useEffect(() => {
    setFiltrosTemp(filtros);
  }, [filtros]);

  // Cargar años disponibles al montar el componente
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
      const [dash, prods, bodegasData, cats, marcasData, etiquetasData, proyeccion, provsData] = await Promise.all([
        getInventoryDashboard({
          periodo: 'anual',
          anio: anioSeleccionado,
        }),
        getProductos(filtros),
        getBodegas().catch(() => []),
        getCategorias().catch(() => []),
        getMarcas().catch(() => []),
        getEtiquetas().catch(() => []),
        getProyeccionAgotamientoMasiva().catch(() => []),
        getProveedores({ limit: 99999 }).catch(() => ({ proveedores: [] })),
      ]);
      setDashboard({ ...dash, proyeccion: proyeccion || [] });
      setProductos(prods.productos || []);
      setPaginacion(prods.paginacion || { total: 0, page: 1, limit: 12, totalPages: 1 });
      setBodegas(bodegasData || []);
      setCategorias(cats || []);
      setMarcas(marcasData || []);
      setEtiquetas(etiquetasData || []);
      setProveedoresList(provsData.proveedores || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Error al cargar datos');
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const { kpis, datosMensuales, topProductos } = dashboard || {};

  const cargarBodegas = async () => {
    try {
      const data = await getBodegas();
      setBodegasList(data);
    } catch (err) {
      toast.error('Error al cargar bodegas');
    }
  };

  useLayoutEffect(() => {
    if (!loading && tableContainerRef.current && scrollPosition > 0) {
      requestAnimationFrame(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTop = scrollPosition;
        }
      });
    }
  }, [loading, productos]);

  useEffect(() => {
    if (tableContainerRef.current && scrollPosition > 0) {
      tableContainerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [
    anioSeleccionado,
    filtros.page,
    filtros.search,
    filtros.tipo,
    filtros.estado_stock,
    filtros.bodega_id,
    filtros.categoria_id,
    filtros.marca_id,
    filtros.etiqueta_id,
    filtros.incluir_desactivados,
  ]);

  const aplicarFiltros = (e) => {
    e?.preventDefault();
    if (tableContainerRef.current) {
      setScrollPosition(tableContainerRef.current.scrollTop);
    }
    setFiltros({ ...filtrosTemp, page: 1 });
    setShowFilters(false);
  };

  const cancelarFiltros = (e) => {
    e?.preventDefault();
    setFiltrosTemp({ ...filtros });
    setShowFilters(false);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios = {
      search: '',
      tipo: '',
      estado_stock: '',
      bodega_id: '',
      categoria_id: '',
      marca_id: '',
      etiqueta_id: '',
      incluir_desactivados: false,
      page: 1,
      limit: 12,
    };
    setFiltros(filtrosLimpios);
    setFiltrosTemp(filtrosLimpios);
    if (tableContainerRef.current) setScrollPosition(0);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      aplicarFiltros(e);
    }
  };

  const getTablaTitle = () => {
    const partes = [];
    if (filtros.search) partes.push(`🔍 "${filtros.search}"`);
    if (filtros.tipo) partes.push(`Tipo: ${filtros.tipo}`);
    if (filtros.estado_stock === 'agotados') partes.push('🚫 Agotados');
    if (filtros.estado_stock === 'minimo') partes.push('⚠️ Punto de Reorden');
    if (filtros.estado_stock === 'con_existencias') partes.push('✅ Con existencias');
    if (filtros.incluir_desactivados) partes.push('📁 Incluye desactivados');
    if (filtros.bodega_id) {
      const b = bodegas.find(bg => bg.id === parseInt(filtros.bodega_id));
      if (b) partes.push(`Bodega: ${b.nombre}`);
    }
    if (filtros.categoria_id) {
      const c = categorias.find(cat => cat.id === parseInt(filtros.categoria_id));
      if (c) partes.push(`Categoría: ${c.nombre}`);
    }
    if (filtros.marca_id) {
      const m = marcas.find(marca => marca.id === parseInt(filtros.marca_id));
      if (m) partes.push(`Marca: ${m.nombre}`);
    }
    if (filtros.etiqueta_id) {
      const e = etiquetas.find(et => et.id === parseInt(filtros.etiqueta_id));
      if (e) partes.push(`Etiqueta: ${e.nombre}`);
    }
    if (partes.length === 0) return 'Todos los productos registrados';
    return `Filtrado por: ${partes.join(' | ')}`;
  };

  const goToPage = (page) => {
    if (tableContainerRef.current) {
      setScrollPosition(tableContainerRef.current.scrollTop);
    }
    setFiltros({ ...filtros, page });
  };

  const verKardex = async (productoId, nombre) => {
    setSelectedProducto({ id: productoId, nombre });
    setShowKardexModal(true);
    try {
      const data = await getKardex(productoId, {
        fecha_inicio: reporteFechas.fecha_inicio,
        fecha_fin: reporteFechas.fecha_fin,
      });
      setKardexData(data.movimientos || []);
    } catch (err) {
      toast.error('Error al cargar kardex');
    }
  };

  const handleExportarReporte = async (tipo) => {
    try {
      // ============================================================
      // Validaciones de fechas para reportes que usan fechas
      // ============================================================
      if (['kardex', 'rentabilidad', 'movimientos-producto'].includes(tipo)) {
        // Si no hay fechas, no validamos (el backend usará el año actual)
        if (reporteFechas.fecha_inicio && reporteFechas.fecha_fin) {
          const inicio = new Date(reporteFechas.fecha_inicio);
          const fin = new Date(reporteFechas.fecha_fin);
          const hoyFecha = new Date();
          hoyFecha.setHours(0, 0, 0, 0);
          if (isNaN(inicio) || isNaN(fin)) {
            toast.error('Formato de fecha inválido');
            return;
          }
          if (inicio > fin) {
            toast.error('La fecha de inicio no puede ser mayor a la fecha final');
            return;
          }
          if (inicio > hoyFecha) {
            toast.error('La fecha de inicio no puede ser mayor a hoy');
            return;
          }
          if (fin > hoyFecha) {
            toast.error('La fecha final no puede ser mayor a hoy');
            return;
          }
        }
      }

      // ============================================================
      // Construcción de parámetros
      // ============================================================
      const params = {};

      if (tipo === 'kardex') {
        if (selectedProducto) params.producto_id = selectedProducto.id;
        if (reporteFechas.fecha_inicio) params.fecha_inicio = reporteFechas.fecha_inicio;
        if (reporteFechas.fecha_fin) params.fecha_fin = reporteFechas.fecha_fin;
      }

      if (tipo === 'rentabilidad') {
        if (reporteFechas.fecha_inicio) params.fecha_inicio = reporteFechas.fecha_inicio;
        if (reporteFechas.fecha_fin) params.fecha_fin = reporteFechas.fecha_fin;
        if (selectedProducto) params.producto_id = selectedProducto.id;
      }

      if (tipo === 'movimientos-producto') {
        if (reporteFechas.fecha_inicio) params.fecha_inicio = reporteFechas.fecha_inicio;
        if (reporteFechas.fecha_fin) params.fecha_fin = reporteFechas.fecha_fin;
        // Nota: no necesita producto_id porque agrupa todos
      }

      if (tipo === 'lento-movimiento') {
        params.dias = 5;
      }

      if (['toma-fisica', 'valoracion', 'top-cambios-precio'].includes(tipo)) {
        params.estado_stock = filtros.estado_stock;
        params.tipo_producto = filtros.tipo;
        params.bodega_id = filtros.bodega_id;
        params.categoria_id = filtros.categoria_id;
        params.marca_id = filtros.marca_id;
        params.etiqueta_id = filtros.etiqueta_id;
      }

      // ============================================================
      // Llamada al endpoint genérico de exportación
      // ============================================================
      const blob = await exportarReporte(tipo, params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte descargado');

    } catch (err) {
      let errorMessage = 'Error al exportar reporte';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.message) errorMessage = parsed.message;
      } catch {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handleExportarTabla = async () => {
    try {
      const params = {
        search: filtros.search,
        tipo: filtros.tipo,
        estado_stock: filtros.estado_stock,
        bodega_id: filtros.bodega_id,
        categoria_id: filtros.categoria_id,
        marca_id: filtros.marca_id,
        etiqueta_id: filtros.etiqueta_id,
        incluir_desactivados: filtros.incluir_desactivados,
      };
      const blob = await exportarReporte('tabla', params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Tabla exportada');
    } catch (err) {
      let errorMessage = 'Error al exportar tabla';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.message) errorMessage = parsed.message;
      } catch {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handleAlertaClick = (tipo) => {
    const nuevoEstado = tipo === 'bajoStock' ? 'minimo' : 'agotados';
    if (tableContainerRef.current) {
      setScrollPosition(tableContainerRef.current.scrollTop);
    }
    setFiltros({ ...filtros, estado_stock: nuevoEstado, page: 1 });
    setFiltrosTemp({ ...filtrosTemp, estado_stock: nuevoEstado });
  };

  const abrirCostoModal = async (producto) => {
    setSelectedProducto(producto);
    setCostoData({
      producto_id: producto.id,
      proveedor_id: '',
      costo_nuevo: parseFloat(producto.costo_promedio) || 0,
      motivo: 'Aumento',
      descripcion: '',
    });
    setProveedorInput('');
    setShowProveedorDropdown(false);
    try {
      // Cargar proveedores con límite alto
      const provsData = await getProveedores({ limit: 99999 });
      // Asegurar que los proveedores tengan una propiedad 'nombre' unificada
      const proveedoresConNombre = (provsData.proveedores || []).map(p => ({
        ...p,
        nombre: p.razon_social || p.nombre || 'Sin nombre'
      }));
      setProveedoresList(proveedoresConNombre);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      setProveedoresList([]);
    }
    setShowCostoModal(true);
  };

  const abrirAjusteModal = (producto) => {
    setSelectedProducto(producto);
    setAjusteData({
      producto_id: producto.id,
      bodega_id: '',
      tipo_ajuste: 'Salida',
      cantidad: 0,
      motivo: 'Merma',
      descripcion: '',
    });
    setShowAjusteModal(true);
  };

  const abrirAjusteGeneral = () => {
    setProductoSeleccionadoAjuste(null);
    setAjusteGeneralData({
      producto_id: '',
      bodega_id: '',
      tipo_ajuste: 'Salida',
      cantidad: 0,
      motivo: 'Merma',
      descripcion: '',
    });
    setShowAjusteGeneralModal(true);
  };

  const handleCrearBodega = async () => {
    if (!formBodega.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    
    if (bodegasList && bodegasList.length > 0) {
      toast.warning('Ya tienes una bodega registrada. Para no complicar la gestión, solo editaremos la actual.');
      return;
    }

    try {
      await createWarehouse(formBodega);
      toast.success('Bodega creada exitosamente');
      setFormBodega({ nombre: '', direccion: '', responsable: '' });
      await cargarBodegas();
      const updated = await getBodegas();
      setBodegas(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear bodega');
    }
  };

  const handleEditarBodega = (bodega) => {
    setBodegaEditando(bodega);
    setFormBodega({
      nombre: bodega.nombre,
      direccion: bodega.direccion || '',
      responsable: bodega.responsable || '',
    });
    setShowEditarBodega(true);
  };

  const handleActualizarBodega = async () => {
    if (!formBodega.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    try {
      await updateWarehouse(bodegaEditando.id, formBodega);
      toast.success('Bodega actualizada exitosamente');
      setFormBodega({ nombre: '', direccion: '', responsable: '' });
      setBodegaEditando(null);
      setShowEditarBodega(false);
      await cargarBodegas();
      const updated = await getBodegas();
      setBodegas(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar bodega');
    }
  };

  const handleEliminarBodega = async (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar bodega',
      message: `¿Estás seguro de eliminar "${nombre}"?`,
      onConfirm: async () => {
        try {
          await deleteWarehouse(id);
          toast.success('Bodega eliminada');
          await cargarBodegas();
          const updated = await getBodegas();
          setBodegas(updated);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al eliminar bodega');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  if (loading && !dashboard) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some(v => v && v !== '' && v !== 1 && v !== false);

  const filteredProveedores = Array.isArray(proveedoresList) 
  ? proveedoresList.filter(prov => 
      prov && 
      (prov.razon_social || prov.nombre) && 
      (prov.razon_social || prov.nombre).toLowerCase().includes(proveedorInput.toLowerCase())
    )
  : [];

  return (
    <div className="p-6 space-y-6">
      {/* HEADER CON SELECTOR GLOBAL DE AÑO FISCAL */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <Box className="w-7 h-7 text-purple-400" /> Control de Inventario
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Visión global de existencias, costos y movimientos en tiempo real.
          </p>
        </div>

        {/* SELECTOR GLOBAL DE AÑO */}
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setShowGestionBodegas(true); cargarBodegas(); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-900/30"
            title="Gestionar bodegas y almacenes"
          >
            <Warehouse size={16} />
            Gestionar Bodegas
          </button>
          <button
            onClick={() => setShowReportesModal(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-900/30"
            title="Generar y descargar reportes"
          >
            <Download size={16} />
            Reportes
          </button>
          <button
            onClick={abrirAjusteGeneral}
            className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-900/30"
            title="Realizar ajuste de stock"
          >
            <Settings size={16} />
            Ajustar Stock
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Capital Inmovilizado</p>
          <p className="text-xl font-bold text-purple-400">${(kpis?.capitalInmovilizado || 0).toFixed(2)}</p>
        </div>
        <div
          className="bg-red-900/20 p-4 rounded-xl shadow-lg border border-red-700 cursor-pointer hover:bg-red-900/40 transition"
          onClick={() => handleAlertaClick('agotados')}
        >
          <p className="text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Agotados
          </p>
          <p className="text-2xl font-bold text-red-400">{kpis?.productosAgotados || 0}</p>
        </div>
        <div
          className="bg-yellow-900/20 p-4 rounded-xl shadow-lg border border-yellow-700 cursor-pointer hover:bg-yellow-900/40 transition"
          onClick={() => handleAlertaClick('bajoStock')}
        >
          <p className="text-sm text-yellow-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Bajo Stock
          </p>
          <p className="text-2xl font-bold text-yellow-400">{kpis?.productosBajoStock || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Total Productos</p>
          <p className="text-xl font-bold text-cyan-400">{kpis?.totalProductos || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Entradas (Año {anioSeleccionado})</p>
          <p className="text-xl font-bold text-emerald-400">{kpis?.totalEntradas || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Salidas (Año {anioSeleccionado})</p>
          <p className="text-xl font-bold text-rose-400">{kpis?.totalSalidas || 0}</p>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-200">
              Movimientos Mensuales ({anioSeleccionado})
            </h3>
          </div>
          {datosMensuales && datosMensuales.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={datosMensuales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: '10px' }} />
                <Line type="monotone" dataKey="entradas" stroke="#8b5cf6" name="Entradas" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="salidas" stroke="#f43f5e" name="Salidas" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              No hay datos de movimientos para {anioSeleccionado}
            </div>
          )}
        </div>

        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Top 5 Productos por Ingresos ({anioSeleccionado})</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProductos || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="nombre" type="category" stroke="#9ca3af" width={80} fontSize="10px" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="total_ingresos" fill="#8b5cf6" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TARJETA DE FILTROS INDEPENDIENTE */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                showFilters 
                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm' 
                  : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'
              }`}
            >
              <Filter size={15} />
              {showFilters ? 'Ocultar Filtros Avanzados' : 'Filtrar Inventario'}
            </button>

            <button
              onClick={handleExportarTabla}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30"
              title="Exportar vista filtrada actual"
            >
              <Download size={14} />
              Exportar Vista Filtrada
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="italic">{getTablaTitle()}</span>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="ml-2 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 p-2 border-t border-gray-700/70">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por Nombre, SKU o Código..."
                value={filtrosTemp.search}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, search: e.target.value })}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 pr-8 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {filtrosTemp.search && (
                <button
                  onClick={() => setFiltrosTemp({ ...filtrosTemp, search: '' })}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={filtrosTemp.tipo}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, tipo: e.target.value })}
              className="px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los tipos</option>
              <option value="Producto">Producto</option>
              <option value="Servicio">Servicio</option>
            </select>

            <select
              value={filtrosTemp.estado_stock}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, estado_stock: e.target.value })}
              className="px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los stocks</option>
              <option value="con_existencias">✅ Con existencias</option>
              <option value="minimo">⚠️ Punto de reorden</option>
              <option value="agotados">🚫 Agotados</option>
            </select>

            <select
              value={filtrosTemp.bodega_id}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, bodega_id: e.target.value })}
              className="px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas las bodegas</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>

            <div>
              <select
                value={filtrosTemp.categoria_id}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, categoria_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filtrosTemp.marca_id}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, marca_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todas las marcas</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filtrosTemp.etiqueta_id}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, etiqueta_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todas las etiquetas</option>
                {etiquetas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1 flex items-center gap-2 bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-700">
              <input
                type="checkbox"
                id="incluir_desactivados_inv"
                checked={filtrosTemp.incluir_desactivados}
                onChange={(e) =>
                  setFiltrosTemp({ ...filtrosTemp, incluir_desactivados: e.target.checked })
                }
                className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="incluir_desactivados_inv" className="text-xs font-medium text-gray-300 cursor-pointer select-none">
                Mostrar desactivados
              </label>
            </div>

            <div className="col-span-full flex justify-end gap-2 mt-2">
              <button
                onClick={cancelarFiltros}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarFiltros}
                className="px-5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md transition"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Productos y Existencias
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {total} registros
          </span>
        </div>

        <div ref={tableContainerRef} className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Producto</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">SKU</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Tipo</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Stock</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Precio Venta</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Costo</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Estado</th>
                <th className="px-2 py-2 text-center font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {productos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-400">
                    <Box className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron productos bajo estos filtros.</p>
                  </td>
                </tr>
              ) : (
                productos.map((p) => {
                  const stock = parseFloat(p.stock_actual) || 0;
                  const min = parseFloat(p.stock_minimo) || 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-2 py-1.5 text-white font-semibold whitespace-nowrap">{p.nombre}</td>
                      <td className="px-2 py-1.5 text-gray-300 font-mono whitespace-nowrap">
                        {p.codigo_sku ? (
                          <span className="bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-700">{p.codigo_sku}</span>
                        ) : (
                          <span className="text-gray-500 italic">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                          p.tipo === 'Servicio'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {p.tipo || 'Producto'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {stock <= 0 ? (
                          <span className="text-rose-400 font-bold inline-flex items-center gap-1">
                            <XCircle size={14} /> 0 Agotado
                          </span>
                        ) : stock <= min ? (
                          <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                            <AlertTriangle size={13} /> {stock} Reorden
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 size={13} /> {stock}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 font-bold text-emerald-400 font-mono whitespace-nowrap">
                        ${parseFloat(p.precio_unitario || 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-gray-300 font-mono whitespace-nowrap">
                        ${parseFloat(p.costo_promedio || 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {p.activo === 1 ? (
                          <span className="text-emerald-400 font-semibold">Activo</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">Desactivado</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.activo === 1 && (
                            <>
                              <button
                                onClick={() => verKardex(p.id, p.nombre)}
                                className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded text-xs font-semibold transition"
                                title="Ver kardex del producto"
                              >
                                Kardex
                              </button>
                              <button
                                onClick={() => abrirCostoModal(p)}
                                className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded text-xs font-semibold transition"
                                title="Actualizar costo del producto"
                              >
                                Costo
                              </button>
                              <button
                                onClick={() => abrirAjusteModal(p)}
                                className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded text-xs font-semibold transition"
                                title="Realizar ajuste de inventario"
                              >
                                Ajustar
                              </button>
                            </>
                          )}
                          {p.activo === 0 && (
                            <span className="text-gray-500 text-xs italic">Inactivo</span>
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
              Mostrando página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> ({total} ítems)
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

      {/* MODAL DE ACTUALIZACIÓN DE COSTO / PRECIO */}
      {showCostoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Actualizar Costo - {selectedProducto?.nombre}</h3>
              <button onClick={() => setShowCostoModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const costoActual = parseFloat(selectedProducto?.costo_promedio) || 0;
              
              if (costoData.motivo === 'Rebaja' && costoData.costo_nuevo > costoActual) {
                toast.error('Si el motivo es Rebaja, el nuevo costo no puede ser mayor al actual.');
                return;
              }
              if (costoData.motivo === 'Aumento' && costoData.costo_nuevo < costoActual) {
                toast.error('Si el motivo es Aumento, el nuevo costo no puede ser menor al actual.');
                return;
              }

              // Validación de Proveedor: por defecto en blanco, pero si escribe algo debe estar registrado
              let proveedorIdFinal = '';
              if (proveedorInput.trim() !== '') {
                const proveedorEncontrado = proveedoresList.find(
                  p => p.nombre.toLowerCase() === proveedorInput.toLowerCase() || p.id.toString() === proveedorInput.trim()
                );
                if (!proveedorEncontrado) {
                  toast.error('El proveedor no está registrado');
                  return;
                }
                proveedorIdFinal = proveedorEncontrado.id;
              }

              try {
                await registrarCostoHistorico({
                  ...costoData,
                  proveedor_id: proveedorIdFinal
                });
                toast.success('Costo actualizado');
                setShowCostoModal(false);
                loadData();
              } catch (err) {
                toast.error(err.response?.data?.message || 'Error al actualizar costo');
              }
            }}>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300">Producto</label>
                  <input
                    type="text"
                    value={selectedProducto?.nombre || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 block mb-1">Costo Actual</label>
                  <p className="text-white bg-gray-700 px-3 py-2 rounded-lg">
                    ${(parseFloat(selectedProducto?.costo_promedio) || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-300 block mb-1">Nuevo Costo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costoData.costo_nuevo}
                    onChange={(e) => setCostoData({ ...costoData, costo_nuevo: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* PROVEEDOR AUTOCOMPLETE (En blanco por defecto, muestra lista al escribir) */}
                <div className="relative">
                  <label className="text-sm text-gray-300 block mb-1">Proveedor (opcional)</label>
                  <input
                    type="text"
                    placeholder="Escriba para buscar proveedor..."
                    value={proveedorInput}
                    onChange={(e) => {
                      setProveedorInput(e.target.value || '');
                      setShowProveedorDropdown(true);
                      if (!e.target.value.trim()) {
                        setCostoData({ ...costoData, proveedor_id: '' });
                      }
                    }}
                    onFocus={() => setShowProveedorDropdown(true)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {showProveedorDropdown && proveedorInput.trim() !== '' && filteredProveedores.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg max-h-40 overflow-y-auto shadow-lg">
                      {filteredProveedores.map((prov) => (
                        <li
                          key={prov.id}
                          onClick={() => {
                            setProveedorInput(prov.nombre);
                            setCostoData({ ...costoData, proveedor_id: prov.id });
                            setShowProveedorDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-purple-600/40 text-white text-xs cursor-pointer transition"
                        >
                          {prov.nombre}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-300 block mb-1">Motivo</label>
                  <select
                    value={costoData.motivo}
                    onChange={(e) => setCostoData({ ...costoData, motivo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="Aumento">Aumento</option>
                    <option value="Rebaja">Rebaja</option>
                  </select>
                </div>

                {/* APARTADO DE COMENTARIOS / DESCRIPCIÓN REINCORPORADO */}
                <div>
                  <label className="text-sm text-gray-300 block mb-1">Comentarios / Descripción</label>
                  <textarea
                    value={costoData.descripcion}
                    onChange={(e) => setCostoData({ ...costoData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="2"
                    placeholder="Motivo o comentario adicional del cambio de costo..."
                  />
                </div>

                <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg transition font-bold">
                  Actualizar Costo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTROS MODALES (Reportes, Ajustes, Kardex, Bodegas) */}
      {showReportesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📊 Reportes de Inventario</h3>
              <button onClick={() => setShowReportesModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-300 block mb-1">Producto (opcional para Kardex/Rentabilidad)</label>
              <ProductSearchSelect
                products={productos}
                value={selectedProducto?.id || null}
                onChange={(id) => {
                  const prod = productos.find(p => p.id === id);
                  setSelectedProducto(prod || null);
                }}
                placeholder="Buscar producto..."
              />
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <label className="text-sm text-gray-300">Rango de fechas (para Kardex, Rentabilidad y Entradas-Salidas):</label>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={reporteFechas.fecha_inicio}
                  onChange={(e) => setReporteFechas({ ...reporteFechas, fecha_inicio: e.target.value })}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="date"
                  value={reporteFechas.fecha_fin}
                  onChange={(e) => setReporteFechas({ ...reporteFechas, fecha_fin: e.target.value })}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={() => handleExportarReporte('kardex')} className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition">📋 Kardex Detallado</button>
              <button onClick={() => handleExportarReporte('rentabilidad')} className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition">📈 Rentabilidad por Producto</button>
              <button onClick={() => handleExportarReporte('toma-fisica')} className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition">📄 Hoja de Toma Física</button>
              <button onClick={() => handleExportarReporte('lento-movimiento')} className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition">🐌 Mercancía de Lento Movimiento</button>
              <button
                onClick={() => handleExportarReporte('movimientos-producto')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition flex items-center gap-2"
              >
                <Box size={18} /> Entradas/Salidas por Producto (detallado)
              </button>
              <button onClick={() => handleExportarReporte('valoracion')} className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition">💰 Valoración de Inventario</button>
              <button
                onClick={() => handleExportarReporte('top-cambios-precio')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition flex items-center gap-2"
              >
                <TrendingUp size={18} /> Top 30 cambios de precio
              </button>
            </div>
          </div>
        </div>
      )}

      {showAjusteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Ajuste de Inventario</h3>
              <button onClick={() => setShowAjusteModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createAjuste(ajusteData);
                toast.success('Ajuste realizado');
                setShowAjusteModal(false);
                loadData();
              } catch (err) {
                toast.error(err.response?.data?.message || 'Error al ajustar');
              }
            }}>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300">Producto</label>
                  <input
                    type="text"
                    value={selectedProducto?.nombre || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Stock actual: {selectedProducto?.stock_actual || 0}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Bodega</label>
                  <select
                    value={ajusteData.bodega_id}
                    onChange={(e) => setAjusteData({ ...ajusteData, bodega_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Seleccionar (opcional)</option>
                    {bodegas.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Tipo de Ajuste</label>
                  <select
                    value={ajusteData.tipo_ajuste}
                    onChange={(e) => setAjusteData({ ...ajusteData, tipo_ajuste: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="Entrada">Entrada</option>
                    <option value="Salida">Salida</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Cantidad</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={ajusteData.cantidad}
                    onChange={(e) => setAjusteData({ ...ajusteData, cantidad: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Motivo</label>
                  <select
                    value={ajusteData.motivo}
                    onChange={(e) => setAjusteData({ ...ajusteData, motivo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="Merma">Merma</option>
                    <option value="Rotura">Rotura</option>
                    <option value="Devolución">Devolución</option>
                    <option value="Inventario Inicial">Inventario Inicial</option>
                    <option value="Ajuste Manual">Ajuste Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Descripción</label>
                  <textarea
                    value={ajusteData.descripcion}
                    onChange={(e) => setAjusteData({ ...ajusteData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="2"
                  />
                </div>
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition">
                  Realizar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAjusteGeneralModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Ajuste de Inventario</h3>
              <button onClick={() => setShowAjusteGeneralModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createAjuste(ajusteGeneralData);
                toast.success('Ajuste realizado');
                setShowAjusteGeneralModal(false);
                setProductoSeleccionadoAjuste(null);
                loadData();
              } catch (err) {
                toast.error(err.response?.data?.message || 'Error al ajustar');
              }
            }}>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300">Buscar Producto</label>
                  <ProductSearchSelect
                    products={productos}
                    value={productoSeleccionadoAjuste?.id || null}
                    onChange={(id) => {
                      const prod = productos.find(p => p.id === id);
                      setProductoSeleccionadoAjuste(prod || null);
                      setAjusteGeneralData({ ...ajusteGeneralData, producto_id: id || '' });
                    }}
                    placeholder="Buscar producto..."
                  />
                  {productoSeleccionadoAjuste && (
                    <p className="text-xs text-gray-400 mt-1">Stock actual: {productoSeleccionadoAjuste.stock_actual}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-300">Bodega</label>
                  <select
                    value={ajusteGeneralData.bodega_id}
                    onChange={(e) => setAjusteGeneralData({ ...ajusteGeneralData, bodega_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Seleccionar (opcional)</option>
                    {bodegas.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Tipo de Ajuste</label>
                  <select
                    value={ajusteGeneralData.tipo_ajuste}
                    onChange={(e) => setAjusteGeneralData({ ...ajusteGeneralData, tipo_ajuste: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="Entrada">Entrada</option>
                    <option value="Salida">Salida</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Cantidad</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={ajusteGeneralData.cantidad}
                    onChange={(e) => setAjusteGeneralData({ ...ajusteGeneralData, cantidad: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Motivo</label>
                  <select
                    value={ajusteGeneralData.motivo}
                    onChange={(e) => setAjusteGeneralData({ ...ajusteGeneralData, motivo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="Merma">Merma</option>
                    <option value="Rotura">Rotura</option>
                    <option value="Devolución">Devolución</option>
                    <option value="Inventario Inicial">Inventario Inicial</option>
                    <option value="Ajuste Manual">Ajuste Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Descripción</label>
                  <textarea
                    value={ajusteGeneralData.descripcion}
                    onChange={(e) => setAjusteGeneralData({ ...ajusteGeneralData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="2"
                  />
                </div>
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition">
                  Realizar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showKardexModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[80vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Kardex - {selectedProducto?.nombre}</h3>
              <button onClick={() => setShowKardexModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Documento</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Ref</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Cantidad</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Saldo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Bodega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {kardexData.length === 0 ? (
                    <tr><td colSpan="6" className="px-4 py-4 text-center text-gray-400">No hay movimientos</td></tr>
                  ) : (
                    kardexData.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-700/50">
                        <td className="px-4 py-2 text-gray-300">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-gray-300">{m.referencia_tipo}</td>
                        <td className="px-4 py-2 text-gray-300">{m.numero_documento || m.referencia_tipo}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded ${m.tipo_movimiento === 'Entrada' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {m.tipo_movimiento}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-300">{m.cantidad}</td>
                        <td className="px-4 py-2 text-gray-300">{m.saldo_acumulado}</td>
                        <td className="px-4 py-2 text-gray-300">{m.bodega_nombre || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showGestionBodegas && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">🏢 Gestionar Bodegas</h3>
              <button onClick={() => setShowGestionBodegas(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Crear nueva bodega</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={formBodega.nombre}
                  onChange={(e) => setFormBodega({ ...formBodega, nombre: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="Dirección"
                  value={formBodega.direccion}
                  onChange={(e) => setFormBodega({ ...formBodega, direccion: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="Responsable"
                  value={formBodega.responsable}
                  onChange={(e) => setFormBodega({ ...formBodega, responsable: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="button"
                onClick={handleCrearBodega}
                disabled={bodegasList && bodegasList.length > 0}
                className={`px-4 py-2 text-white font-medium rounded-md transition-colors ${
                  bodegasList && bodegasList.length > 0
                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                    : 'bg-blue-600 hover:bg-blue-700'             
                }`}
              >
                {bodegasList && bodegasList.length > 0 ? 'Bodega Creada' : 'Crear Bodega'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Nombre</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Dirección</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Responsable</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {bodegasList.length === 0 ? (
                    <tr><td colSpan="4" className="px-3 py-4 text-center text-gray-400">No hay bodegas</td></tr>
                  ) : (
                    bodegasList.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-700/50">
                        <td className="px-3 py-2 text-gray-300">{b.nombre}</td>
                        <td className="px-3 py-2 text-gray-300">{b.direccion || '-'}</td>
                        <td className="px-3 py-2 text-gray-300">{b.responsable || '-'}</td>
                        <td className="px-3 py-2 space-x-2">
                          <button
                            onClick={() => handleEditarBodega(b)}
                            className="text-cyan-400 hover:text-cyan-300 text-xs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminarBodega(b.id, b.nombre)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Eliminar
                          </button>
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

      {showEditarBodega && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Editar Bodega</h3>
              <button onClick={() => { setShowEditarBodega(false); setBodegaEditando(null); }} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formBodega.nombre}
                  onChange={(e) => setFormBodega({ ...formBodega, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Dirección</label>
                <input
                  type="text"
                  value={formBodega.direccion}
                  onChange={(e) => setFormBodega({ ...formBodega, direccion: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Responsable</label>
                <input
                  type="text"
                  value={formBodega.responsable}
                  onChange={(e) => setFormBodega({ ...formBodega, responsable: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => { setShowEditarBodega(false); setBodegaEditando(null); }} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition">Cancelar</button>
                <button onClick={handleActualizarBodega} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition">Actualizar</button>
              </div>
            </div>
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

export default InventarioDashboard;