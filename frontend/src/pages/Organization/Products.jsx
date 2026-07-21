// frontend/src/pages/organization/Productos.jsx
import React, { useState, useEffect } from 'react';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../../api/inventory';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ProductoForm from '../../components/forms/ProductoForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const data = await getProductos(params);
      setProductos(data.productos || data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar productos');
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [searchTerm]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateProducto(editing.id, data);
        toast.success('Producto actualizado');
      } else {
        await createProducto(data);
        toast.success('Producto creado');
      }
      setShowModal(false);
      setEditing(null);
      fetchProductos();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Producto',
      message: `¿Está seguro de eliminar "${nombre}"?`,
      onConfirm: async () => {
        try {
          await deleteProducto(id);
          toast.success('Producto eliminado');
          fetchProductos();
        } catch (err) {
          toast.error('Error al eliminar');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchProductos} />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Productos</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
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
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {productos.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-400">No hay productos</td></tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">{p.nombre}</td>
                  <td className="px-6 py-4 text-gray-300">{p.codigo_sku || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${p.tipo === 'Producto' ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-purple-900/50 text-purple-400 border border-purple-700'}`}>
                      {p.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">${p.precio_unitario}</td>
                  <td className="px-6 py-4">
                    <span className={`${parseFloat(p.stock_actual) <= parseFloat(p.stock_minimo) ? 'text-red-400' : 'text-gray-300'}`}>
                      {p.stock_actual}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button onClick={() => { setEditing(p); setShowModal(true); }} className="text-yellow-400 hover:text-yellow-300">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(p.id, p.nombre)} className="text-red-400 hover:text-red-300">
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
              {editing ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <ProductoForm
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

export default Productos;