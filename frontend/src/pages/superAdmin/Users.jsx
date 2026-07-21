// pages/superadmin/Users.jsx
import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, resetUserPassword, deleteUser, changePassword } from '../../api/users';
import { getOrganizations } from '../../api/organizations';
import { Plus, Edit, Trash2, Key, User } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import UserForm from '../../components/forms/UserForm';
import ResetPasswordModal from '../../components/common/ResetPasswordModal';
import { toast } from 'react-toastify';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetModal, setResetModal] = useState({ open: false, userId: null });
  const [resetting, setResetting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      const data = await getOrganizations();
      setOrganizations(data);
      if (data.length > 0 && !selectedOrgId) {
        setSelectedOrgId(data[0].id);
      }
    } catch (err) {
      toast.error('Error al cargar organizaciones');
    }
  };

  const fetchUsers = async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers(selectedOrgId);
      setUsers(data);
    } catch (err) {
      setError(err.message);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      fetchUsers();
    }
  }, [selectedOrgId]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, data);
        toast.success('Usuario actualizado');
      } else {
        await createUser(selectedOrgId, data);
        toast.success('Usuario creado');
      }
      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = (userId) => {
    setResetModal({ open: true, userId });
  };

  const onResetPassword = async ({ password, es_temporal }) => {
    setResetting(true);
    try {
      await changePassword(resetModal.userId, password, es_temporal);
      toast.success('Contraseña actualizada');
      setResetModal({ open: false, userId: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al restablecer');
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Inactivar este usuario?')) return;
    try {
      await deleteUser(id);
      toast.success('Usuario inactivado');
      fetchUsers();
    } catch (err) {
      toast.error('Error al inactivar');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchUsers} />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.nombre_empresa}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={20} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Correo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">No hay usuarios</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 flex items-center gap-2 text-gray-300">
                    <User size={16} className="text-gray-500" />
                    {user.nombre}
                  </td>
                  <td className="px-6 py-4 text-gray-300">{user.correo}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.rol === 'Admin' ? 'bg-blue-900/50 text-blue-400 border border-blue-700' :
                      user.rol === 'Contador' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                      'bg-gray-700 text-gray-300 border border-gray-600'
                    }`}>
                      {user.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.estado === 'Activo'
                        ? 'bg-green-900/50 text-green-400 border border-green-700'
                        : 'bg-red-900/50 text-red-400 border border-red-700'
                    }`}>
                      {user.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => { setEditingUser(user); setShowModal(true); }}
                      className="text-yellow-400 hover:text-yellow-300 transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      className="text-cyan-400 hover:text-cyan-300 transition"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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

      {/* Modales */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <UserForm
              initialData={editingUser || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowModal(false); setEditingUser(null); }}
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

export default Users;