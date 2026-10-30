//frontend/src/components/clinica/common/ModalRegistroRapido.jsx

import React, { useState } from 'react';
import { X, Save, Scale } from 'lucide-react';
import { registrarPesoRapido } from '../../../api/clinica';
import { toast } from 'react-toastify';

const ModalRegistroRapido = ({ paciente, onClose }) => {
  const [peso, setPeso] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    if (!peso || Number(peso) <= 0) {
      setError('Ingresa un peso válido mayor a 0');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await registrarPesoRapido({
        paciente_id: paciente.id,
        peso: Number(peso),
        observaciones,
      });
      toast.success('Peso registrado');
      onClose(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Scale size={18} className="text-purple-400" />
            Registro rápido de peso
          </h3>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/50 text-sm text-purple-200">
            <strong>{paciente.nombre}</strong>
            <span className="ml-2 text-xs">
              Peso actual: {paciente.ultimo_peso ?? '—'} kg
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Peso (kg) *
            </label>
            <input
              type="number"
              step="0.01"
              autoFocus
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ej: 12.5"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Observaciones
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Control de rutina, desparasitación..."
            />
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={() => onClose(false)}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-md shadow-purple-900/30"
          >
            <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalRegistroRapido;