// frontend/src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getDashboardData, getAñosDisponibles } from '../api';
import { toast } from 'react-toastify';

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#6b7280'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    ventasMes: 0,
    variacionMes: 0,
    cuentasCobrar: 0,
    gastosMes: 0,
    clientesActivos: 0,
    variacionClientes: 0,
    facturasHoy: 0,
    totalFacturas: 0,
    ticketPromedio: 0,
    tasaConversion: 0,
  });
  const [ventasPorMes, setVentasPorMes] = useState([]);
  const [estadoFacturas, setEstadoFacturas] = useState([]);
  const [ultimasFacturas, setUltimasFacturas] = useState([]);
  const [proximosVencimientos, setProximosVencimientos] = useState([]);
  const [periodo, setPeriodo] = useState('trimestre');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [añosDisponibles, setAñosDisponibles] = useState([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  // Obtener años disponibles con fallback seguro si la base de datos está vacía
  useEffect(() => {
    const fetchAños = async () => {
      try {
        const res = await getAñosDisponibles();
        if (res.data && res.data.length > 0) {
          setAñosDisponibles(res.data);
          if (!res.data.includes(new Date().getFullYear())) {
            setAnio(res.data[0]);
          }
        } else {
          setAñosDisponibles([new Date().getFullYear()]);
        }
      } catch (error) {
        console.error('Error al obtener años:', error);
        setAñosDisponibles([new Date().getFullYear()]);
      }
    };
    fetchAños();
  }, []);

  // Única función unificada para alimentar todo el Dashboard sin colisiones
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const res = await getDashboardData({ periodo, anio, mes });
      
      if (res.data) {
        setVentasPorMes(res.data.ventasPorMes || []);
        setEstadoFacturas(res.data.estadoFacturas || []);
        setUltimasFacturas(res.data.ultimasFacturas || []);
        setProximosVencimientos(res.data.proximosVencimientos || []);
        
        if (res.data.kpis) {
          setKpis(res.data.kpis);
        }
      }
    } catch (error) {
      console.error('Error general al cargar Dashboard:', error);
      toast.error('Error al cargar el panel: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [periodo, anio, mes]);

  const handleBuscar = () => {
    if (terminoBusqueda.trim() === '') return;
    navigate(`/facturas?search=${terminoBusqueda}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-gray-900 min-h-screen">
      {/* Header con buscador y filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Buscador */}
          <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <input
              type="text"
              placeholder="Buscar factura, cliente, mes..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
              className="px-4 py-2 bg-transparent outline-none text-white w-48 md:w-64"
            />
            <button
              onClick={handleBuscar}
              className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
            >
              🔍
            </button>
          </div>

          {/* Selector de Año */}
          <select
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value))}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            {añosDisponibles.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Selector de Mes */}
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
              </option>
            ))}
          </select>

          {/* Botones de periodo */}
          <div className="flex bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <button
              onClick={() => setPeriodo('trimestre')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                periodo === 'trimestre' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setPeriodo('semestre')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                periodo === 'semestre' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Semestre
            </button>
            <button
              onClick={() => setPeriodo('anual')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                periodo === 'anual' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Anual
            </button>
          </div>
        </div>
      </div>

      {/* KPIs - 5 tarjetas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Ventas del Mes</p>
              <p className="text-2xl font-bold text-white mt-1">${(kpis.ventasMes || 0).toFixed(2)}</p>
              <p className={`text-xs mt-1 ${kpis.variacionMes >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {kpis.variacionMes >= 0 ? '↑' : '↓'} {Math.abs(kpis.variacionMes || 0).toFixed(1)}% vs mes anterior
              </p>
            </div>
            <div className="bg-blue-900/50 p-3 rounded-full">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 1v1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Cuentas por Cobrar</p>
              <p className="text-2xl font-bold text-white mt-1">${(kpis.cuentasCobrar || 0).toFixed(2)}</p>
              <p className="text-xs text-yellow-400 mt-1">⏳ Pendientes de pago</p>
            </div>
            <div className="bg-yellow-900/50 p-3 rounded-full">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Gastos del Mes</p>
              <p className="text-2xl font-bold text-red-400 mt-1">${(kpis.gastosMes || 0).toFixed(2)}</p>
              <p className="text-xs text-red-400 mt-1">📉 Egresos del período</p>
            </div>
            <div className="bg-red-900/50 p-3 rounded-full">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Clientes Activos</p>
              <p className="text-2xl font-bold text-white mt-1">{kpis.clientesActivos}</p>
              <p className={`text-xs mt-1 ${kpis.variacionClientes >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {kpis.variacionClientes >= 0 ? '↑' : '↓'} {Math.abs(kpis.variacionClientes || 0).toFixed(1)}% vs mes anterior
              </p>
            </div>
            <div className="bg-purple-900/50 p-3 rounded-full">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Facturas Hoy</p>
              <p className="text-2xl font-bold text-white mt-1">{kpis.facturasHoy}</p>
              <p className="text-xs text-blue-400 mt-1">📊 Emitidas hoy</p>
            </div>
            <div className="bg-cyan-900/50 p-3 rounded-full">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs adicionales - 3 tarjetas extra */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-sm font-medium text-gray-400">Total Facturas</p>
          <p className="text-xl font-bold text-white">{kpis.totalFacturas}</p>
          <p className="text-xs text-gray-500 mt-1">En el período seleccionado</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-sm font-medium text-gray-400">Ticket Promedio</p>
          <p className="text-xl font-bold text-white">${(kpis.ticketPromedio || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Por cliente activo</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-sm font-medium text-gray-400">Tasa de Conversión</p>
          <p className="text-xl font-bold text-white">${(kpis.tasaConversion || 0).toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Facturas pagadas vs emitidas</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Ventas por Mes</h3>
          {ventasPorMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ventasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value) => [`$${value}`, 'Ventas']}
                />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Bar dataKey="total_ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No hay datos para mostrar</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Estado de Facturas</h3>
          {estadoFacturas.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={estadoFacturas}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {estadoFacturas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No hay facturas para mostrar</p>
          )}
        </div>
      </div>

      {/* Últimas Facturas y Próximos Vencimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Últimas Facturas Emitidas</h3>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {ultimasFacturas.length > 0 ? (
                  ultimasFacturas.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-white">{f.numero_correlativo}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{f.cliente_nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(f.creado_en).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">${f.total_pagar}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          f.estado === 'Pagada' ? 'bg-green-900/50 text-green-400' :
                          f.estado === 'Emitida' ? 'bg-yellow-900/50 text-yellow-400' :
                          f.estado === 'Anulada' ? 'bg-red-900/50 text-red-400' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {f.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="px-4 py-4 text-center text-gray-400">No hay facturas recientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Próximos Vencimientos</h3>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {proximosVencimientos.length > 0 ? (
                  proximosVencimientos.map((f) => {
                    const dias = Math.floor((new Date() - new Date(f.creado_en)) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={f.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-white">{f.numero_correlativo}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{f.cliente_nombre}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {new Date(f.creado_en).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">${f.total_pagar}</td>
                        <td className="px-4 py-3 text-sm text-red-400">{dias} días</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="5" className="px-4 py-4 text-center text-gray-400">No hay vencimientos próximos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;