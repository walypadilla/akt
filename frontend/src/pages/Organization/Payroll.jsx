// frontend/src/pages/organization/Payroll.jsx
import React, { useState, useEffect } from 'react';
import {
  getPayrolls,
  generatePayroll,
  updatePayrollStatus,
  deletePayroll,
} from '../../api/payroll';
import { getEmployees } from '../../api/payroll';
import { Plus, Trash2, RefreshCw, Search } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMes, setFilterMes] = useState('');
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear());
  const [filterEstado, setFilterEstado] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterMes) params.append('mes', filterMes);
      if (filterAnio) params.append('anio', filterAnio);
      if (filterEstado) params.append('estado', filterEstado);
      const [payrollsData, employeesData] = await Promise.all([
        getPayrolls(params.toString()),
        getEmployees(),
      ]);
      setPayrolls(payrollsData);
      setEmployees(employeesData);
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMes, filterAnio, filterEstado]);

  const handleGenerate = async (data) => {
    setSaving(true);
    try {
      await generatePayroll(data);
      toast.success('Planilla generada correctamente');
      setShowGenerateModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar planilla');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (id, nuevoEstado) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cambiar Estado',
      message: `¿Marcar esta planilla como "${nuevoEstado}"?`,
      onConfirm: async () => {
        try {
          await updatePayrollStatus(id, { estado: nuevoEstado });
          toast.success(`Planilla ${nuevoEstado}`);
          fetchData();
        } catch (err) {
          toast.error('Error al cambiar estado');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Planilla',
      message: '¿Está seguro de eliminar esta planilla?',
      onConfirm: async () => {
        try {
          await deletePayroll(id);
          toast.success('Planilla eliminada');
          fetchData();
        } catch (err) {
          toast.error('Error al eliminar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleGenerateMasiva = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Generar Planilla Masiva',
      message: `¿Generar planilla para todos los empleados en ${new Date(anioSeleccionado, mesSeleccionado - 1).toLocaleString('es', { month: 'long' })} ${anioSeleccionado}?`,
      onConfirm: async () => {
        try {
          setSaving(true);
          await generatePayroll({ mes: mesSeleccionado, anio: anioSeleccionado, masiva: true });
          toast.success('Planillas masivas generadas');
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error');
        } finally {
          setSaving(false);
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Planillas</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterMes}
            onChange={(e) => setFilterMes(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={filterAnio}
            onChange={(e) => setFilterAnio(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
          </select>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={20} />
            Generar Planilla
          </button>
          <button
            onClick={handleGenerateMasiva}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <RefreshCw size={20} />
            Masiva
          </button>
        </div>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Empleado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mes/Año</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Días</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Horas Extras</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ISSS</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">AFP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Renta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Neto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {payrolls.length === 0 ? (
              <tr><td colSpan="10" className="px-6 py-4 text-center text-gray-400">No hay planillas</td></tr>
            ) : (
              payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">{p.empleado_nombre}</td>
                  <td className="px-6 py-4 text-gray-300">{p.mes}/{p.anio}</td>
                  <td className="px-6 py-4 text-gray-300">{p.dias_trabajados}</td>
                  <td className="px-6 py-4 text-gray-300">${p.horas_extras_monto}</td>
                  <td className="px-6 py-4 text-gray-300">${p.descuento_isss}</td>
                  <td className="px-6 py-4 text-gray-300">${p.descuento_afp}</td>
                  <td className="px-6 py-4 text-gray-300">${p.descuento_renta}</td>
                  <td className="px-6 py-4 text-green-400 font-bold">${p.salario_neto_pagar}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      p.estado === 'Pagado'
                        ? 'bg-green-900/50 text-green-400 border border-green-700'
                        : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                    }`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    {p.estado === 'Pendiente' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(p.id, 'Pagado')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Pagar
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                    {p.estado === 'Pagado' && (
                      <button
                        onClick={() => handleStatusChange(p.id, 'Pendiente')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Reabrir
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para generar planilla individual */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Generar Planilla</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerate({
                  empleado_id: selectedEmployee,
                  mes: mesSeleccionado,
                  anio: anioSeleccionado,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Empleado</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Mes</label>
                  <select
                    value={mesSeleccionado}
                    onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Año</label>
                  <select
                    value={anioSeleccionado}
                    onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[2024, 2025, 2026, 2027].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? 'Generando...' : 'Generar'}
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

export default Payroll;