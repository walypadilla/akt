// frontend/src/pages/superadmin/SuperAdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { getSuperAdminDashboard, getConsumoGlobal } from '../../api/dashboard';
import {
  registrarPagoMembresia,
  registrarGastoSaaS,
  generarFacturaMembresia,
} from '../../api/superadminInvoices';
import { getOrganizations } from '../../api/organizations';
import { getProductos } from '../../api/productos';
import KPICards from '../../components/common/KPICards';
import TopClientsTable from '../../components/common/TopClientsTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

const COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];

const SuperAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [consumoData, setConsumoData] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('all');

  // Estado para productos en el modal de factura
  const [productosSeleccionados, setProductosSeleccionados] = useState([
    { producto_id: '', cantidad: 1, precio: 0 }
  ]);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // Filtros
  const [filtros, setFiltros] = useState({
    periodo: 'mes',
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // ========== CARGAR DATOS ==========
  const loadOrganizations = async () => {
    try {
      const data = await getOrganizations();
      setOrganizations(data || []);
    } catch (err) {
      toast.error('Error al cargar organizaciones');
    }
  };

  const loadProductos = async () => {
    try {
      const data = await getProductos({ limit: 99999 });
      // getProductos devuelve { productos: [], paginacion: {...} }
      const productos = Array.isArray(data) ? data : data.productos || [];
      setProductosDisponibles(productos);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductosDisponibles([]);
    }
  };

  const refreshDashboard = () => {
    fetchData(filtros.periodo, filtros.anio, filtros.mes);
    loadConsumoGlobal(filtros.anio);
    toast.info('Dashboard actualizado');
  };

  const fetchData = async (periodo, anio, mes) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSuperAdminDashboard(periodo, anio, mes);
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Error al cargar dashboard');
      toast.error('Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadConsumoGlobal = async (anio) => {
    try {
      const data = await getConsumoGlobal({ anio: anio || filtros.anio });
      setConsumoData(data || []);
    } catch (error) {
      console.error('Error cargando consumo global:', error);
      setConsumoData([]);
    }
  };

  // Cargar productos al abrir el modal de factura
  useEffect(() => {
    if (modalOpen && modalType === 'factura') {
      loadProductos();
    }
  }, [modalOpen, modalType]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchData(filtros.periodo, filtros.anio, filtros.mes);
    loadOrganizations();
    loadConsumoGlobal(filtros.anio);
  }, []);

  useEffect(() => {
    loadConsumoGlobal(filtros.anio);
  }, [filtros.anio]);

  // ========== FUNCIONES DE PRODUCTOS DINÁMICOS ==========
  const agregarProducto = () => {
    setProductosSeleccionados([...productosSeleccionados, { producto_id: '', cantidad: 1, precio: 0 }]);
  };

  const eliminarProducto = (index) => {
    if (productosSeleccionados.length === 1) return;
    const nuevos = productosSeleccionados.filter((_, i) => i !== index);
    setProductosSeleccionados(nuevos);
  };

  const actualizarProducto = (index, field, value) => {
    const nuevos = [...productosSeleccionados];
    nuevos[index][field] = value;
    if (field === 'producto_id') {
      const producto = productosDisponibles.find(p => p.id == value);
      nuevos[index].precio = producto ? parseFloat(producto.precio_unitario) : 0;
    }
    setProductosSeleccionados(nuevos);
  };

  // ========== HANDLERS ==========
  const aplicarFiltros = () => {
    fetchData(filtros.periodo, filtros.anio, filtros.mes);
    loadConsumoGlobal(filtros.anio);
    toast.info(`Filtros aplicados: ${filtros.periodo} - ${filtros.anio}${filtros.mes ? ` - Mes ${filtros.mes}` : ''}`);
  };

  const cambiarPeriodo = (nuevoPeriodo) => {
    setFiltros((prev) => ({ ...prev, periodo: nuevoPeriodo }));
  };

  // Registrar Pago (sin factura)
  const handleRegistrarPago = async (data) => {
    try {
      await registrarPagoMembresia(data);
      toast.success('Pago directo registrado');
      setModalOpen(false);
      reset();
      refreshDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar pago');
    }
  };

  // Registrar Gasto
  const handleRegistrarGasto = async (data) => {
    try {
      await registrarGastoSaaS(data);
      toast.success('Gasto registrado');
      setModalOpen(false);
      reset();
      refreshDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar gasto');
    }
  };

  // ========== GENERAR FACTURA ==========
  const handleGenerarFactura = async (data) => {
    const detalles = productosSeleccionados
      .filter(p => p.producto_id)
      .map(p => ({
        producto_id: parseInt(p.producto_id),
        cantidad: parseInt(p.cantidad) || 1,
        precio_unitario: parseFloat(p.precio) || 0,
      }));

    if (detalles.length === 0) {
      toast.warning('Debe seleccionar al menos un producto');
      return;
    }

    const total = detalles.reduce((acc, d) => acc + (d.precio_unitario * d.cantidad), 0);
    const orgNombre = organizations.find(o => o.id == data.organizacion_id)?.nombre_empresa || 'Organización';

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Factura',
      message: `¿Generar factura por $${total.toFixed(2)} para "${orgNombre}"?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        const payload = {
          organizacion_id: parseInt(data.organizacion_id),
          detalles: detalles
        };
        try {
          const response = await generarFacturaMembresia(payload);
          if (!response || !response.numero_correlativo) {
            throw new Error('Respuesta del servidor inválida');
          }
          toast.success(`✅ Factura generada: ${response.numero_correlativo} - $${parseFloat(response.total).toFixed(2)}`);
          setModalOpen(false);
          reset();
          setProductosSeleccionados([{ producto_id: '', cantidad: 1, precio: 0 }]);
          refreshDashboard();
        } catch (err) {
          const mensajeError = err.response?.data?.message || err.message || 'Error al generar factura';
          toast.error(`❌ ${mensajeError}`);
        }
      }
    });
  };

  // ========== PREPARAR DATOS PARA GRÁFICAS ==========
  const organizaciones = [...new Set(consumoData.map(d => d.organizacion_id))];
  const orgNames = {};
  consumoData.forEach(d => {
    orgNames[d.organizacion_id] = d.nombre_empresa;
  });

  const filteredData = selectedOrg === 'all'
    ? consumoData
    : consumoData.filter(d => d.organizacion_id === parseInt(selectedOrg));

  const lineData = selectedOrg === 'all'
    ? organizaciones.map(orgId => ({
        name: orgNames[orgId] || `Org ${orgId}`,
        data: consumoData.filter(d => d.organizacion_id === orgId)
      }))
    : [{
        name: orgNames[selectedOrg] || `Org ${selectedOrg}`,
        data: filteredData
      }];

  // ========== RENDER ==========
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={aplicarFiltros} />;

  const { periodo, kpis, datosMensuales, datosDiarios, topOrganizaciones } = dashboardData || {};
  const isPeriodoMes = filtros.periodo === 'mes';
  const chartData = isPeriodoMes ? (datosDiarios || []) : (datosMensuales || []);
  const chartXKey = isPeriodoMes ? 'dia' : 'mes';

  return (
    <div className="p-6">
      {/* Header con botones */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Panel de SuperAdmin</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-800/90 p-1 rounded-lg border border-gray-700">
            {['mes', '6meses', 'trimestre', 'anual'].map((p) => (
              <button
                key={p}
                onClick={() => cambiarPeriodo(p)}
                className={`px-3 py-1 rounded text-sm transition ${
                  filtros.periodo === p ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p === 'mes' ? 'Mes' : p === '6meses' ? '6 Meses' : p === 'trimestre' ? '3 Meses' : 'Año'}
              </button>
            ))}
          </div>
          <select
            value={filtros.anio}
            onChange={(e) => setFiltros({ ...filtros, anio: parseInt(e.target.value) })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {filtros.periodo === 'mes' && (
            <select
              value={filtros.mes}
              onChange={(e) => setFiltros({ ...filtros, mes: parseInt(e.target.value) })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
                </option>
              ))}
            </select>
          )}
          <button onClick={aplicarFiltros} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition">
            Filtrar
          </button>
          <button onClick={() => { setModalType('pago'); setModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition">
            + Registrar Pago
          </button>
          <button onClick={() => { setModalType('gasto'); setModalOpen(true); }} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition">
            + Registrar Gasto
          </button>
          <button onClick={() => { setModalType('factura'); setModalOpen(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition">
            + Emitir Membresía
          </button>
        </div>
      </div>

      {/* KPIs */}
      <KPICards kpis={kpis} title="Métricas Globales" periodoInfo={periodo || { tipo: filtros.periodo, label: `Periodo seleccionado` }} />

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">
            {isPeriodoMes ? 'Ventas vs Gastos (diario)' : 'Ventas vs Gastos por mes'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={chartXKey} stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
              <Bar dataKey="ventas" fill="#8b5cf6" name="Ventas" />
              <Bar dataKey="gastos" fill="#f43f5e" name="Gastos" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">
            {isPeriodoMes ? 'Tendencia diaria' : 'Tendencia mensual'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={chartXKey} stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
              <Line type="monotone" dataKey="ventas" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} name="Ventas" />
              <Line type="monotone" dataKey="gastos" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e' }} name="Gastos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Consumo mensual por organización (gráfica de líneas) */}
      {consumoData.length > 0 && (
        <div className="mt-6 bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-200">📊 Consumo Mensual por Organización</h3>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm"
            >
              <option value="all">Todas</option>
              {organizaciones.map(id => (
                <option key={id} value={id}>{orgNames[id] || `Org ${id}`}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
              {lineData.map((line, idx) => (
                <React.Fragment key={idx}>
                  <Line
                    type="monotone"
                    dataKey="facturas_generadas"
                    data={line.data}
                    stroke={COLORS[idx % COLORS.length]}
                    name={`${line.name} (Facturas)`}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="whatsapp_enviados"
                    data={line.data}
                    stroke={COLORS[(idx + 2) % COLORS.length]}
                    name={`${line.name} (WhatsApp)`}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    strokeDasharray="5 5"
                  />
                </React.Fragment>
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">Línea sólida = Facturas generadas | Línea punteada = WhatsApp enviados</p>
        </div>
      )}

      {/* Top organizaciones */}
      <div className="mt-6">
        <TopClientsTable clients={topOrganizaciones} title={`Top Organizaciones por Facturación (${periodo?.label || 'periodo seleccionado'})`} />
      </div>

      {/* ========== MODALES ========== */}

      {/* Registrar Pago (sin factura) */}
      {modalOpen && modalType === 'pago' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Registrar Pago Directo</h3>
            <p className="text-sm text-gray-400 mb-4">Registra un ingreso sin factura (ej. pago atrasado, ingreso extra).</p>
            <form onSubmit={handleSubmit(handleRegistrarPago)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción *</label>
                <input
                  {...register('descripcion', { required: true })}
                  type="text"
                  placeholder="Ej. Pago atrasado de julio"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Monto *</label>
                <input
                  {...register('monto', { required: true, min: 0.01 })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Mes *</label>
                  <select
                    {...register('mes_pagado', { required: true })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{new Date(2024, m-1).toLocaleString('es', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Año *</label>
                  <select
                    {...register('anio_pagado', { required: true })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[2024, 2025, 2026, 2027].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); reset(); }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registrar Gasto */}
      {modalOpen && modalType === 'gasto' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Registrar Gasto</h3>
            <form onSubmit={handleSubmit(handleRegistrarGasto)} className="space-y-4">
              <input {...register('proveedor', { required: true })} placeholder="Proveedor" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <input {...register('monto', { required: true, min: 0.01 })} type="number" step="0.01" placeholder="Monto" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <input {...register('descripcion')} placeholder="Descripción" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <input {...register('fecha_gasto', { required: true })} type="date" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); reset(); }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
                >
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emitir Factura (con múltiples productos) */}
      {modalOpen && modalType === 'factura' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-white mb-4">Emitir Factura de Membresía</h3>
            <p className="text-sm text-gray-400 mb-4">Selecciona los productos/servicios a facturar.</p>
            <form onSubmit={handleSubmit(handleGenerarFactura)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Organización *</label>
                <select
                  {...register('organizacion_id', { required: true })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seleccionar organización</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.nombre_empresa}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Productos / Conceptos</label>
                {productosSeleccionados.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <select
                      value={item.producto_id}
                      onChange={(e) => actualizarProducto(index, 'producto_id', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Seleccionar producto</option>
                      {Array.isArray(productosDisponibles) && productosDisponibles.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre} - ${parseFloat(p.precio_unitario).toFixed(2)}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => actualizarProducto(index, 'cantidad', parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-300 text-sm">und</span>
                    {productosSeleccionados.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarProducto(index)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={agregarProducto}
                  className="text-cyan-400 hover:text-cyan-300 text-sm transition"
                >
                  + Agregar otro producto
                </button>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    reset();
                    setProductosSeleccionados([{ producto_id: '', cantidad: 1, precio: 0 }]);
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Emitir Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL DE CONFIRMACIÓN ========== */}
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

export default SuperAdminDashboard;