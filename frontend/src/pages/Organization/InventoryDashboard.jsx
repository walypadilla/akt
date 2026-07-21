// frontend/src/pages/organization/InventarioDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  getInventoryDashboard,
  getProductos,
  getKardex,
  getPareto,
  getLentoMovimiento,
  getValoracionInventario,
  getTomaFisica,
  createAjuste,
  registrarCostoHistorico,
  exportarReporte,
  getProyeccionAgotamientoMasiva,
  getCategorias,
  getMarcas,
} from '../../api/inventory';
import { getBodegas } from '../../api/warehouses';
import { getEtiquetas } from '../../api/tags';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { Search, Download, AlertTriangle, Settings, X, Calendar } from 'lucide-react';

const InventarioDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [productos, setProductos] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros de tabla
  const [filtros, setFiltros] = useState({
    search: '',
    tipo: '',
    estado_stock: '',
    bodega_id: '',
    categoria_id: '',
    marca_id: '',
    etiqueta_id: '',
    page: 1,
    limit: 20,
  });

  // Catálogos
  const [bodegas, setBodegas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);

  // Modales
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [showCostoModal, setShowCostoModal] = useState(false);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showReportesModal, setShowReportesModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [kardexData, setKardexData] = useState([]);

  // Fechas para reportes
  const [reporteFechas, setReporteFechas] = useState({
    fecha_inicio: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
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

  const [costoData, setCostoData] = useState({
    producto_id: '',
    proveedor_id: '',
    costo_nuevo: 0,
    motivo: '',
  });

  // Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, prods, bodegasData, cats, marcasData, etiquetasData, proyeccion] = await Promise.all([
        getInventoryDashboard({ periodo: 'mes', anio: new Date().getFullYear(), mes: new Date().getMonth() + 1 }),
        getProductos(filtros),
        getBodegas().catch(() => []),
        getCategorias().catch(() => []),
        getMarcas().catch(() => []),
        getEtiquetas().catch(() => []),
        getProyeccionAgotamientoMasiva().catch(() => []),
      ]);
      setDashboard({ ...dash, proyeccion: proyeccion || [] });
      setProductos(prods.productos || []);
      setPaginacion(prods.paginacion || { total: 0, page: 1, limit: 20, totalPages: 1 });
      setBodegas(bodegasData || []);
      setCategorias(cats || []);
      setMarcas(marcasData || []);
      setEtiquetas(etiquetasData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Error al cargar datos');
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtros.page, filtros.search, filtros.tipo, filtros.estado_stock, filtros.bodega_id, filtros.categoria_id, filtros.marca_id, filtros.etiqueta_id]);

  // Navegación de paginación
  const goToPage = (page) => {
    setFiltros({ ...filtros, page });
  };

  // Ver Kardex
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

  // Exportar reporte con filtros actuales
  const handleExportarReporte = async (tipo) => {
    try {
      const params = {
        ...filtros,
        fecha_inicio: reporteFechas.fecha_inicio,
        fecha_fin: reporteFechas.fecha_fin,
      };
      // Para kardex, usar producto seleccionado
      if (tipo === 'kardex' && selectedProducto) {
        params.producto_id = selectedProducto.id;
      }
      // Para lento-movimiento
      if (tipo === 'lento-movimiento') {
        params.dias = 90;
      }
      const blob = await exportarReporte(tipo, params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte descargado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al exportar reporte');
    }
  };

  // Título dinámico de la tabla según filtros
  const getTablaTitle = () => {
    const estados = {
      agotados: '🚫 Productos Agotados',
      minimo: '⚠️ Productos en Punto de Reorden',
      con_existencias: '✅ Productos con Existencias',
    };
    let titulo = '📦 Listado de Productos';
    if (filtros.estado_stock && estados[filtros.estado_stock]) {
      titulo = estados[filtros.estado_stock];
    }
    if (filtros.search) titulo += ` (buscando: "${filtros.search}")`;
    if (filtros.tipo) titulo += ` | Tipo: ${filtros.tipo}`;
    return titulo;
  };

  // Alerta clic
  const handleAlertaClick = (tipo) => {
    setFiltros({ ...filtros, estado_stock: tipo === 'bajoStock' ? 'minimo' : 'agotados', page: 1 });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { kpis, alertas, topProductos, movimientosRecientes, datosMensuales, datosDiarios } = dashboard || {};

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">📦 Dashboard de Inventario</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowReportesModal(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Download size={18} />
            Reportes
          </button>
          <button
            onClick={() => setShowAjusteModal(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Settings size={18} />
            Ajustar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
          <p className="text-xl font-bold text-white">{kpis?.totalProductos || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Entradas (periodo)</p>
          <p className="text-xl font-bold text-emerald-400">{kpis?.totalEntradas || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Salidas (periodo)</p>
          <p className="text-xl font-bold text-rose-400">{kpis?.totalSalidas || 0}</p>
        </div>
      </div>

      {/* Proyección */}
      <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">⏳ Proyección de Agotamiento (días restantes)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {dashboard?.proyeccion?.map((p) => (
            <div key={p.id} className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
              <p className="text-sm text-gray-300 truncate" title={p.nombre}>{p.nombre}</p>
              <p className={`text-xl font-bold ${p.dias <= 7 ? 'text-red-400' : p.dias <= 15 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {p.dias === Infinity ? '∞' : `${p.dias} días`}
              </p>
              <p className="text-xs text-gray-400">Stock: {p.stock_actual}</p>
            </div>
          ))}
          {(!dashboard?.proyeccion || dashboard.proyeccion.length === 0) && (
            <p className="text-gray-400 col-span-5 text-center">No hay datos suficientes para proyectar agotamiento.</p>
          )}
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Movimientos por Mes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={datosMensuales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
              <Bar dataKey="entradas" fill="#10b981" name="Entradas" />
              <Bar dataKey="salidas" fill="#f43f5e" name="Salidas" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Top 5 Productos (Ingresos)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topProductos || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="nombre" type="category" stroke="#9ca3af" width={100} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="total_ingresos" fill="#8b5cf6" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla con título dinámico */}
      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{getTablaTitle()}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Buscador y filtros (igual que antes) */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por SKU, Código de barras o Nombre..."
                value={filtros.search}
                onChange={(e) => setFiltros({ ...filtros, search: e.target.value, page: 1 })}
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value, page: 1 })}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos</option>
              <option value="Producto">Producto</option>
              <option value="Servicio">Servicio</option>
            </select>
            <select
              value={filtros.estado_stock}
              onChange={(e) => setFiltros({ ...filtros, estado_stock: e.target.value, page: 1 })}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos</option>
              <option value="con_existencias">Con Existencias</option>
              <option value="minimo">En Punto de Reorden</option>
              <option value="agotados">Agotados</option>
            </select>
            <select
              value={filtros.bodega_id}
              onChange={(e) => setFiltros({ ...filtros, bodega_id: e.target.value, page: 1 })}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas las bodegas</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
            <select
              value={filtros.categoria_id}
              onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value, page: 1 })}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select
              value={filtros.marca_id}
              onChange={(e) => setFiltros({ ...filtros, marca_id: e.target.value, page: 1 })}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas las marcas</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <select
              value={filtros.etiqueta_id}
              onChange={(e) => setFiltros({ ...filtros, etiqueta_id: e.target.value, page: 1 })}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas las etiquetas</option>
              {etiquetas.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla (igual que antes) */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Precio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Costo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {productos.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-4 text-center text-gray-400">No hay productos</td></tr>
              ) : (
                productos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 text-gray-300">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-300">{p.codigo_sku || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${p.tipo === 'Producto' ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-purple-900/50 text-purple-400 border border-purple-700'}`}>
                        {p.tipo || 'Producto'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${parseFloat(p.stock_actual) <= parseFloat(p.stock_minimo) ? 'text-red-400' : parseFloat(p.stock_actual) > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {p.stock_actual}
                      </span>
                      {parseFloat(p.stock_actual) <= parseFloat(p.stock_minimo) && parseFloat(p.stock_actual) > 0 && (
                        <span className="ml-1 text-xs text-yellow-400">(Mínimo)</span>
                      )}
                      {parseFloat(p.stock_actual) <= 0 && (
                        <span className="ml-1 text-xs text-red-400">(Agotado)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">${p.precio_unitario}</td>
                    <td className="px-4 py-3 text-gray-300">${p.costo_promedio || p.costo_unitario}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        onClick={() => verKardex(p.id, p.nombre)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs"
                      >
                        Kardex
                      </button>
                      <button
                        onClick={() => { setSelectedProducto(p); setShowCostoModal(true); }}
                        className="text-yellow-400 hover:text-yellow-300 text-xs"
                      >
                        Costo
                      </button>
                      <button
                        onClick={() => { setSelectedProducto(p); setAjusteData({ ...ajusteData, producto_id: p.id }); setShowAjusteModal(true); }}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {paginacion.totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-700">
            <span className="text-sm text-gray-400">Mostrando {productos.length} de {paginacion.total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(paginacion.page - 1)}
                disabled={paginacion.page === 1}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(paginacion.totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`px-3 py-1 rounded ${p === paginacion.page ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => goToPage(paginacion.page + 1)}
                disabled={paginacion.page === paginacion.totalPages}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== MODALES ========== */}

      {/* Modal Reportes con fechas */}
      {showReportesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📊 Reportes de Inventario</h3>
              <button onClick={() => setShowReportesModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <label className="text-sm text-gray-300">Rango de fechas (para Kardex):</label>
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
              <p className="text-xs text-gray-400">* Los demás reportes usan los filtros actuales de la tabla.</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleExportarReporte('kardex')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                📋 Kardex Detallado
              </button>
              <button
                onClick={() => handleExportarReporte('rentabilidad')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                📈 Rentabilidad por Producto
              </button>
              <button
                onClick={() => handleExportarReporte('toma-fisica')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                📄 Hoja de Toma Física
              </button>
              <button
                onClick={() => handleExportarReporte('lento-movimiento')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                🐌 Mercancía de Lento Movimiento
              </button>
              <button
                onClick={() => handleExportarReporte('valoracion')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                💰 Valoración de Inventario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kardex - Igual que antes */}
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

      {/* Modal Reportes - Igual que antes */}
      {showReportesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Reportes de Inventario</h3>
              <button onClick={() => setShowReportesModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleExportarReporte('kardex')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                📋 Kardex Detallado
              </button>
              <button
                onClick={() => handleExportarReporte('rentabilidad')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                📈 Rentabilidad por Producto
              </button>
              <button
                onClick={() => handleExportarReporte('toma-fisica')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                📄 Hoja de Toma Física
              </button>
              <button
                onClick={() => handleExportarReporte('lento-movimiento')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                🐌 Mercancía de Lento Movimiento
              </button>
              <button
                onClick={() => handleExportarReporte('valoracion')}
                className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                💰 Valoración de Inventario
              </button>
            </div>
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

export default InventarioDashboard;