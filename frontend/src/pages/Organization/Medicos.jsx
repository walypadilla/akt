import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMedicos,
  crearMedico,
  actualizarMedico,
  eliminarMedico,
  reactivarMedico,
  exportarMedicosTodos,
  exportarMedicosFiltrados
} from '../../api/clinica';
import { toast } from 'react-toastify';

const Medicos = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [medicos, setMedicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('activos'); // 'activos', 'inactivos', 'todos'

  // Estados para Modal de Crear/Editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [medicoEditando, setMedicoEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    especialidad: '',
    numero_licencia: '',
    telefono: '',
    email: ''
  });

  const cargarMedicos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (busqueda) params.q = busqueda;
      if (estadoFiltro !== 'todos') params.estado = estadoFiltro;

      const data = await getMedicos(params);
      setMedicos(Array.isArray(data) ? data : data.medicos || []);
    } catch (err) {
      console.error('Error al cargar médicos:', err);
      toast.error('No se pudo cargar la lista de médicos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMedicos();
  }, [estadoFiltro]);

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarMedicos();
  };

  // Apertura y cierre de modal
  const abrirModalNuevo = () => {
    setMedicoEditando(null);
    setFormData({
      nombre: '',
      especialidad: '',
      numero_licencia: '',
      telefono: '',
      email: ''
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (medico) => {
    setMedicoEditando(medico);
    setFormData({
      nombre: medico.nombre || '',
      especialidad: medico.especialidad || '',
      numero_licencia: medico.numero_licencia || '',
      telefono: medico.telefono || '',
      email: medico.email || ''
    });
    setModalAbierto(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (medicoEditando) {
        await actualizarMedico(medicoEditando.id, formData);
        toast.success('Médico actualizado correctamente');
      } else {
        await crearMedico(formData);
        toast.success('Médico creado correctamente');
      }
      setModalAbierto(false);
      cargarMedicos();
    } catch (err) {
      console.error('Error al guardar médico:', err);
      toast.error('Ocurrió un error al guardar el médico.');
    }
  };

  // Acciones de estado (Inactivar / Reactivar)
  const handleToggleEstado = async (medico) => {
    const estaActivo = medico.activo ?? true;
    try {
      if (estaActivo) {
        if (!window.confirm(`¿Inactivar al médico ${medico.nombre}?`)) return;
        await eliminarMedico(medico.id);
        toast.success('Médico inactivado');
      } else {
        await reactivarMedico(medico.id);
        toast.success('Médico reactivado');
      }
      cargarMedicos();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error('No se pudo cambiar el estado del médico.');
    }
  };

  // Exportaciones CSV
  const descargarCSV = (blob, nombreArchivo) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleExportarTodos = async () => {
    try {
      const blob = await exportarMedicosTodos();
      descargarCSV(blob, 'medicos_todos.csv');
    } catch (err) {
      console.error('Error al exportar todos:', err);
      toast.error('Error al exportar el archivo.');
    }
  };

  const handleExportarFiltrados = async () => {
    try {
      const params = {};
      if (busqueda) params.q = busqueda;
      if (estadoFiltro !== 'todos') params.estado = estadoFiltro;

      const blob = await exportarMedicosFiltrados(params);
      descargarCSV(blob, 'medicos_filtrados.csv');
    } catch (err) {
      console.error('Error al exportar filtrados:', err);
      toast.error('Error al exportar el archivo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y acciones principales */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Médicos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Administra el personal médico, especialidades y licencias de la clínica
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportarTodos}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg shadow transition"
          >
            Exportar Todos (CSV)
          </button>
          <button
            onClick={handleExportarFiltrados}
            disabled={medicos.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white text-sm font-medium rounded-lg shadow transition"
          >
            Exportar Filtrados
          </button>
          <button
            onClick={abrirModalNuevo}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow transition"
          >
            + Nuevo Médico
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col sm:flex-row justify-between gap-4">
        <form onSubmit={handleBuscar} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar por nombre, especialidad o licencia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-sm w-full sm:w-72"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">
            Estado:
          </label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {/* Tabla de Médicos */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Especialidad</th>
                <th className="px-4 py-3">Licencia</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    Cargando médicos...
                  </td>
                </tr>
              ) : medicos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No se encontraron médicos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                medicos.map((med) => {
                  const activo = med.activo ?? true;
                  return (
                    <tr
                      key={med.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {med.nombre}
                      </td>
                      <td className="px-4 py-3">{med.especialidad || '-'}</td>
                      <td className="px-4 py-3">{med.numero_licencia || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          {med.telefono && <div>Tel: {med.telefono}</div>}
                          {med.email && <div className="text-gray-400">{med.email}</div>}
                          {!med.telefono && !med.email && '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            activo
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/medicos/${med.id}/detalle`)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
                        >
                          Ver Detalle
                        </button>
                        <button
                          onClick={() => abrirModalEditar(med)}
                          className="text-yellow-600 dark:text-yellow-400 hover:underline text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleEstado(med)}
                          className={`${
                            activo
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          } hover:underline text-xs font-medium`}
                        >
                          {activo ? 'Inactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Crear / Editar Médico */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {medicoEditando ? 'Editar Médico' : 'Registrar Nuevo Médico'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Dr. Nombre Apellido"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase mb-1">
                  Especialidad
                </label>
                <input
                  type="text"
                  value={formData.especialidad}
                  onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej. Pediatría, Medicina General"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase mb-1">
                  Número de Licencia / JVPM
                </label>
                <input
                  type="text"
                  value={formData.numero_licencia}
                  onChange={(e) => setFormData({ ...formData, numero_licencia: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej. JVPM-12345"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm"
                    placeholder="2222-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm"
                    placeholder="medico@clinica.com"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  {medicoEditando ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medicos;