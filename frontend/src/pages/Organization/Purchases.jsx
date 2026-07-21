// frontend/src/pages/organization/Purchases.jsx
import React, { useState, useEffect } from 'react';
import { getPurchases, createPurchase, updatePurchase, deletePurchase } from '../../api/purchases';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import PurchaseForm from '../../components/forms/PurchaseForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
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
      const params = searchTerm ? `proveedor_nombre=${encodeURIComponent(searchTerm)}` : '';
      const data = await getPurchases(params);
      setPurchases(data);
    } catch (err) {
      setError(err.message || 'Error al cargar compras');
      toast.error('Error al cargar compras');
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
        await updatePurchase(editing.id, data);
        toast.success('Compra actualizada');
      } else {
        await createPurchase(data);
        toast.success('Compra creada');
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

  const handleDelete = (id, comprobante) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Compra',
      message: `¿Está seguro de eliminar la compra N° ${comprobante}?`,
      onConfirm: async () => {
        try {
          await deletePurchase(id);
          toast.success('Compra eliminada');
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
        <h1 className="text-2xl font-bold text-white">Compras</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por proveedor..."
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
            Nueva Compra
          </button>
        </div>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Comprobante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Proveedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {purchases.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-400">No hay compras</td></tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">{p.numero_comprobante}</td>
                  <td className="px-6 py-4 text-gray-300">{p.proveedor_nombre || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-300">{new Date(p.fecha_registro).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-300">${p.total}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${p.estado_comprobante === 'Pagado' ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'}`}>
                      {p.estado_comprobante || 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => { setEditing(p); setShowModal(true); }}
                      className="text-yellow-400 hover:text-yellow-300 transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.numero_comprobante)}
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
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editing ? 'Editar Compra' : 'Nueva Compra'}
            </h2>
            <PurchaseForm
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

export default Purchases;