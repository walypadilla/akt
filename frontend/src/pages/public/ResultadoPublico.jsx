// frontend/src/pages/public/ResultadoPublico.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FlaskConical, Download, AlertCircle, Loader2, Clock, User, Calendar } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ResultadoPublico = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!token || token.length !== 64) {
      setError('Link inválido');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/publico/examenes/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Link inválido o expirado');
        return res.json();
      })
      .then((data) => setInfo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = () => {
    setDownloading(true);
    fetch(`${API_BASE}/publico/examenes/${token}/pdf`)
      .then((res) => {
        if (!res.ok) throw new Error('Error al generar PDF');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultado_${info?.examen_nombre || 'examen'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => setError(err.message))
      .finally(() => setDownloading(false));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-rose-700/50 p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-rose-600/20 flex items-center justify-center">
              <AlertCircle size={32} className="text-rose-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link no disponible</h1>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700 p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-purple-600/30 flex items-center justify-center">
              <FlaskConical size={32} className="text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
            {info.organizacion_nombre}
          </p>
          <h1 className="text-2xl font-bold text-white">{info.examen_nombre}</h1>
        </div>

        <div className="space-y-3 mb-6 text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <User size={14} className="text-purple-400" />
            <span className="text-gray-400">Paciente:</span>
            <span className="text-white font-medium">{info.paciente_nombre}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar size={14} className="text-purple-400" />
            <span className="text-gray-400">Fecha:</span>
            <span className="text-white">
              {info.fecha_resultado
                ? new Date(info.fecha_resultado).toLocaleDateString('es-SV')
                : '-'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={12} />
            <span>
              Válido hasta {new Date(info.expira_en).toLocaleDateString('es-SV')}
            </span>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-900/30"
        >
          {downloading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Generando PDF...
            </>
          ) : (
            <>
              <Download size={18} /> Descargar Resultado en PDF
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 mt-6 text-center">
          🔒 Este link es único y expira en 7 días. No compartas esta dirección.
        </p>
      </div>
    </div>
  );
};

export default ResultadoPublico;