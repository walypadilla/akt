import React, { useState, useEffect } from 'react';
import { getInvoices, changeInvoiceStatus, deleteInvoice } from '../../api/invoices';
import { Plus, CheckCircle, XCircle, Printer } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleStatusChange = async (id, estado) => {
    try {
      await changeInvoiceStatus(id, estado);
      fetchInvoices();
    } catch (err) {
      alert('Error al cambiar estado');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Anular esta factura?')) return;
    try {
      await deleteInvoice(id);
      fetchInvoices();
    } catch (err) {
      alert('Error al anular');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchInvoices} />;

  const statusColors = {
    'Borrador': 'bg-gray-700 text-gray-300 border border-gray-600',
    'Emitida': 'bg-blue-900/50 text-blue-400 border border-blue-700',
    'Pagada': 'bg-green-900/50 text-green-400 border border-green-700',
    'Anulada': 'bg-red-900/50 text-red-400 border border-red-700',
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Facturas</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
          <Plus size={20} />
          Nueva Factura
        </button>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">N° Correlativo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {invoices.map((factura) => (
              <tr key={factura.id} className="hover:bg-gray-700/50 transition">
                <td className="px-6 py-4 text-gray-300">{factura.numero_correlativo}</td>
                <td className="px-6 py-4 text-gray-300">{factura.cliente_nombre || 'N/A'}</td>
                <td className="px-6 py-4 text-gray-300">${factura.total_pagar}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${statusColors[factura.estado] || 'bg-gray-700 text-gray-300 border border-gray-600'}`}>
                    {factura.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300">
                  {new Date(factura.creado_en).toLocaleDateString('es-SV')}
                </td>
                <td className="px-6 py-4 space-x-2">
                  <button className="text-blue-400 hover:text-blue-300 transition" title="Ver PDF">
                    <Printer size={18} />
                  </button>
                  {factura.estado === 'Emitida' && (
                    <button
                      onClick={() => handleStatusChange(factura.id, 'Pagada')}
                      className="text-green-400 hover:text-green-300 transition"
                      title="Marcar como pagada"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(factura.id)}
                    className="text-red-400 hover:text-red-300 transition"
                    title="Anular"
                  >
                    <XCircle size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoices;