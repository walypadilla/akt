// frontend/src/components/common/clinica/VisorResultadoModal.jsx
import React, { useState } from 'react';
import {
  X, FileText, Download, ExternalLink, Image as ImageIcon, FileType,
  User, Calendar, Paperclip
} from 'lucide-react';
import { generarExamenPDF, buildFileUrl } from '../../../api/clinica';
import { toast } from 'react-toastify';

const VisorResultadoModal = ({ solicitud, onClose }) => {
  const [loadingPDF, setLoadingPDF] = useState(false);

  const handleDescargarPDF = async () => {
    try {
      setLoadingPDF(true);
      const blob = await generarExamenPDF(solicitud.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultado_${solicitud.examen_nombre.replace(/\s/g, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch {
      toast.error('Error al generar PDF');
    } finally {
      setLoadingPDF(false);
    }
  };

  if (!solicitud) return null;

  // ✅ ÚNICA declaración de variables — construir URL completa hacia el backend
  const archivoUrl = solicitud.resultado_archivo_url
    ? buildFileUrl(solicitud.resultado_archivo_url)
    : null;

  const esImagen = archivoUrl && /\.(jpg|jpeg|png|webp)$/i.test(archivoUrl);
  const esPDF = archivoUrl && /\.pdf$/i.test(archivoUrl);

  const fechaSolicitud = solicitud.fecha_solicitud
    ? new Date(solicitud.fecha_solicitud).toLocaleString('es-SV')
    : '-';

  const fechaResultado = solicitud.fecha_resultado
    ? new Date(solicitud.fecha_resultado).toLocaleString('es-SV')
    : '-';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* ============ HEADER ============ */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={20} className="text-purple-400" />
            Resultado: <span className="text-purple-300">{solicitud.examen_nombre}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* ============ CONTENIDO SCROLLABLE ============ */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Info paciente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gray-700/30 p-3 rounded-lg border border-gray-600">
            <div className="flex items-start gap-2">
              <User size={14} className="text-purple-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Paciente</p>
                <p className="text-white font-medium">
                  {solicitud.paciente_nombre} {solicitud.paciente_apellidos || ''}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-purple-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Fecha solicitud</p>
                <p className="text-white">{fechaSolicitud}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-purple-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Fecha resultado</p>
                <p className="text-white">{fechaResultado}</p>
              </div>
            </div>
          </div>

          {/* Resultados texto */}
          <div>
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText size={14} className="text-purple-400" />
              Hallazgos / Resultados
            </h3>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap font-mono min-h-[120px]">
              {solicitud.resultado_texto || (
                <span className="text-gray-500 italic">Sin resultados registrados</span>
              )}
            </div>
          </div>

          {/* Archivo adjunto con visualizador */}
          {archivoUrl && (
            <div>
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Paperclip size={14} className="text-purple-400" />
                Archivo Adjunto
              </h3>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                {esImagen && (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <img
                        src={archivoUrl}
                        alt="Resultado del examen"
                        className="max-h-[500px] max-w-full rounded-lg border border-gray-700 shadow-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          if (parent && !parent.querySelector('.error-msg')) {
                            const p = document.createElement('p');
                            p.className = 'error-msg text-sm text-rose-400';
                            p.textContent = 'No se pudo cargar la imagen.';
                            parent.appendChild(p);
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-center">
                      <a
                        href={archivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <ExternalLink size={12} /> Ver original
                      </a>
                    </div>
                  </div>
                )}

                {esPDF && (
                  <div className="space-y-3">
                    <iframe
                      src={archivoUrl}
                      className="w-full h-[500px] rounded-lg border border-gray-700 bg-white"
                      title="PDF adjunto"
                    />
                    <div className="flex justify-center">
                      <a
                        href={archivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <ExternalLink size={12} /> Abrir en pestaña nueva
                      </a>
                    </div>
                  </div>
                )}

                {!esImagen && !esPDF && (
                  <div className="text-center py-8 text-gray-400">
                    <FileType size={32} className="mx-auto mb-2 text-gray-500" />
                    <p className="text-sm mb-3">Archivo adjunto no previsualizable</p>
                    <a
                      href={archivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline text-xs inline-flex items-center gap-1"
                    >
                      <Download size={12} /> Descargar archivo
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============ FOOTER ============ */}
        <div className="p-3 border-t border-gray-700 flex justify-end gap-2 bg-gray-800/80 flex-shrink-0">
          <button
            onClick={handleDescargarPDF}
            disabled={loadingPDF}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm rounded-lg transition flex items-center gap-2 shadow-md shadow-cyan-900/30"
          >
            <Download size={14} />
            {loadingPDF ? 'Generando...' : 'Descargar PDF'}
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

export default VisorResultadoModal;