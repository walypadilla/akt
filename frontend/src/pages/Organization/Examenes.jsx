import React, { useState, useEffect } from 'react';
import { Activity, Plus, Edit2, Trash2, CheckCircle, XCircle, X, FileText, Download } from 'lucide-react';
import { getExamenes, createExamen, updateExamen, deleteExamen, getSolicitudesExamen, solicitarExamen, completarExamen, cancelarSolicitudExamen } from '../../api/clinica';
import { getPacientes } from '../../api/clinica';
import { getConsultas } from '../../api/clinica';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const Examenes = () => {
  const [examenes, setExamenes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('catalogo');
  const [showFormCatalogo, setShowFormCatalogo] = useState(false);
  const [showFormSolicitud, setShowFormSolicitud] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formCatalogo, setFormCatalogo] = useState({ nombre: '', descripcion: '', precio: '' });
  const [formSolicitud, setFormSolicitud] = useState({ paciente_id: '', consulta_id: '', examen_id: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const loadData = async () => {
    setLoading(true);
    try {
      const [examenesData, solicitudesData, pacientesData, consultasData] = await Promise.all([
        getExamenes(),
        getSolicitudesExamen(),
        getPacientes(),
        getConsultas(),
      ]);
      setExamenes(examenesData || []);
      setSolicitudes(solicitudesData || []);
      setPacientes(pacientesData || []);
      setConsultas(consultasData || []);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CRUD Catálogo
  const handleSubmitCatalogo = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateExamen(editing.id, formCatalogo);
        toast.success('Examen actualizado');
      } else {
        await createExamen(formCatalogo);
        toast.success('Examen creado');
      }
      setShowFormCatalogo(false);
      setEditing(null);
      setFormCatalogo({ nombre: '', descripcion: '', precio: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDeleteCatalogo = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desactivar Examen',
      message: '¿Estás seguro de desactivar este examen?',
      onConfirm: async () => {
        try {
          await deleteExamen(id);
          toast.success('Examen desactivado');
          loadData();
        } catch (error) {
          toast.error('Error al desactivar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleEditCatalogo = (examen) => {
    setEditing(examen);
    setFormCatalogo({
      nombre: examen.nombre,
      descripcion: examen.descripcion || '',
      precio: examen.precio || '',
    });
    setShowFormCatalogo(true);
  };

  // Solicitudes
  const handleSubmitSolicitud = async (e) => {
    e.preventDefault();
    try {
      await solicitarExamen(formSolicitud);
      toast.success('Examen solicitado');
      setShowFormSolicitud(false);
      setFormSolicitud({ paciente_id: '', consulta_id: '', examen_id: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al solicitar examen');
    }
  };

  const handleCompletarExamen = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Completar Examen',
      message: '¿Marcar este examen como completado?',
      onConfirm: async () => {
        try {
          await completarExamen(id, { resultado_texto: 'Completado' });
          toast.success('Examen completado');
          loadData();
        } catch (error) {
          toast.error('Error al completar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleCancelarSolicitud = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Solicitud',
      message: '¿Cancelar esta solicitud de examen?',
      onConfirm: async () => {
        try {
          await cancelarSolicitudExamen(id);
          toast.success('Solicitud cancelada');
          loadData();
        } catch (error) {
          toast.error('Error al cancelar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'Pendiente': 'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
      'Completado': 'bg-green-900/50 text-green-400 border border-green-700',
      'Cancelado': 'bg-red-900/50 text-red-400 border border-red-700',
    };
    return colors[estado] || 'bg-gray-700 text-gray-300';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-purple-400" />
          Exámenes y Laboratorio
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveTab('catalogo'); }}
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'catalogo' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Catálogo
          </button>
          <button
            onClick={() => { setActiveTab('solicitudes'); }}
            className={`px-4 py-2 rounded-lg transition ${activeTab === 'solicitudes' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Solicitudes
          </button>
          {activeTab === 'catalogo' && (
            <button
              onClick={() => { setEditing(null); setFormCatalogo({ nombre: '', descripcion: '', precio: '' }); setShowFormCatalogo(true); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus size={18} />
              Nuevo Examen
            </button>
          )}
          {activeTab === 'solicitudes' && (
            <button
              onClick={() => { setFormSolicitud({ paciente_id: '', consulta_id: '', examen_id: '' }); setShowFormSolicitud(true); }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus size={18} />
              Solicitar Examen
            </button>
          )}
        </div>
      </div>

      {/* Catálogo de Exámenes */}
      {activeTab === 'catalogo' && (
        <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700 text-sm">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400">Nombre</th>
                  <th className="px-4 py-3 text-left text-gray-400">Descripción</th>
                  <th className="px-4 py-3 text-left text-gray-400">Precio</th>
                  <th className="px-4 py-3 text-left text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-center text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {examenes.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No hay exámenes</td></tr>
                ) : (
                  examenes.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3 text-white font-medium">{e.nombre}</td>
                      <td className="px-4 py-3 text-gray-300">{e.descripcion || '-'}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">${parseFloat(e.precio).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${e.activo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          {e.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditCatalogo(e)}
                            className="text-yellow-400 hover:text-yellow-300"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCatalogo(e.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Desactivar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Solicitudes de Exámenes */}
      {activeTab === 'solicitudes' && (
        <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700 text-sm">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400">Paciente</th>
                  <th className="px-4 py-3 text-left text-gray-400">Examen</th>
                  <th className="px-4 py-3 text-left text-gray-400">Fecha Solicitud</th>
                  <th className="px-4 py-3 text-left text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-center text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {solicitudes.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No hay solicitudes</td></tr>
                ) : (
                  solicitudes.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3 text-white font-medium">{s.paciente_nombre}</td>
                      <td className="px-4 py-3 text-gray-300">{s.examen_nombre}</td>
                      <td className="px-4 py-3 text-gray-300">{new Date(s.fecha_solicitud).toLocaleString('es-SV')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${getEstadoColor(s.estado)}`}>
                          {s.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {s.estado === 'Pendiente' && (
                            <>
                              <button
                                onClick={() => handleCompletarExamen(s.id)}
                                className="text-green-400 hover:text-green-300"
                                title="Completar"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleCancelarSolicitud(s.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Cancelar"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          {s.estado === 'Completado' && (
                            <span className="text-xs text-green-400">✓ Completado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Catálogo */}
      {showFormCatalogo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{editing ? 'Editar Examen' : 'Nuevo Examen'}</h2>
              <button onClick={() => { setShowFormCatalogo(false); setEditing(null); }} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitCatalogo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Nombre *</label>
                <input
                  type="text"
                  value={formCatalogo.nombre}
                  onChange={(e) => setFormCatalogo({ ...formCatalogo, nombre: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Descripción</label>
                <textarea
                  value={formCatalogo.descripcion}
                  onChange={(e) => setFormCatalogo({ ...formCatalogo, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Precio ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formCatalogo.precio}
                  onChange={(e) => setFormCatalogo({ ...formCatalogo, precio: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => { setShowFormCatalogo(false); setEditing(null); }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Solicitud */}
      {showFormSolicitud && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Solicitar Examen</h2>
              <button onClick={() => setShowFormSolicitud(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitSolicitud} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Paciente *</label>
                <select
                  value={formSolicitud.paciente_id}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, paciente_id: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-300">Consulta (opcional)</label>
                <select
                  value={formSolicitud.consulta_id}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, consulta_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Sin consulta</option>
                  {consultas.map((c) => (
                    <option key={c.id} value={c.id}>{c.paciente_nombre} - {new Date(c.fecha_consulta).toLocaleDateString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Examen *</label>
                <select
                  value={formSolicitud.examen_id}
                  onChange={(e) => setFormSolicitud({ ...formSolicitud, examen_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Seleccionar</option>
                  {examenes.filter(e => e.activo).map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre} - ${parseFloat(e.precio).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowFormSolicitud(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
                >
                  Solicitar
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

export default Examenes;