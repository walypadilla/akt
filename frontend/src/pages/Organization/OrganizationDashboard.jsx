// frontend/src/pages/organization/OrganizationDashboard.jsx
import React, { useEffect, useState } from 'react';
import { getOrganizationDashboard, getMiConsumo } from '../../api/organizationDashboard';
import { getDashboardFacturacion } from '../../api/invoices';
import KPICards from '../../components/common/KPICards';
import TopClientsTable from '../../components/common/TopClientsTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { toast } from 'react-toastify';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b'];

const OrganizationDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [facturacionData, setFacturacionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({
    periodo: 'mes',
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });

  const fetchData = async (periodo, anio, mes) => {
    setLoading(true);
    setError(null);
    try {
      const [orgData, factData] = await Promise.all([
        getOrganizationDashboard(periodo, anio, mes),
        getDashboardFacturacion({ anio, mes: mes || '' }),
      ]);
      setDashboardData(orgData);
      setFacturacionData(factData);
    } catch (err) {
      setError(err.message || 'Error al cargar dashboard');
      toast.error('Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  };
  const [consumo, setConsumo] = useState({ factura: { total: 0, limite: 40 }, whatsapp: { total: 0, limite: 200 } });

  useEffect(() => {
    fetchData(filtros.periodo, filtros.anio, filtros.mes);
  }, []);

  const aplicarFiltros = () => {
    fetchData(filtros.periodo, filtros.anio, filtros.mes);
    toast.info(`Filtros aplicados: ${filtros.periodo} - ${filtros.anio}${filtros.mes ? ` - Mes ${filtros.mes}` : ''}`);
  };

  useEffect(() => {
    const getConsumo = async () => {
      const data = await getMiConsumo();
      setConsumo(data);
    };
    getConsumo();
  }, []);

  const cambiarPeriodo = (nuevoPeriodo) => {
    setFiltros((prev) => ({ ...prev, periodo: nuevoPeriodo }));
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={aplicarFiltros} />;

  const { periodo, kpis, datosMensuales, datosDiarios, topClientes } = dashboardData || {};
  const isPeriodoMes = filtros.periodo === 'mes';
  const chartData = isPeriodoMes ? (datosDiarios || []) : (datosMensuales || []);
  const chartXKey = isPeriodoMes ? 'dia' : 'mes';

  // Datos para gráfica de distribución por tipo documento
  const distribucion = facturacionData?.distribucion || [];
  const pieData = distribucion.map(item => ({
    name: item.tipo_documento,
    value: parseFloat(item.total),
  }));

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Dashboard de Organización</h1>
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
        </div>
      </div>

      <KPICards kpis={kpis} title="Métricas de la Organización" periodoInfo={periodo || { tipo: filtros.periodo, label: `Periodo seleccionado` }} />

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
              <Bar dataKey="ingresos" fill="#8b5cf6" name="Ingresos" />
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
              <Line type="monotone" dataKey="ingresos" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} name="Ingresos" />
              <Line type="monotone" dataKey="gastos" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e' }} name="Gastos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribución por Tipo Documento */}
      {pieData.length > 0 && pieData.some(d => d.value > 0) && (
        <div className="mt-6 bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Distribución por Tipo Documento</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Facturas */}
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-300">📄 Facturas del mes</h4>
            <span className="text-xs text-gray-400">{consumo.factura.total} / {consumo.factura.limite}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                consumo.factura.total >= consumo.factura.limite ? 'bg-red-500' : 'bg-purple-600'
              }`} 
              style={{ width: `${Math.min((consumo.factura.total / consumo.factura.limite) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {consumo.factura.total >= consumo.factura.limite ? (
              <span className="text-red-400 font-bold">⚠️ Límite alcanzado</span>
            ) : (
              <span>Disponibles: {consumo.factura.limite - consumo.factura.total}</span>
            )}
          </p>
        </div>

        {/* WhatsApp - Solo mostrar si está activado */}
        {consumo.whatsapp.activado && (
          <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-gray-300">💬 WhatsApp del mes</h4>
              <span className="text-xs text-gray-400">{consumo.whatsapp.total} / {consumo.whatsapp.limite}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  consumo.whatsapp.total >= consumo.whatsapp.limite ? 'bg-red-500' : 'bg-cyan-600'
                }`} 
                style={{ width: `${Math.min((consumo.whatsapp.total / consumo.whatsapp.limite) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {consumo.whatsapp.total >= consumo.whatsapp.limite ? (
                <span className="text-red-400 font-bold">⚠️ Límite alcanzado</span>
              ) : (
                <span>Disponibles: {consumo.whatsapp.limite - consumo.whatsapp.total}</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <TopClientsTable clients={topClientes} title={`Top Clientes por Facturación (${periodo?.label || 'periodo seleccionado'})`} />
      </div>
    </div>
  );
};

export default OrganizationDashboard;