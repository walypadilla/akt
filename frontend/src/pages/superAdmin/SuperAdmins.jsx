// frontend/src/pages/superadmin/SuperAdmins.jsx
import React, { useState, useEffect } from 'react';
import {
  getSuperAdmins,
  createSuperAdmin,
  updateSuperAdmin,
  deleteSuperAdmin,
  resetSuperAdminPassword,
} from '../../api/superadmins';
import { Plus, Edit, Trash2, Key, Shield } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuperAdminForm from '../../components/forms/SuperAdminForm';
import ResetPasswordModal from '../../components/common/ResetPasswordModal';
import { toast } from 'react-toastify';

const SuperAdmins = () => {
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetModal, setResetModal] = useState({ open: false, userId: null });
  const [resetting, setResetting] = useState(false);

  const fetchSuperAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSuperAdmins();
      setSuperAdmins(data);
    } catch (err) {
      setError(err.message || 'Error al cargar SuperAdmins');
      toast.error('Error al cargar SuperAdmins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdmins();
  }, []);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editingAdmin) {
        await updateSuperAdmin(editingAdmin.id, data);
        toast.success('SuperAdmin actualizado correctamente');
      } else {
        await createSuperAdmin(data);
        toast.success('SuperAdmin creado exitosamente');
      }
      setShowModal(false);
      setEditingAdmin(null);
      fetchSuperAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id === id) {
      toast.warning('No puedes desactivarte a ti mismo');
      return;
    }
    if (!confirm('¿Desactivar este SuperAdmin? Perderá acceso al sistema.')) return;
    try {
      await deleteSuperAdmin(id);
      toast.success('SuperAdmin desactivado');
      fetchSuperAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al desactivar');
    }
  };

  const handleResetPassword = (userId) => {
    setResetModal({ open: true, userId });
  };

  const onResetPassword = async ({ password, es_temporal }) => {
    setResetting(true);
    try {
      await resetSuperAdminPassword(resetModal.userId, password, es_temporal);
      toast.success('Contraseña actualizada correctamente');
      setResetModal({ open: false, userId: null });
      fetchSuperAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al restablecer');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchSuperAdmins} />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">SuperAdmins</h1>
        <button
          onClick={() => { setEditingAdmin(null); setShowModal(true); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} />
          Nuevo SuperAdmin
        </button>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Correo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {superAdmins.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-400">No hay SuperAdmins</td></tr>
            ) : (
              superAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 flex items-center gap-2 text-gray-300">
                    <Shield size={16} className="text-purple-400" />
                    {admin.nombre}
                  </td>
                  <td className="px-6 py-4 text-gray-300">{admin.correo}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      admin.estado === 'Activo'
                        ? 'bg-green-900/50 text-green-400 border border-green-700'
                        : 'bg-red-900/50 text-red-400 border border-red-700'
                    }`}>
                      {admin.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button onClick={() => { setEditingAdmin(admin); setShowModal(true); }} className="text-yellow-400 hover:text-yellow-300 transition">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleResetPassword(admin.id)} className="text-cyan-400 hover:text-cyan-300 transition">
                      <Key size={18} />
                    </button>
                    <button onClick={() => handleDelete(admin.id)} className="text-red-400 hover:text-red-300 transition">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 p-2">Total: {superAdmins.length} SuperAdmins</p>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingAdmin ? 'Editar SuperAdmin' : 'Nuevo SuperAdmin'}
            </h2>
            <SuperAdminForm
              initialData={editingAdmin || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowModal(false); setEditingAdmin(null); }}
              loading={saving}
            />
          </div>
        </div>
      )}

      <ResetPasswordModal
        isOpen={resetModal.open}
        onClose={() => setResetModal({ open: false, userId: null })}
        onReset={onResetPassword}
        loading={resetting}
      />
    </div>
  );
};

export default SuperAdmins;