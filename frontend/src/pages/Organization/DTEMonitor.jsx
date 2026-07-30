// frontend/src/pages/organization/DTEMonitor.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonitorDTE, enviarFacturaMH } from '../../api/invoices';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, Send, FileText, Search, X } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const statusColors = {
  'pendiente': 'bg-gray-700 text-gray-300',
  'firmado': 'bg-blue-900/50 text-blue-400',
  'enviado': 'bg-purple-900/50 text-purple-400',
  'procesado': 'bg-emerald-900/50 text-emerald-400',
  'rechazado': 'bg-red-900/50 text-red-400',
};

const statusLabels = {
  'pendiente': 'Pendiente',
  'firmado': 'Firmado',
  'enviado': 'Enviado',
  'procesado': 'Sellada ✓',
  'rechazado': 'Rechazada',
};

const statusIcons = {
  'pendiente': <Clock size={16} className="text-gray-400" />,
  'firmado': <FileText size={16} className="text-blue-400" />,
  'enviado': <Send size={16} className="text-purple-400" />,
  'procesado': <CheckCircle size={16} className="text-emerald-400" />,
  'rechazado': <XCircle size={16} className="text-red-400" />,
};

const DTEMonitor = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [buscar, setBuscar] = useState('');
  const [buscarTemp, setBuscarTemp] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado_dte', filtroEstado);
      if (filtroMes) params.append('mes', filtroMes);
      if (filtroAnio) params.append('anio', filtroAnio);
      if (buscar) params.append('buscar', buscar);
      const resultado = await getMonitorDTE(params.toString());
      setData(resultado);
    } catch (err) {
      setError(err.message || 'Error al cargar monitor DTE');
      toast.error('Error al cargar monitor DTE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroMes, filtroAnio, buscar]);

  const handleRegresar = () => {
    navigate('/facturas');
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    setBuscar(buscarTemp);
  };

  const limpiarBusqueda = () => {
    setBuscarTemp('');
    setBuscar('');
  };

  // ============================================================
  // ENVIAR AL MH (DESDE EL MONITOR)
  // ============================================================
  const handleEnviarMH = async (id, numero) => {
    setConfirmModal({
      isOpen: true,
      title: 'Enviar al Ministerio de Hacienda',
      message: `¿Está seguro de enviar la factura N° ${numero} al MH?`,
      onConfirm: async () => {
        try {
          const response = await enviarFacturaMH(id);
          toast.success('Factura enviada al MH');
          if (response.selloRecepcion) {
            toast.success(`Sello de recepción: ${response.selloRecepcion}`);
          }
          cargarDatos(); // Recargar el monitor
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al enviar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={cargarDatos} />;

  const { facturas = [], estadisticas = {} } = data || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={handleRegresar}
            className="text-gray-400 hover:text-white transition"
            title="Volver a facturas"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-purple-400" /> Monitor de DTE
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarDatos}
            className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs / Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Total</p>
          <p className="text-2xl font-bold text-white">{estadisticas.total || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Pendientes</p>
          <p className="text-2xl font-bold text-gray-400">{estadisticas.pendientes || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Enviados</p>
          <p className="text-2xl font-bold text-purple-400">{estadisticas.enviados || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Selladas</p>
          <p className="text-2xl font-bold text-emerald-400">{estadisticas.procesados || 0}</p>
        </div>
        <div className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400">Rechazadas</p>
          <p className="text-2xl font-bold text-red-400">{estadisticas.rechazados || 0}</p>
        </div>
        <div 
          className="bg-gray-800/90 p-4 rounded-xl shadow-lg border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition"
          onClick={() => setFiltroEstado('rechazado')}
        >
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" /> Con Errores
          </p>
          <p className="text-2xl font-bold text-amber-400">{estadisticas.conErrores || 0}</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="firmado">Firmado</option>
            <option value="enviado">Enviado</option>
            <option value="procesado">Sellada</option>
            <option value="rechazado">Rechazada</option>
          </select>

          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="px-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}</option>
            ))}
          </select>

          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[2024, 2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <form onSubmit={handleBuscar} className="flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar N° o cliente..."
                value={buscarTemp}
                onChange={(e) => setBuscarTemp(e.target.value)}
                className="pl-8 pr-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-48 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition"
            >
              Buscar
            </button>
            {buscar && (
              <button
                type="button"
                onClick={limpiarBusqueda}
                className="px-2 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {(filtroEstado || filtroMes) && (
            <button
              onClick={() => {
                setFiltroEstado('');
                setFiltroMes('');
              }}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <X size={14} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Registro de Transmisiones DTE</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {facturas.length}
          </span>
        </div>

        <div className="overflow-x-auto" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">N°</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Cliente</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Total</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Estado DTE</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Código Generación</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Fecha Transmisión</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Errores / Detalle</th>
                <th className="px-2 py-2 text-center font-bold text-gray-300 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No hay facturas para mostrar.</p>
                  </td>
                </tr>
              ) : (
                facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-2 py-1.5 text-white font-semibold whitespace-nowrap">{f.numero_correlativo}</td>
                    <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">{f.cliente_nombre || 'N/A'}</td>
                    <td className="px-2 py-1.5 text-emerald-400 font-bold whitespace-nowrap">${parseFloat(f.total_pagar).toFixed(2)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${statusColors[f.estado_dte] || 'bg-gray-700 text-gray-300'}`}>
                        {statusIcons[f.estado_dte]}
                        {statusLabels[f.estado_dte] || f.estado_dte || 'Desconocido'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-300 font-mono text-xs whitespace-nowrap max-w-[120px] truncate">
                      {f.codigo_generacion || '-'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">
                      {f.fecha_transmision ? new Date(f.fecha_transmision).toLocaleString('es-SV') : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-300 max-w-[300px]">
                      {f.estado_dte === 'rechazado' && f.errores ? (
                        <div className="text-red-400 text-xs">
                          <span className="font-semibold">❌ Error:</span>
                          <span className="block whitespace-pre-wrap break-words mt-0.5 bg-red-950/30 p-1 rounded">
                            {typeof f.errores === 'string' ? f.errores : JSON.stringify(f.errores)}
                          </span>
                        </div>
                      ) : f.estado_dte === 'procesado' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={12} /> Sello: {f.sello_recepcion?.slice(0, 20)}...
                        </span>
                      ) : f.estado_dte === 'enviado' ? (
                        <span className="text-purple-400 flex items-center gap-1">
                          <Send size={12} /> Enviado, esperando respuesta...
                        </span>
                      ) : f.estado_dte === 'firmado' ? (
                        <span className="text-blue-400 flex items-center gap-1">
                          <FileText size={12} /> Firmado, pendiente de envío
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {/* Botón de enviar al MH - visible para pendientes, firmados y enviados (no procesados ni rechazados) */}
                      {f.estado_dte !== 'procesado' && f.estado_dte !== 'rechazado' && (
                        <button
                          onClick={() => handleEnviarMH(f.id, f.numero_correlativo)}
                          disabled={f.estado_dte === 'enviado'}
                          title={f.estado_dte === 'enviado' ? 'Ya fue enviado, esperando respuesta...' : 'Enviar al Ministerio de Hacienda'}
                          className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                            f.estado_dte === 'enviado'
                              ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-600'
                              : 'bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30'
                          }`}
                        >
                          <Send size={12} />
                          {f.estado_dte === 'enviado' ? 'Enviando...' : 'Enviar'}
                        </button>
                      )}
                      {/* Botón de reintentar para rechazadas */}
                      {f.estado_dte === 'rechazado' && (
                        <button
                          onClick={() => handleEnviarMH(f.id, f.numero_correlativo)}
                          title="Reintentar envío después de corregir los errores"
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <RefreshCw size={12} /> Reintentar
                        </button>
                      )}
                      {f.estado_dte === 'procesado' && (
                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                          <CheckCircle size={12} /> Completado
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

export default DTEMonitor;