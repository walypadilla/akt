// frontend/src/pages/organization/Proveedores.jsx
import React, { useState, useEffect } from 'react';
import { getProveedores, createProveedor, updateProveedor, deleteProveedor } from '../../api/proveedores';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ProveedorForm from '../../components/forms/ProveedorForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = searchTerm ? `nombre=${encodeURIComponent(searchTerm)}` : '';
      const data = await getProveedores(params);
      setProveedores(data);
    } catch (err) {
      setError(err.message || 'Error al cargar proveedores');
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateProveedor(editing.id, data);
        toast.success('Proveedor actualizado');
      } else {
        await createProveedor(data);
        toast.success('Proveedor creado');
      }
      setShowModal(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Proveedor',
      message: `¿Está seguro de eliminar a "${nombre}"?`,
      onConfirm: async () => {
        try {
          await deleteProveedor(id);
          toast.success('Proveedor eliminado');
          fetchData();
        } catch (err) {
          toast.error('Error al eliminar');
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
        <h1 className="text-2xl font-bold text-white">Proveedores</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o NIT..."
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
            Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Razón Social</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">NIT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Teléfono</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email DTE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {proveedores.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">No hay proveedores</td></tr>
            ) : (
              proveedores.map((p) => (
                <tr key={p.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">{p.razon_social}</td>
                  <td className="px-6 py-4 text-gray-300">{p.numero_documento || '-'}</td>
                  <td className="px-6 py-4 text-gray-300">{p.telefono || '-'}</td>
                  <td className="px-6 py-4 text-gray-300">{p.email_dte || '-'}</td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => { setEditing(p); setShowModal(true); }}
                      className="text-yellow-400 hover:text-yellow-300 transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.razon_social)}
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
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>
            <ProveedorForm
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

export default Proveedores;