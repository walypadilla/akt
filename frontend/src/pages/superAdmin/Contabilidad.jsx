// frontend/src/pages/superadmin/Contabilidad.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  obtenerContabilidadDetallada,
  obtenerDetalleIngresos,
  obtenerDetalleGastos,
} from '../../api/superadminReports';
import { cancelarGasto } from '../../api/superadminInvoices';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const Contabilidad = () => {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [contabilidad, setContabilidad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal detalle de mes
  const [detalleMesModal, setDetalleMesModal] = useState({
    open: false,
    mes: null,
    data: null,
  });

  // Modal ingresos
  const [ingresosModal, setIngresosModal] = useState({
    open: false,
    data: [],
    loading: false,
    page: 1,
    totalPages: 1,
    total: 0,
    filtroMes: '',
    filtroAnio: new Date().getFullYear(),
  });

  // Modal gastos
  const [gastosModal, setGastosModal] = useState({
    open: false,
    data: [],
    loading: false,
    page: 1,
    totalPages: 1,
    total: 0,
    filtroMes: '',
    filtroAnio: new Date().getFullYear(),
  });

  // Modal detalle de gasto
  const [detalleGastoModal, setDetalleGastoModal] = useState({
    open: false,
    gasto: null,
  });

  // Modal detalle de ingreso
  const [detalleIngresoModal, setDetalleIngresoModal] = useState({
    open: false,
    ingreso: null,
  });

  const loadContabilidad = useCallback(async (year) => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerContabilidadDetallada(year);
      setContabilidad(data);
    } catch (err) {
      setError(err.message || 'Error al cargar contabilidad');
      toast.error('Error al cargar contabilidad');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContabilidad(anio);
  }, [anio, loadContabilidad]);

  const handleExportExcel = () => {
    if (!contabilidad) return;
    const data = contabilidad.detalle.map((item) => ({
      Mes: item.nombre_mes,
      Ingresos: item.ingresos,
      'Detalle Ingresos': item.detalle_ingresos || 'Sin ingresos',
      Gastos: item.gastos,
      'Detalle Gastos': item.detalle_gastos || 'Sin gastos',
      Utilidad: item.utilidad,
    }));
    data.push({
      Mes: 'TOTALES',
      Ingresos: contabilidad.totales.ingresos,
      'Detalle Ingresos': '',
      Gastos: contabilidad.totales.gastos,
      'Detalle Gastos': '',
      Utilidad: contabilidad.totales.utilidad,
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contabilidad');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `Contabilidad_${anio}.xlsx`);
    toast.success('Excel exportado correctamente');
  };

  const handleAbrirDetalleMes = (item) => {
    setDetalleMesModal({
      open: true,
      mes: item,
      data: item,
    });
  };

  // ===== LOAD INGRESOS =====
  const loadIngresos = async (page = 1, filtroMes = '', filtroAnio = ingresosModal.filtroAnio) => {
    setIngresosModal((prev) => ({ ...prev, loading: true }));
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (filtroMes) {
        params.append('mes', filtroMes);
        params.append('anio', filtroAnio);
      } else if (filtroAnio) {
        params.append('anio', filtroAnio);
      }
      const data = await obtenerDetalleIngresos(params.toString());
      setIngresosModal({
        open: true,
        data: data.ingresos || [],
        loading: false,
        page: data.paginacion?.page || 1,
        totalPages: data.paginacion?.totalPages || 1,
        total: data.paginacion?.total || 0,
        filtroMes,
        filtroAnio,
      });
    } catch (err) {
      toast.error('Error al cargar ingresos');
      setIngresosModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // ===== LOAD GASTOS =====
  const loadGastos = async (page = 1, filtroMes = '', filtroAnio = gastosModal.filtroAnio) => {
    setGastosModal((prev) => ({ ...prev, loading: true }));
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (filtroMes) {
        params.append('mes', filtroMes);
        params.append('anio', filtroAnio);
      } else if (filtroAnio) {
        params.append('anio', filtroAnio);
      }
      const data = await obtenerDetalleGastos(params.toString());
      setGastosModal({
        open: true,
        data: data.gastos || [],
        loading: false,
        page: data.paginacion?.page || 1,
        totalPages: data.paginacion?.totalPages || 1,
        total: data.paginacion?.total || 0,
        filtroMes,
        filtroAnio,
      });
    } catch (err) {
      toast.error('Error al cargar gastos');
      setGastosModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCancelarGasto = async (id) => {
    if (!confirm('¿Cancelar este gasto?')) return;
    try {
      await cancelarGasto(id);
      toast.success('Gasto cancelado');
      loadContabilidad(anio);
      if (gastosModal.open) {
        loadGastos(gastosModal.page, gastosModal.filtroMes, gastosModal.filtroAnio);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cancelar');
    }
  };

  const handleVerDetalleGasto = (gasto) => {
    setDetalleGastoModal({ open: true, gasto });
  };

  const handleVerDetalleIngreso = (ingreso) => {
    setDetalleIngresoModal({ open: true, ingreso });
  };

  // Eliminar un ingreso directo (pago)
  const handleEliminarIngresoDirecto = async (id) => {
    if (!confirm('¿Eliminar este ingreso directo? Esta acción no se puede deshacer.')) return;
    try {
      await eliminarIngresoDirecto(id);
      toast.success('Ingreso eliminado');
      loadIngresos(ingresosModal.page, ingresosModal.filtroMes, ingresosModal.filtroAnio);
      loadContabilidad(anio);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => loadContabilidad(anio)} />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Contabilidad SaaS</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition">📊 Excel</button>
          <button onClick={() => loadIngresos(1, '', anio)} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition">Ver Ingresos</button>
          <button onClick={() => loadGastos(1, '', anio)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition">Ver Gastos</button>
        </div>
      </div>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/90 p-5 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Total Ingresos {anio}</p>
          <p className="text-2xl font-bold text-emerald-400">${(contabilidad?.totales?.ingresos || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/90 p-5 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Total Gastos {anio}</p>
          <p className="text-2xl font-bold text-rose-400">${(contabilidad?.totales?.gastos || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/90 p-5 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Utilidad Neta {anio}</p>
          <p className={`text-2xl font-bold ${(contabilidad?.totales?.utilidad || 0) >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
            ${(contabilidad?.totales?.utilidad || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabla mensual */}
      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ingresos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Gastos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Utilidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {contabilidad?.detalle?.map((item) => (
              <tr key={item.mes} className="hover:bg-gray-700/50 transition">
                <td className="px-6 py-4 text-gray-300 capitalize">{item.nombre_mes}</td>
                <td className="px-6 py-4 text-emerald-400">${item.ingresos.toFixed(2)}</td>
                <td className="px-6 py-4 text-rose-400">${item.gastos.toFixed(2)}</td>
                <td className={`px-6 py-4 ${item.utilidad >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
                  ${item.utilidad.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleAbrirDetalleMes(item)} className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded text-xs transition">
                    Ver Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========== MODALES ========== */}

      {/* Modal Detalle de Mes */}
      {detalleMesModal.open && detalleMesModal.data && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Detalle del mes: {detalleMesModal.data.nombre_mes}</h3>
              <button onClick={() => setDetalleMesModal({ open: false, mes: null, data: null })} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded text-white transition">Cerrar</button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded">
                <h4 className="font-semibold text-emerald-400 mb-2">📈 Ingresos: ${detalleMesModal.data.ingresos.toFixed(2)}</h4>
                <p className="text-sm text-gray-300">{detalleMesModal.data.detalle_ingresos || 'Sin ingresos'}</p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded">
                <h4 className="font-semibold text-rose-400 mb-2">📉 Gastos: ${detalleMesModal.data.gastos.toFixed(2)}</h4>
                <p className="text-sm text-gray-300">{detalleMesModal.data.detalle_gastos || 'Sin gastos'}</p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded">
                <h4 className={`font-semibold ${detalleMesModal.data.utilidad >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
                  💰 Utilidad: ${detalleMesModal.data.utilidad.toFixed(2)}
                </h4>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ingresos */}
      {ingresosModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[80vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📈 Listado de Ingresos</h3>
              <button onClick={() => setIngresosModal({ open: false, data: [], loading: false, page: 1, totalPages: 1, total: 0, filtroMes: '', filtroAnio: anio })} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded text-white transition">Cerrar</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <label className="text-sm text-gray-300">Filtrar por:</label>
              <select
                value={ingresosModal.filtroMes}
                onChange={(e) => loadIngresos(1, e.target.value, ingresosModal.filtroAnio)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todos los meses</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={ingresosModal.filtroAnio}
                onChange={(e) => loadIngresos(1, ingresosModal.filtroMes, parseInt(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[2024, 2025, 2026, 2027].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button
                onClick={() => loadIngresos(1, ingresosModal.filtroMes, ingresosModal.filtroAnio)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs transition"
              >
                Aplicar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {ingresosModal.loading ? (
                <LoadingSpinner />
              ) : ingresosModal.data.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay ingresos registrados.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Concepto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Origen</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Organización</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Monto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Factura</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {ingresosModal.data.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-2 text-sm text-gray-300">{new Date(item.fecha).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{item.concepto || 'Membresía'}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.origen === 'pago_directo' 
                              ? 'bg-blue-900/50 text-blue-400 border border-blue-700' 
                              : 'bg-green-900/50 text-green-400 border border-green-700'
                          }`}>
                            {item.origen === 'pago_directo' ? 'Pago directo' : 'Factura'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-300">{item.organizacion_nombre || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-emerald-400">${Number(item.monto).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{item.factura_numero || '-'}</td>
                        <td className="px-4 py-2 text-sm space-x-2">
                          {item.origen === 'pago_directo' && (
                            <button
                              onClick={() => handleEliminarIngresoDirecto(item.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-xs transition"
                            >
                              Eliminar
                            </button>
                          )}
                          {item.origen === 'factura' && (
                            <button
                              onClick={() => handleVerDetalleIngreso(item)}
                              className="bg-cyan-600 hover:bg-cyan-700 text-white px-2 py-1 rounded text-xs transition"
                            >
                              Ver Detalle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {ingresosModal.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: ingresosModal.totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => loadIngresos(p, ingresosModal.filtroMes, ingresosModal.filtroAnio)} className={`px-3 py-1 rounded ${p === ingresosModal.page ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">Total: {ingresosModal.total} registros</div>
          </div>
        </div>
      )}

      {/* Modal Gastos (igual que antes) */}
      {gastosModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[80vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📉 Listado de Gastos</h3>
              <button onClick={() => setGastosModal({ open: false, data: [], loading: false, page: 1, totalPages: 1, total: 0, filtroMes: '', filtroAnio: anio })} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded text-white transition">Cerrar</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <label className="text-sm text-gray-300">Filtrar por:</label>
              <select
                value={gastosModal.filtroMes}
                onChange={(e) => loadGastos(1, e.target.value, gastosModal.filtroAnio)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todos los meses</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={gastosModal.filtroAnio}
                onChange={(e) => loadGastos(1, gastosModal.filtroMes, parseInt(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[2024, 2025, 2026, 2027].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button
                onClick={() => loadGastos(1, gastosModal.filtroMes, gastosModal.filtroAnio)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs transition"
              >
                Aplicar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {gastosModal.loading ? (
                <LoadingSpinner />
              ) : gastosModal.data.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay gastos registrados.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Proveedor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Descripción</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Monto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {gastosModal.data.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-2 text-sm text-gray-300">{new Date(item.fecha).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{item.proveedor}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{item.descripcion || '-'}</td>
                        <td className="px-4 py-2 text-sm text-rose-400">${Number(item.monto).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm space-x-2">
                          <button onClick={() => handleVerDetalleGasto(item)} className="bg-cyan-600 hover:bg-cyan-700 text-white px-2 py-1 rounded text-xs transition">
                            Ver Detalle
                          </button>
                          <button onClick={() => handleCancelarGasto(item.id)} className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-xs transition">
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {gastosModal.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: gastosModal.totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => loadGastos(p, gastosModal.filtroMes, gastosModal.filtroAnio)} className={`px-3 py-1 rounded ${p === gastosModal.page ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">Total: {gastosModal.total} registros</div>
          </div>
        </div>
      )}

      {/* Modal Detalle de Gasto */}
      {detalleGastoModal.open && detalleGastoModal.gasto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Detalle del Gasto</h3>
              <button onClick={() => setDetalleGastoModal({ open: false, gasto: null })} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded text-white transition">Cerrar</button>
            </div>
            <div className="space-y-2 text-gray-300">
              <p><span className="font-semibold text-gray-400">Proveedor:</span> {detalleGastoModal.gasto.proveedor}</p>
              <p><span className="font-semibold text-gray-400">Monto:</span> <span className="text-rose-400">${Number(detalleGastoModal.gasto.monto).toFixed(2)}</span></p>
              <p><span className="font-semibold text-gray-400">Descripción:</span> {detalleGastoModal.gasto.descripcion || 'N/A'}</p>
              <p><span className="font-semibold text-gray-400">Fecha:</span> {new Date(detalleGastoModal.gasto.fecha).toLocaleDateString()}</p>
              <p><span className="font-semibold text-gray-400">ID:</span> {detalleGastoModal.gasto.id}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => handleCancelarGasto(detalleGastoModal.gasto.id)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded transition">
                Cancelar Gasto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle de Ingreso */}
      {detalleIngresoModal.open && detalleIngresoModal.ingreso && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Detalle del Ingreso</h3>
              <button onClick={() => setDetalleIngresoModal({ open: false, ingreso: null })} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded text-white transition">Cerrar</button>
            </div>
            <div className="space-y-2 text-gray-300">
              <p><span className="font-semibold text-gray-400">Origen:</span> {detalleIngresoModal.ingreso.origen === 'pago_directo' ? 'Pago directo' : 'Factura'}</p>
              {detalleIngresoModal.ingreso.origen === 'factura' && (
                <>
                  <p><span className="font-semibold text-gray-400">Organización:</span> {detalleIngresoModal.ingreso.organizacion_nombre || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-400">Factura:</span> {detalleIngresoModal.ingreso.factura_numero || 'N/A'}</p>
                </>
              )}
              <p><span className="font-semibold text-gray-400">Concepto:</span> {detalleIngresoModal.ingreso.concepto || 'Membresía'}</p>
              <p><span className="font-semibold text-gray-400">Monto:</span> <span className="text-emerald-400">${Number(detalleIngresoModal.ingreso.monto).toFixed(2)}</span></p>
              <p><span className="font-semibold text-gray-400">Fecha:</span> {new Date(detalleIngresoModal.ingreso.fecha).toLocaleDateString()}</p>
              <p><span className="font-semibold text-gray-400">Mes/Año:</span> {detalleIngresoModal.ingreso.mes_pagado}/{detalleIngresoModal.ingreso.anio_pagado}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contabilidad;