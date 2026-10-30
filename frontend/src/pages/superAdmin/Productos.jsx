// frontend/src/pages/organization/Productos.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  getProductos,
  eliminarProducto,
  reactivarProducto,
} from '../../api/productos';
import { getCategorias, getMarcas } from '../../api/inventory';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ProductoForm from '../../components/forms/ProductoForm';
import KitForm from '../../components/forms/KitForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import SearchSelect from '../../components/common/SearchSelect';
import { getTodayLocal } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import {
  Download,
  Plus,
  Package,
  Edit3,
  Trash2,
  Filter,
  Search,
  X,
  RotateCcw,
  Box,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tag,
} from 'lucide-react';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [filtros, setFiltros] = useState({
    search: '',
    tipo: '',
    estado_stock: '',
    categoria_id: '',
    marca_id: '',
    es_kit: '',
    incluir_desactivados: false,
    page: 1,
    limit: 12,
  });

  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);

  const [showProductoForm, setShowProductoForm] = useState(false);
  const [showKitForm, setShowKitForm] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, cats, marcasData] = await Promise.all([
        getProductos(filtros),
        getCategorias().catch(() => []),
        getMarcas().catch(() => []),
      ]);

      const productosArray = prods?.productos ?? [];
      const safeProductos = Array.isArray(productosArray) ? productosArray : [];
      setProductos(safeProductos);
      setPaginacion(prods?.paginacion || { total: 0, page: 1, limit: 12, totalPages: 1 });
      setCategorias(cats || []);
      setMarcas(marcasData || []);
    } catch (err) {
      console.error('❌ Error cargando productos:', err);
      setError(err.message || 'Error al cargar productos');
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    filtros.page,
    filtros.search,
    filtros.tipo,
    filtros.estado_stock,
    filtros.categoria_id,
    filtros.marca_id,
    filtros.es_kit,
    filtros.incluir_desactivados,
  ]);

  useEffect(() => {
    if (!loading && tableRef.current && scrollPosition > 0) {
      requestAnimationFrame(() => {
        if (tableRef.current) tableRef.current.scrollTop = scrollPosition;
      });
    }
  }, [loading, productos]);

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
      tipo: '',
      estado_stock: '',
      categoria_id: '',
      marca_id: '',
      es_kit: '',
      incluir_desactivados: false,
      page: 1,
      limit: 12,
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

  const getTablaTitle = () => {
    const partes = [];
    if (filtros.search) partes.push(`🔍 "${filtros.search}"`);
    if (filtros.tipo) partes.push(`Tipo: ${filtros.tipo}`);
    if (filtros.estado_stock === 'con_existencias') partes.push('✅ Con existencias');
    if (filtros.estado_stock === 'minimo') partes.push('⚠️ Punto de reorden');
    if (filtros.estado_stock === 'agotados') partes.push('🚫 Agotados');
    if (filtros.es_kit === 'true') partes.push('🧩 Kits');
    if (filtros.incluir_desactivados) partes.push('📁 Incluye desactivados');
    if (filtros.categoria_id) {
      const cat = categorias.find(c => c.id === parseInt(filtros.categoria_id));
      if (cat) partes.push(`Categoría: ${cat.nombre}`);
    }
    if (filtros.marca_id) {
      const mar = marcas.find(m => m.id === parseInt(filtros.marca_id));
      if (mar) partes.push(`Marca: ${mar.nombre}`);
    }
    if (partes.length === 0) return 'Todos los productos registrados';
    return `Filtrado por: ${partes.join(' | ')}`;
  };

  const handleExportarTodos = async () => {
    try {
      const { exportarReporte } = await import('../../api/inventory');
      const params = {};
      const blob = await exportarReporte('tabla', params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todos_productos_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Todos los productos exportados');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarFiltrados = async () => {
    try {
      const { exportarReporte } = await import('../../api/inventory');
      const params = { ...filtros };
      const blob = await exportarReporte('tabla', params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_filtrados_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Productos filtrados exportados');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleDelete = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desactivar producto',
      message: `¿Estás seguro de desactivar el producto "${nombre}"? Podrás reactivarlo más adelante.`,
      onConfirm: async () => {
        try {
          await eliminarProducto(id);
          toast.success('Producto desactivado');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al eliminar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleReactivar = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reactivar producto',
      message: `¿Estás seguro de reactivar "${nombre}" en el catálogo activo?`,
      onConfirm: async () => {
        try {
          await reactivarProducto(id);
          toast.success('Producto reactivado');
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

  const handleEditarProducto = (producto) => {
    if (producto.es_kit) {
      setSelectedProducto(producto);
      setShowKitForm(true);
    } else {
      setSelectedProducto(producto);
      setShowProductoForm(true);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some(v => v && v !== '' && v !== 1 && v !== false);

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Box className="w-6 h-6 text-purple-400" /> Catálogo de Productos y Servicios
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Gestiona los ítems de tu inventario, precios, categorías y combos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportarTodos}
            title="Exportar todos los productos en CSV"
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar Todo
          </button>
          <button
            onClick={() => { setSelectedProducto(null); setShowKitForm(true); }}
            title="Crear un combo o kit de productos"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-900/30"
          >
            <Package size={14} /> + Kit/Combo
          </button>
          <button
            onClick={() => { setSelectedProducto(null); setShowProductoForm(true); }}
            title="Agregar nuevo producto o servicio"
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
          >
            <Plus size={14} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Productos'}
            </button>
            <button
              onClick={handleExportarFiltrados}
              title="Exportar solo los productos que coinciden con los filtros actuales"
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
                title="Eliminar todos los filtros aplicados"
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 p-3 border-t border-gray-700/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por Nombre, SKU o Código..."
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
              value={filtrosTemp.tipo}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, tipo: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los tipos</option>
              <option value="Producto">Producto</option>
              <option value="Servicio">Servicio</option>
            </select>

            <select
              value={filtrosTemp.estado_stock}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, estado_stock: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los stocks</option>
              <option value="con_existencias">Con existencias</option>
              <option value="minimo">⚠️ Reorden</option>
              <option value="agotados">🚫 Agotados</option>
            </select>

            <select
              value={filtrosTemp.es_kit}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, es_kit: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Productos y Kits</option>
              <option value="true">Solo Kits</option>
              <option value="false">Solo Productos</option>
            </select>

            <div className="col-span-1">
              <SearchSelect
                options={categorias}
                value={filtrosTemp.categoria_id ? parseInt(filtrosTemp.categoria_id) : null}
                onChange={(id) => setFiltrosTemp({ ...filtrosTemp, categoria_id: id || '' })}
                placeholder="Categoría..."
                allowCreate={false}
              />
            </div>

            <div className="col-span-1">
              <SearchSelect
                options={marcas}
                value={filtrosTemp.marca_id ? parseInt(filtrosTemp.marca_id) : null}
                onChange={(id) => setFiltrosTemp({ ...filtrosTemp, marca_id: id || '' })}
                placeholder="Marca..."
                allowCreate={false}
              />
            </div>

            <div className="col-span-1 flex items-center gap-2 bg-gray-900/50 px-2 py-1.5 rounded-lg border border-gray-700">
              <input
                type="checkbox"
                id="incluir_desactivados"
                checked={filtrosTemp.incluir_desactivados}
                onChange={(e) =>
                  setFiltrosTemp({ ...filtrosTemp, incluir_desactivados: e.target.checked })
                }
                className="w-3.5 h-3.5 bg-gray-700 border-gray-600 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="incluir_desactivados" className="text-xs font-medium text-gray-300 cursor-pointer select-none">
                Mostrar desactivados
              </label>
            </div>

            <div className="col-span-full flex justify-end gap-2 mt-1">
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
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Ítems</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {total}
          </span>
        </div>

        <div ref={tableRef} className="overflow-x-auto min-h-[380px] pb-4 rounded-b-xl" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Producto</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">SKU</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Tipo</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Stock</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Precio</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Categoría</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {productos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-400">
                    <Box className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron productos.</p>
                  </td>
                </tr>
              ) : (
                productos.map((p) => {
                  const stock = parseFloat(p.stock_actual) || 0;
                  const min = parseFloat(p.stock_minimo) || 0;
                  let stockDisplay = '';
                  if (stock <= 0) {
                    stockDisplay = <span className="text-rose-400 font-bold flex items-center gap-1"><XCircle size={14} /> 0 Agotado</span>;
                  } else if (stock <= min) {
                    stockDisplay = <span className="text-amber-400 font-bold flex items-center gap-1"><AlertTriangle size={14} /> {stock} Reorden</span>;
                  } else {
                    stockDisplay = <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> {stock}</span>;
                  }
                  return (
                    <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-2 py-1 text-white font-semibold whitespace-nowrap">{p.nombre}</td>
                      <td className="px-2 py-1 text-gray-300 font-mono whitespace-nowrap">
                        {p.codigo_sku ? <span className="bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-700">{p.codigo_sku}</span> : <span className="text-gray-500">-</span>}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                          p.tipo === 'Servicio'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {p.tipo || 'Producto'}
                        </span>
                        {p.es_kit && <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full">🧩</span>}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">{stockDisplay}</td>
                      <td className="px-2 py-1 text-emerald-400 font-mono font-bold whitespace-nowrap">${parseFloat(p.precio_unitario || 0).toFixed(2)}</td>
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap">
                        {p.categoria_nombre ? <span className="flex items-center gap-1"><Tag size={12} className="text-purple-400" /> {p.categoria_nombre}</span> : <span className="text-gray-500">-</span>}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        {p.activo === 1 ? (
                          <span className="text-emerald-400 font-semibold">Activo</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">Desactivado</span>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {p.activo === 1 ? (
                            <>
                              <button
                                onClick={() => handleEditarProducto(p)}
                                title="Editar producto"
                                className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded text-xs font-semibold transition"
                              >
                                <Edit3 size={14} />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.nombre)}
                                title="Desactivar producto"
                                className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded text-xs font-semibold transition"
                              >
                                <Trash2 size={14} />
                                <span>Desactivar</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleReactivar(p.id, p.nombre)}
                              title="Reactivar producto"
                              className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-xs font-semibold transition"
                            >
                              <RotateCcw size={14} />
                              <span>Activar</span>
                            </button>
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
      <ProductoForm
        isOpen={showProductoForm}
        onClose={() => { setShowProductoForm(false); setSelectedProducto(null); }}
        onSuccess={loadData}
        producto={selectedProducto}
        categorias={categorias}
        marcas={marcas}
        onCategoriaCreated={(newCat) => setCategorias([...categorias, newCat])}
        onMarcaCreated={(newMarca) => setMarcas([...marcas, newMarca])}
      />

      <KitForm
        isOpen={showKitForm}
        onClose={() => { setShowKitForm(false); setSelectedProducto(null); }}
        onSuccess={loadData}
        producto={selectedProducto}
        productos={productos}
        categorias={categorias}
        marcas={marcas}
        onCategoriaCreated={(newCat) => setCategorias([...categorias, newCat])}
        onMarcaCreated={(newMarca) => setMarcas([...marcas, newMarca])}
      />

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

export default Productos;