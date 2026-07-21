// frontend/src/pages/superadmin/Productos.jsx
import React, { useState, useEffect } from 'react';
import { getProductos, crearProducto, actualizarProducto, eliminarProducto } from '../../api/productos';
import { Plus, Edit, Trash2 } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ProductoForm from '../../components/forms/ProductoForm';
import { toast } from 'react-toastify';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (err) {
      setError(err.message || 'Error al cargar productos');
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editingProducto) {
        await actualizarProducto(editingProducto.id, data);
        toast.success('Producto actualizado');
      } else {
        await crearProducto(data);
        toast.success('Producto creado');
      }
      setShowModal(false);
      setEditingProducto(null);
      fetchProductos();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await eliminarProducto(id);
      toast.success('Producto eliminado');
      fetchProductos();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchProductos} />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Productos / Servicios</h1>
        <button
          onClick={() => { setEditingProducto(null); setShowModal(true); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {productos.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">No hay productos</td></tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">{p.nombre}</td>
                  <td className="px-6 py-4 text-gray-300">${parseFloat(p.precio_unitario).toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-300">{p.tipo}</td>
                  <td className="px-6 py-4 text-gray-300">{p.stock_actual}</td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => { setEditingProducto(p); setShowModal(true); }}
                      className="text-yellow-400 hover:text-yellow-300 transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <ProductoForm
              initialData={editingProducto || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowModal(false); setEditingProducto(null); }}
              loading={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Productos;