import React, { useState, useEffect } from 'react';
import { Syringe, Plus, Calendar, X, AlertCircle } from 'lucide-react';
import { getPacientes } from '../../api/clinica';
import { getVacunas, aplicarVacuna, getHistorialVacunas, getProximasVacunas } from '../../api/clinica';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const Vacunas = () => {
  const [pacientes, setPacientes] = useState([]);
  const [vacunas, setVacunas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [proximas, setProximas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    paciente_id: '',
    vacuna_id: '',
    fecha_aplicacion: new Date().toISOString().split('T')[0],
    fecha_proxima: '',
    lote: '',
    observaciones: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pacientesData, vacunasData, proximasData] = await Promise.all([
        getPacientes(),
        getVacunas(),
        getProximasVacunas({ dias: 30 }),
      ]);
      setPacientes(pacientesData || []);
      setVacunas(vacunasData || []);
      setProximas(proximasData || []);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadHistorial = async (pacienteId) => {
    if (!pacienteId) {
      setHistorial([]);
      return;
    }
    try {
      const data = await getHistorialVacunas(pacienteId);
      setHistorial(data || []);
    } catch (error) {
      toast.error('Error al cargar historial');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPaciente) {
      loadHistorial(selectedPaciente);
    } else {
      setHistorial([]);
    }
  }, [selectedPaciente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await aplicarVacuna(formData);
      toast.success('Vacuna aplicada');
      setShowForm(false);
      setFormData({
        paciente_id: '',
        vacuna_id: '',
        fecha_aplicacion: new Date().toISOString().split('T')[0],
        fecha_proxima: '',
        lote: '',
        observaciones: '',
      });
      loadData();
      if (selectedPaciente) loadHistorial(selectedPaciente);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al aplicar vacuna');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Syringe className="w-6 h-6 text-purple-400" />
          Vacunas
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedPaciente}
            onChange={(e) => setSelectedPaciente(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Seleccionar paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={18} />
            Aplicar Vacuna
          </button>
        </div>
      </div>

      {/* Próximas vacunas */}
      {proximas.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <AlertCircle size={16} />
            Próximas vacunas (30 días)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {proximas.slice(0, 6).map((p) => (
              <div key={p.id} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <p className="text-white font-medium">{p.paciente_nombre}</p>
                <p className="text-xs text-gray-400">Vacuna: {p.vacuna_nombre}</p>
                <p className="text-xs text-amber-400">Próxima: {new Date(p.fecha_proxima).toLocaleDateString('es-SV')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial del paciente seleccionado */}
      {selectedPaciente && (
        <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Historial de Vacunas</h3>
          {historial.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay vacunas registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700 text-sm">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-400">Fecha</th>
                    <th className="px-4 py-2 text-left text-gray-400">Vacuna</th>
                    <th className="px-4 py-2 text-left text-gray-400">Lote</th>
                    <th className="px-4 py-2 text-left text-gray-400">Próxima dosis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {historial.map((h) => (
                    <tr key={h.id}>
                      <td className="px-4 py-2 text-gray-300">{new Date(h.fecha_aplicacion).toLocaleDateString('es-SV')}</td>
                      <td className="px-4 py-2 text-white">{h.vacuna_nombre}</td>
                      <td className="px-4 py-2 text-gray-300">{h.lote || '-'}</td>
                      <td className="px-4 py-2 text-amber-400">{h.fecha_proxima ? new Date(h.fecha_proxima).toLocaleDateString('es-SV') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Aplicar Vacuna */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Aplicar Vacuna</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Paciente *</label>
                <select
                  name="paciente_id"
                  value={formData.paciente_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Seleccionar</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Vacuna *</label>
                <select
                  name="vacuna_id"
                  value={formData.vacuna_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Seleccionar</option>
                  {vacunas.map((v) => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Fecha de aplicación *</label>
                <input
                  type="date"
                  name="fecha_aplicacion"
                  value={formData.fecha_aplicacion}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Próxima dosis (opcional)</label>
                <input
                  type="date"
                  name="fecha_proxima"
                  value={formData.fecha_proxima}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Lote</label>
                <input
                  type="text"
                  name="lote"
                  value={formData.lote}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Observaciones</label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Aplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vacunas;