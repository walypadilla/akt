// frontend/src/pages/organization/Clients.jsx
import React, { useState, useEffect } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../../api/clients';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ClientForm from '../../components/forms/ClientForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = searchTerm ? `nombre=${encodeURIComponent(searchTerm)}` : '';
      const data = await getClients(params);
      setClients(data);
    } catch (err) {
      setError(err.message || 'Error al cargar clientes');
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchTerm]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
        toast.success('Cliente actualizado');
      } else {
        await createClient(data);
        toast.success('Cliente creado');
      }
      setShowModal(false);
      setEditingClient(null);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Cliente',
      message: `¿Está seguro de eliminar a "${nombre}"?`,
      onConfirm: async () => {
        try {
          await deleteClient(id);
          toast.success('Cliente eliminado');
          fetchClients();
        } catch (err) {
          toast.error('Error al eliminar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchClients} />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
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
            onClick={() => { setEditingClient(null); setShowModal(true); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={20} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">NIT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Teléfono</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">WhatsApp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {clients.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">No hay clientes</td></tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">{c.nombre}</td>
                  <td className="px-6 py-4 text-gray-300">{c.nit || '-'}</td>
                  <td className="px-6 py-4 text-gray-300">{c.telefono || '-'}</td>
                  <td className="px-6 py-4 text-gray-300">{c.telefono_whatsapp || '-'}</td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => { setEditingClient(c); setShowModal(true); }}
                      className="text-yellow-400 hover:text-yellow-300 transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.nombre)}
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
              {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <ClientForm
              initialData={editingClient || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowModal(false); setEditingClient(null); }}
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

export default Clients;