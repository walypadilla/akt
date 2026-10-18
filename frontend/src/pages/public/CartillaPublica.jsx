// frontend/src/pages/public/CartillaPublica.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Syringe, Printer, AlertCircle, Loader2, Calendar, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CartillaPublica = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    if (!token || token.length !== 64) {
      setError('Link inválido');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/publico/cartilla/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Link inválido o expirado');
        return res.json();
      })
      .then((resData) => setData(resData))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleImprimir = () => {
    setImprimiendo(true);
    // Abre el PDF en una nueva pestaña para que el usuario lo imprima o guarde
    window.open(`${API_BASE}/publico/cartilla/${token}/pdf`, '_blank');
    setTimeout(() => setImprimiendo(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center border border-rose-700/50">
          <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Link no disponible</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center">
              <Syringe size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Cartilla de Vacunación</h1>
              <p className="text-sm text-gray-400">{data.organizacion.nombre_empresa}</p>
            </div>
          </div>
          <button
            onClick={handleImprimir}
            disabled={imprimiendo}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            <Printer size={16} /> {imprimiendo ? 'Abriendo...' : 'Imprimir PDF'}
          </button>
        </div>

        {/* Info Paciente */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User size={20} className="text-purple-400" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Paciente</p>
                <p className="text-white font-bold text-lg">{data.paciente.nombre} {data.paciente.apellidos}</p>
                <p className="text-sm text-gray-400">{data.paciente.especie} {data.paciente.raza ? `- ${data.paciente.raza}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-purple-400" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Expediente</p>
                <p className="text-white font-mono">{data.paciente.codigo_expediente || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {data.historial.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-gray-800 rounded-2xl border border-gray-700">
              No hay vacunas registradas
            </div>
          ) : (
            data.historial.map((h, idx) => (
              <div key={idx} className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  h.semaforo === 'verde' ? 'bg-emerald-500' : 
                  h.semaforo === 'amarillo' ? 'bg-yellow-500' : 
                  h.semaforo === 'rojo' ? 'bg-rose-500' : 'bg-gray-500'
                }`} />
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Syringe size={16} className="text-purple-400" /> {h.vacuna_nombre}
                  </h3>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    h.semaforo === 'verde' ? 'bg-emerald-900/50 text-emerald-300' : 
                    h.semaforo === 'amarillo' ? 'bg-yellow-900/50 text-yellow-300' : 
                    h.semaforo === 'rojo' ? 'bg-rose-900/50 text-rose-300' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {h.mensaje_semaforo}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Aplicada</p>
                    <p className="text-white">{new Date(h.fecha_aplicacion).toLocaleDateString('es-SV')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Próxima Dosis</p>
                    <p className="text-white">{h.fecha_proxima ? new Date(h.fecha_proxima).toLocaleDateString('es-SV') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Lote</p>
                    <p className="text-white font-mono">{h.lote || '-'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-6">
          Este link es privado y expira automáticamente por seguridad.
        </div>
      </div>
    </div>
  );
};

export default CartillaPublica;