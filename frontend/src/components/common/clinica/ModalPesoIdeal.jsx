// frontend/src/components/common/clinica/ModalPesoIdeal.jsx

import React, { useState } from 'react';
import { X, Save, Settings2 } from 'lucide-react';
import { actualizarPesoIdeal } from '../../../api/clinica';
import { toast } from 'react-toastify';

const ModalPesoIdeal = ({ paciente, onClose }) => {
  const [min, setMin] = useState(paciente.peso_ideal_min ?? '');
  const [max, setMax] = useState(paciente.peso_ideal_max ?? '');
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  const guardar = async () => {
    const minN = Number(min);
    const maxN = Number(max);

    if (!min || !max || minN <= 0 || maxN <= 0 || minN >= maxN) {
      setErr('Ingresa un rango válido (mín < máx, ambos > 0)');
      return;
    }
    setGuardando(true);
    setErr('');
    try {
      await actualizarPesoIdeal(paciente.id, {
        peso_ideal_min: minN,
        peso_ideal_max: maxN,
      });
      toast.success('Rango actualizado');
      onClose(true);
    } catch {
      setErr('Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-sm w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Settings2 size={18} className="text-purple-400" />
            Rango de peso ideal
          </h3>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-400">
            {paciente.nombre} — {paciente.especie || '—'} {paciente.raza || ''}
          </p>
          <p className="text-[11px] text-gray-500 italic">
            Con este rango se clasifica al paciente en el KPI: bajo peso,
            buen estado o sobrepeso.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Mínimo (kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ej: 10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Máximo (kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ej: 14"
              />
            </div>
          </div>

          {err && <p className="text-rose-400 text-xs">{err}</p>}
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

export default ModalPesoIdeal;