import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { getCitas, createCita, updateCitaStatus } from '../../api/clinica';
import { getPacientes } from '../../api/clinica';
import { getMedicos } from '../../api/clinica';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const estadoColors = {
  Programada: 'bg-blue-900/50 text-blue-400 border border-blue-700',
  Confirmada: 'bg-green-900/50 text-green-400 border border-green-700',
  'En Espera': 'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
  Atendida: 'bg-purple-900/50 text-purple-400 border border-purple-700',
  Cancelada: 'bg-red-900/50 text-red-400 border border-red-700',
};

const estados = ['Programada', 'Confirmada', 'En Espera', 'Atendida', 'Cancelada'];

const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [formData, setFormData] = useState({
    paciente_id: '',
    medico_id: '',
    fecha_hora: '',
    duracion_minutos: 30,
    observaciones: '',
  });
  const [filtroEstado, setFiltroEstado] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const loadData = async () => {
    setLoading(true);
    try {
      const [citasData, pacientesData, medicosData] = await Promise.all([
        getCitas({ estado: filtroEstado || undefined }),
        getPacientes(),
        getMedicos(),
      ]);
      setCitas(citasData || []);
      setPacientes(pacientesData || []);
      setMedicos(medicosData || []);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtroEstado]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCita(formData);
      toast.success('Cita creada');
      setShowForm(false);
      setFormData({ paciente_id: '', medico_id: '', fecha_hora: '', duracion_minutos: 30, observaciones: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear cita');
    }
  };

  const handleCambiarEstado = async (id, estado) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cambiar Estado',
      message: `¿Cambiar estado de la cita a "${estado}"?`,
      onConfirm: async () => {
        try {
          await updateCitaStatus(id, estado);
          toast.success('Estado actualizado');
          loadData();
        } catch (error) {
          toast.error('Error al cambiar estado');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-400" />
          Gestión de Citas
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={18} />
            Nueva Cita
          </button>
        </div>
      </div>

      {/* Lista de citas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {citas.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-10">No hay citas</div>
        ) : (
          citas.map((cita) => (
            <div key={cita.id} className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-4 hover:bg-gray-700/50 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-semibold">{cita.paciente_nombre}</h3>
                  <p className="text-sm text-gray-400">Dueño: {cita.cliente_nombre}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${estadoColors[cita.estado] || 'bg-gray-700 text-gray-300'}`}>
                  {cita.estado}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-purple-400" />
                  <span>Médico: {cita.medico_nombre}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" />
                  <span>{new Date(cita.fecha_hora).toLocaleString('es-SV')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" />
                  <span>Duración: {cita.duracion_minutos} min</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {cita.estado !== 'Atendida' && cita.estado !== 'Cancelada' && (
                  <>
                    <button
                      onClick={() => handleCambiarEstado(cita.id, 'Confirmada')}
                      className="px-2 py-1 text-xs bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded transition"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleCambiarEstado(cita.id, 'En Espera')}
                      className="px-2 py-1 text-xs bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white rounded transition"
                    >
                      En Espera
                    </button>
                    <button
                      onClick={() => handleCambiarEstado(cita.id, 'Atendida')}
                      className="px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded transition"
                    >
                      Atender
                    </button>
                    <button
                      onClick={() => handleCambiarEstado(cita.id, 'Cancelada')}
                      className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                {cita.estado === 'Atendida' && (
                  <span className="text-xs text-green-400">✓ Atendida</span>
                )}
                {cita.estado === 'Cancelada' && (
                  <span className="text-xs text-red-400">✗ Cancelada</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de creación */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Cita</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Paciente *</label>
                <select
                  name="paciente_id"
                  value={formData.paciente_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seleccionar</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos || ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Médico *</label>
                <select
                  name="medico_id"
                  value={formData.medico_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seleccionar</option>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  name="fecha_hora"
                  value={formData.fecha_hora}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Duración (minutos)</label>
                <input
                  type="number"
                  name="duracion_minutos"
                  value={formData.duracion_minutos}
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end gap-3">
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
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default Citas;