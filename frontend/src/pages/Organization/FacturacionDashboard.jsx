// frontend/src/pages/organization/FacturacionDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  getDashboardFacturacion,
  exportarEvolucionVentas,
  exportarComparacionPagos,
  exportarTopClientes
} from '../../api/invoices';
import { Users, AlertCircle, CreditCard, Download } from 'lucide-react';
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
  Cell,
} from 'recharts';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4'];

const FacturacionDashboard = ({ mes, anio, onAlertClick }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (mes) params.mes = mes;
      if (anio) params.anio = anio;
      const data = await getDashboardFacturacion(params).catch(() => null);
      setDashboard(data);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleExportarEvolucion = async () => {
    try {
      const params = new URLSearchParams({ anio: anio || new Date().getFullYear() });
      const blob = await exportarEvolucionVentas(params.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evolucion_ventas_${anio}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Evolución de ventas exportada');
    } catch (err) {
      toast.error('Error al exportar evolución');
    }
  };

  const handleExportarComparacionPagos = async () => {
    try {
      const params = new URLSearchParams({ anio: anio || new Date().getFullYear() });
      const blob = await exportarComparacionPagos(params.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparacion_pagos_${anio}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Comparación de pagos exportada');
    } catch (err) {
      toast.error('Error al exportar comparación');
    }
  };

  const handleExportarTopClientes = async () => {
    try {
      const params = new URLSearchParams({ anio: anio || new Date().getFullYear() });
      const blob = await exportarTopClientes(params.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `top_clientes_${anio}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Top clientes exportado');
    } catch (err) {
      toast.error('Error al exportar top clientes');
    }
  };

  if (loading) {
    return (
      <div className="py-8 bg-gray-800/40 rounded-xl border border-gray-700/50 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!dashboard) return null;

  const { kpis, evolucion, comparacionPagos, alertas, topClientes } = dashboard;

  const evolucionData = (evolucion || []).map((item) => ({
    mes: new Date(2024, item.mes - 1).toLocaleString('es', { month: 'short' }),
    'Total Ventas': item.total_ventas,
    Contado: item.ventas_contado,
    Crédito: item.ventas_credito,
    Pagadas: item.ventas_pagadas,
  }));

  const comparacionData = (comparacionPagos || []).map((item) => ({
    mes: new Date(2024, item.mes - 1).toLocaleString('es', { month: 'short' }),
    Pagadas: item.pagadas,
    Pendientes: item.pendientes,
  }));

  const topClientesData = (topClientes || []).map((item) => ({
    name: item.cliente_nombre,
    total: parseFloat(item.total_compras),
    nit: item.cliente_nit || '',
  }));

  const totalVentas = kpis?.total_ventas || 0;
  const cuentasCobrar = kpis?.cuentas_por_cobrar || 0;
  const ivaRecaudado = kpis?.iva_recaudado || 0;
  const ventasMes = kpis?.ventas_mes || 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Total Ventas</p>
          <p className="text-2xl font-bold text-purple-400">${totalVentas.toFixed(2)}</p>
        </div>
        <div
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={onAlertClick}
        >
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" /> Cuentas por Cobrar
          </p>
          <p className="text-2xl font-bold text-amber-400">${cuentasCobrar.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">IVA Recaudado</p>
          <p className="text-2xl font-bold text-cyan-400">${ivaRecaudado.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Ventas del Mes</p>
          <p className="text-2xl font-bold text-emerald-400">${ventasMes.toFixed(2)}</p>
        </div>
      </div>

      {/* GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfica 1: Evolución de Ventas */}
        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-200">Evolución de Ventas ({anio})</h3>
            <button
              onClick={handleExportarEvolucion}
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
          {evolucionData.some((d) => d['Total Ventas'] > 0 || d.Contado > 0 || d.Crédito > 0 || d.Pagadas > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
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
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No hay datos de evolución</div>
          )}
        </div>

        {/* Gráfica 2: Pagadas vs Pendientes */}
        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-200">Pagadas vs Pendientes ({anio})</h3>
            <button
              onClick={handleExportarComparacionPagos}
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
          {comparacionData.some((d) => d.Pagadas > 0 || d.Pendientes > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
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
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No hay datos de comparación</div>
          )}
        </div>

        {/* Alertas de Vencimiento */}
        <div
          className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={onAlertClick}
        >
          <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" /> Alertas de Vencimiento (Próximos 7 días)
          </h3>
          {alertas && alertas.length > 0 ? (
            <div className="overflow-y-auto max-h-40">
              <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left text-gray-400">Cliente</th>
                    <th className="px-2 py-1 text-left text-gray-400">Monto</th>
                    <th className="px-2 py-1 text-left text-gray-400">Vence en</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {alertas.slice(0, 5).map((a, i) => {
                    const dias = Math.ceil((new Date(a.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                    let textoDias = `${dias} días`;
                    let color = 'text-emerald-400';
                    if (dias < 0) {
                      textoDias = `Vencida (hace ${Math.abs(dias)} d)`;
                      color = 'text-rose-600 font-bold';
                    } else if (dias === 0) {
                      textoDias = 'Vence hoy';
                      color = 'text-rose-500 font-bold';
                    } else if (dias <= 3) {
                      color = 'text-rose-400';
                    } else if (dias <= 7) {
                      color = 'text-amber-400';
                    }
                    return (
                      <tr key={i} className="hover:bg-gray-700/30">
                        <td className="px-2 py-1 text-gray-300">{a.cliente_nombre}</td>
                        <td className="px-2 py-1 text-emerald-400 font-bold">${parseFloat(a.total_pagar).toFixed(2)}</td>
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
            <p className="text-gray-400 text-sm">No hay alertas de vencimiento próximas</p>
          )}
        </div>

        {/* Gráfica 3: Top 5 Clientes */}
        <div className="bg-gray-800/90 p-3 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Top 5 Clientes
            </h3>
            <button
              onClick={handleExportarTopClientes}
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
          {topClientesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topClientesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={9} width={100} interval={0} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="total" fill="#8b5cf6" barSize={15}>
                  {topClientesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No hay datos de clientes</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacturacionDashboard;