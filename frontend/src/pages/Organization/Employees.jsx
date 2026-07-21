// frontend/src/pages/organization/Employees.jsx
import React, { useState, useEffect } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../../api/payroll';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmployeeForm from '../../components/forms/EmployeeForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = searchTerm ? `nombre=${encodeURIComponent(searchTerm)}` : '';
      const data = await getEmployees(params);
      setEmployees(data);
    } catch (err) {
      setError(err.message || 'Error al cargar empleados');
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [searchTerm]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateEmployee(editing.id, data);
        toast.success('Empleado actualizado');
      } else {
        await createEmployee(data);
        toast.success('Empleado creado');
      }
      setShowModal(false);
      setEditing(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Empleado',
      message: `¿Está seguro de eliminar a "${nombre}"?`,
      onConfirm: async () => {
        try {
          await deleteEmployee(id);
          toast.success('Empleado eliminado');
          fetchEmployees();
        } catch (err) {
          toast.error('Error al eliminar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchEmployees} />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Empleados</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={20} />
            Nuevo Empleado
          </button>
        </div>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Salario Base</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">DUI</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ISSS</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">AFP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {employees.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-400">No hay empleados</td></tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">{e.nombre}</td>
                  <td className="px-6 py-4 text-gray-300">${e.salario_base}</td>
                  <td className="px-6 py-4 text-gray-300">{e.dui}</td>
                  <td className="px-6 py-4">
                    {e.cotiza_isss ? (
                      <span className="text-green-400">✅</span>
                    ) : (
                      <span className="text-red-400">❌</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {e.cotiza_afp ? (
                      <span className="text-green-400">✅</span>
                    ) : (
                      <span className="text-red-400">❌</span>
                    )}
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => { setEditing(e); setShowModal(true); }}
                      className="text-yellow-400 hover:text-yellow-300 transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(e.id, e.nombre)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editing ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h2>
            <EmployeeForm
              initialData={editing || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowModal(false); setEditing(null); }}
              loading={saving}
            />
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

export default Employees;