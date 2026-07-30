// frontend/src/pages/organization/FacturacionDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  getDashboardFacturacion,
  getAniosDisponiblesFacturas,
  exportarFacturasFiltradas,
} from '../../api/facturas';
import { Calendar, DollarSign, Users, AlertCircle, Download } from 'lucide-react';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b'];

const FacturacionDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anios, setAnios] = useState([]);
  const [filtros, setFiltros] = useState({
    mes: '',
    anio: new Date().getFullYear(),
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);
      const data = await getDashboardFacturacion(params.toString());
      setDashboard(data);
    } catch (error) {
      toast.error('Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const loadAnios = async () => {
      try {
        const data = await getAniosDisponiblesFacturas();
        setAnios(data.length ? data : [new Date().getFullYear()]);
      } catch (error) {
        setAnios([new Date().getFullYear()]);
      }
    };
    loadAnios();
  }, []);

  const handleExportar = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);
      const blob = await exportarFacturasFiltradas(params.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_dashboard_${filtros.anio}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exportado');
    } catch (error) {
      toast.error('Error al exportar');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!dashboard) return <div className="text-gray-400">No hay datos</div>;

  const { kpis, evolucion, comparacionPagos, alertas, topClientes, distribucion } = dashboard;

  const evolucionData = evolucion.map(item => ({
    mes: new Date(2024, item.mes - 1).toLocaleString('es', { month: 'short' }),
    'Total Ventas': item.total_ventas,
    Contado: item.ventas_contado,
    Crédito: item.ventas_credito,
    Pagadas: item.ventas_pagadas,
  }));

  const comparacionData = comparacionPagos.map(item => ({
    mes: new Date(2024, item.mes - 1).toLocaleString('es', { month: 'short' }),
    Pagadas: item.pagadas,
    Pendientes: item.pendientes,
  }));

  const pieData = distribucion.map(item => ({
    name: item.tipo_documento,
    value: parseFloat(item.total),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-purple-400" /> Dashboard de Facturación
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-300 font-semibold">Año:</span>
            <select
              value={filtros.anio}
              onChange={(e) => setFiltros(prev => ({ ...prev, anio: parseInt(e.target.value) }))}
              className="bg-transparent border-none text-white text-sm font-bold focus:outline-none cursor-pointer"
            >
              {anios.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-300 font-semibold">Mes:</span>
            <select
              value={filtros.mes}
              onChange={(e) => setFiltros(prev => ({ ...prev, mes: e.target.value }))}
              className="bg-transparent border-none text-white text-sm font-bold focus:outline-none cursor-pointer"
            >
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportar}
            className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Total Ventas</p>
          <p className="text-2xl font-bold text-purple-400">${(kpis.total_ventas || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" /> Cuentas por Cobrar
          </p>
          <p className="text-2xl font-bold text-amber-400">${(kpis.cuentas_por_cobrar || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">IVA Recaudado</p>
          <p className="text-2xl font-bold text-cyan-400">${(kpis.iva_recaudado || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Ventas del Mes</p>
          <p className="text-2xl font-bold text-emerald-400">${(kpis.ventas_mes || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Evolución de Ventas ({filtros.anio})</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolucionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: '10px' }} />
              <Line type="monotone" dataKey="Total Ventas" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Contado" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Crédito" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Pagadas" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Pagadas vs Pendientes ({filtros.anio})</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparacionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: '#e5e7eb', fontSize: '10px' }} />
              <Bar dataKey="Pagadas" fill="#10b981" />
              <Bar dataKey="Pendientes" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Distribución por Tipo Documento</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', color: '#e5e7eb' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Top 5 Clientes
          </h3>
          {topClientes && topClientes.length > 0 ? (
            <div className="overflow-y-auto max-h-40">
              <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left text-gray-400">Cliente</th>
                    <th className="px-2 py-1 text-left text-gray-400">NIT</th>
                    <th className="px-2 py-1 text-left text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {topClientes.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-700/30">
                      <td className="px-2 py-1 text-gray-300">{c.cliente_nombre}</td>
                      <td className="px-2 py-1 text-gray-300 font-mono">{c.cliente_nit || '-'}</td>
                      <td className="px-2 py-1 text-emerald-400 font-bold">
                        ${parseFloat(c.total_compras).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos</p>
          )}
        </div>
      </div>

      {/* Alertas de Vencimiento */}
      <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" /> Alertas de Vencimiento (Próximos 5 días)
        </h3>
        {alertas && alertas.length > 0 ? (
          <div className="overflow-y-auto max-h-40">
            <table className="min-w-full divide-y divide-gray-700/80 text-xs">
              <thead className="bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left text-gray-400">Cliente</th>
                  <th className="px-2 py-1 text-left text-gray-400">N° Factura</th>
                  <th className="px-2 py-1 text-left text-gray-400">Total</th>
                  <th className="px-2 py-1 text-left text-gray-400">Vence en</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {alertas.map((a, i) => {
                  const dias = Math.ceil((new Date(a.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                  let texto = `${dias} días`;
                  let color = 'text-emerald-400';
                  if (dias < 0) {
                    texto = `Vencida (${Math.abs(dias)} d)`;
                    color = 'text-rose-600 font-bold';
                  } else if (dias === 0) {
                    texto = 'Hoy';
                    color = 'text-rose-500 font-bold';
                  } else if (dias <= 3) {
                    color = 'text-rose-400';
                  } else if (dias <= 5) {
                    color = 'text-amber-400';
                  }
                  return (
                    <tr key={i} className="hover:bg-gray-700/30">
                      <td className="px-2 py-1 text-gray-300">{a.cliente_nombre}</td>
                      <td className="px-2 py-1 text-gray-300">{a.numero_correlativo}</td>
                      <td className="px-2 py-1 text-emerald-400 font-bold">
                        ${parseFloat(a.total_pagar).toFixed(2)}
                      </td>
                      <td className={`px-2 py-1 font-semibold ${color}`}>{texto}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No hay alertas de vencimiento</p>
        )}
      </div>
    </div>
  );
};

export default FacturacionDashboard;