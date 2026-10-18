// frontend/src/components/common/clinica/CartillaModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X, Syringe, Printer, Link as LinkIcon, Check, Copy, AlertCircle,
  Download, Calendar, User, Package, FileText
} from 'lucide-react';
import {
  getCartillaPaciente,
  generarPDFCartilla,
  generarTokenCartilla,
} from '../../../api/clinica';
import LoadingSpinner from '../../common/LoadingSpinner';
import { toast } from 'react-toastify';

const CartillaModal = ({ paciente, onClose }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [token, setToken] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (paciente?.id) cargarCartilla();
  }, [paciente?.id]);

  const cargarCartilla = async () => {
    setLoading(true);
    try {
      const data = await getCartillaPaciente(paciente.id);
      setHistorial(data || []);
    } catch {
      toast.error('Error al cargar cartilla');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async () => {
    try {
        setGenerando(true);
        // Obtenemos el blob del PDF
        const blob = await generarPDFCartilla(paciente.id);
        const url = window.URL.createObjectURL(blob);
        
        // Lo abrimos en una nueva pestaña. El navegador mostrará el visor de PDF 
        // con su propio botón de impresión y descarga.
        const win = window.open(url, '_blank');
        
        if (!win) {
        toast.error('Permite las ventanas emergentes (pop-ups) para imprimir.');
        }
    } catch (err) {
        toast.error('Error al generar el documento');
    } finally {
        setGenerando(false);
    }
    };

  const handleGenerarToken = async () => {
    try {
      const data = await generarTokenCartilla(paciente.id);
      setToken(data);
      toast.success('Link generado. Válido 7 días.');
    } catch {
      toast.error('Error al generar link');
    }
  };

  const handleCopiarLink = async () => {
    if (!token?.link) return;
    try {
      await navigator.clipboard.writeText(token.link);
      setCopiado(true);
      toast.success('Link copiado');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const getSemaforoColor = (semaforo) => {
    const colores = {
      verde: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
      amarillo: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
      rojo: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
      gris: 'bg-gray-700/60 text-gray-400 border-gray-600',
    };
    return colores[semaforo] || colores.gris;
  };

  const getSemaforoEmoji = (semaforo) => {
    if (semaforo === 'verde') return '🟢';
    if (semaforo === 'amarillo') return '🟡';
    if (semaforo === 'rojo') return '🔴';
    return '⚪';
  };

  if (!paciente) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center">
              <Syringe size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Cartilla de Vacunación
              </h2>
              <p className="text-xs text-gray-400">
                {paciente.nombre} {paciente.apellidos || ''} · {paciente.especie || 'Paciente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <LoadingSpinner />
          ) : historial.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Syringe size={48} className="mx-auto mb-3 text-gray-600" />
              <p>No hay vacunas registradas para este paciente</p>
            </div>
          ) : (
            <>
              {/* Timeline de vacunas */}
              <div className="space-y-3">
                {historial.map((h) => (
                  <div
                    key={h.id}
                    className="bg-gray-700/30 border border-gray-600 rounded-lg p-3 hover:bg-gray-700/50 transition"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Syringe size={14} className="text-purple-400" />
                          <h4 className="font-semibold text-white">{h.vacuna_nombre}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold border ${getSemaforoColor(h.semaforo)}`}
                          >
                            {getSemaforoEmoji(h.semaforo)} {h.mensaje_semaforo}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400">
                          <div>
                            <span className="text-gray-500">Aplicada:</span>{' '}
                            <span className="text-white">
                              {new Date(h.fecha_aplicacion).toLocaleDateString('es-SV')}
                            </span>
                          </div>
                          {h.fecha_proxima && (
                            <div>
                              <span className="text-gray-500">Próxima:</span>{' '}
                              <span className="text-white">
                                {new Date(h.fecha_proxima).toLocaleDateString('es-SV')}
                              </span>
                            </div>
                          )}
                          {h.lote && (
                            <div>
                              <span className="text-gray-500">Lote:</span>{' '}
                              <span className="text-white font-mono">{h.lote}</span>
                            </div>
                          )}
                          {h.medico_nombre && (
                            <div>
                              <span className="text-gray-500">Médico:</span>{' '}
                              <span className="text-white">{h.medico_nombre}</span>
                            </div>
                          )}
                        </div>
                        {h.observaciones && (
                          <p className="text-xs text-gray-300 mt-2 italic">
                            "{h.observaciones}"
                          </p>
                        )}
                        {h.factura_numero && (
                          <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                            <FileText size={10} /> Facturada: {h.factura_numero} ({h.factura_estado})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Link público */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <LinkIcon size={14} className="text-purple-400" />
                  Compartir con el dueño
                </h4>
                {!token ? (
                  <button
                    onClick={handleGenerarToken}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition"
                  >
                    <LinkIcon size={12} /> Generar link temporal (7 días)
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-600 rounded-lg p-2">
                      <input
                        type="text"
                        value={token.link}
                        readOnly
                        className="flex-1 bg-transparent text-xs text-gray-300 outline-none font-mono"
                      />
                      <button
                        onClick={handleCopiarLink}
                        className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 rounded text-xs font-semibold transition flex items-center gap-1"
                      >
                        {copiado ? <Check size={12} /> : <Copy size={12} />}
                        {copiado ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      ⚠️ El link expira el{' '}
                      {new Date(token.expira_en).toLocaleDateString('es-SV')} a las{' '}
                      {new Date(token.expira_en).toLocaleTimeString('es-SV')}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 flex justify-end gap-2 bg-gray-800/80 flex-shrink-0">
          <button
            onClick={handleImprimir}
            disabled={generando || historial.length === 0}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition flex items-center gap-2 shadow-md shadow-cyan-900/30"
            >
            <Printer size={14} /> {/* Asegúrate de importar Printer de lucide-react */}
            {generando ? 'Generando...' : 'Imprimir Cartilla'}
        </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartillaModal;