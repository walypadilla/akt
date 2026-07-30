// frontend/src/components/common/DTEStatusPanel.jsx
import React, { useState, useEffect } from 'react';
import { getResumenDTE } from '../../api/invoices';
import { toast } from 'react-toastify';

const DTEStatusPanel = ({ isOpen, onClose }) => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getResumenDTE();
      setResumen(data);
    } catch (error) {
      toast.error('Error al cargar resumen DTE');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Estado de Facturas DTE</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Resumen KPIs */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                  <p className="text-gray-400 text-sm">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-400">{resumen?.pendientes || 0}</p>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                  <p className="text-gray-400 text-sm">Enviados</p>
                  <p className="text-2xl font-bold text-blue-400">{resumen?.enviados || 0}</p>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                  <p className="text-gray-400 text-sm">Procesados</p>
                  <p className="text-2xl font-bold text-emerald-400">{resumen?.procesados || 0}</p>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                  <p className="text-gray-400 text-sm">Rechazados</p>
                  <p className="text-2xl font-bold text-rose-400">{resumen?.rechazados || 0}</p>
                </div>
              </div>

              {/* Tabla de detalles */}
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-400">Factura</th>
                      <th className="px-3 py-2 text-left text-gray-400">Cliente</th>
                      <th className="px-3 py-2 text-left text-gray-400">Fecha</th>
                      <th className="px-3 py-2 text-left text-gray-400">Estado</th>
                      <th className="px-3 py-2 text-left text-gray-400">Código</th>
                      <th className="px-3 py-2 text-left text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60">
                    {resumen?.detalles?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-3 py-4 text-center text-gray-400">
                          No hay facturas procesadas o rechazadas
                        </td>
                      </tr>
                    ) : (
                      resumen?.detalles?.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-700/20">
                          <td className="px-3 py-2 text-white font-semibold">{f.numero_correlativo}</td>
                          <td className="px-3 py-2 text-gray-300">{f.cliente_nombre || 'N/A'}</td>
                          <td className="px-3 py-2 text-gray-300">
                            {f.fecha_transmision ? new Date(f.fecha_transmision).toLocaleDateString('es-SV') : '-'}
                          </td>
                          <td className="px-3 py-2">
                            {f.estado_dte === 'procesado' ? (
                              <span className="text-emerald-400 font-semibold">Procesado</span>
                            ) : (
                              <span className="text-rose-400 font-semibold">Rechazado</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-300 font-mono text-xs">
                            {f.codigo_generacion || '-'}
                          </td>
                          <td className="px-3 py-2">
                            {f.errores_dte && (
                              <button
                                onClick={() => setSelectedError(f)}
                                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded text-xs font-semibold transition"
                              >
                                Ver error
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de errores */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-60 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[80vh] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                Errores - {selectedError.numero_correlativo}
              </h3>
              <button onClick={() => setSelectedError(null)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 overflow-y-auto max-h-[60vh]">
              <pre className="text-xs text-rose-300 whitespace-pre-wrap font-mono">
                {typeof selectedError.errores_dte === 'string' 
                  ? JSON.stringify(JSON.parse(selectedError.errores_dte), null, 2)
                  : JSON.stringify(selectedError.errores_dte, null, 2)
                }
              </pre>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DTEStatusPanel;