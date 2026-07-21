// frontend/src/pages/superadmin/FacturasEmitidas.jsx
import React, { useState, useEffect } from 'react';
import {
  getFacturasEmitidasGlobal,
  cambiarEstadoFacturaSuperAdmin,
  cancelarFacturaSuperAdmin,
  descargarPDFFacturaSuperAdmin,
} from '../../api/superadminInvoices';
import { getOrganizations } from '../../api/organizations';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import { Search } from 'lucide-react';

const FacturasEmitidas = ({ onDashboardUpdate }) => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadOrganizations = async () => {
    try {
      const data = await getOrganizations();
      setOrganizations(data || []);
    } catch (err) {
      toast.error('Error al cargar organizaciones');
    }
  };

  const loadData = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum);
      params.append('limit', 10);
      if (selectedOrg) params.append('organizacion_id', selectedOrg);
      if (filtroMes) params.append('mes', filtroMes);
      if (filtroAnio) params.append('anio', filtroAnio);

      const data = await getFacturasEmitidasGlobal(params.toString());
      setFacturas(data.facturas || []);
      setTotal(data.paginacion?.total || 0);
      setTotalPages(data.paginacion?.totalPages || 1);
      setPage(data.paginacion?.page || 1);
    } catch (err) {
      setError(err.message || 'Error al cargar facturas');
      toast.error('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    loadData(1);
  }, [selectedOrg, filtroMes, filtroAnio]);

  const handleDownloadPDF = async (id) => {
    try {
      const blob = await descargarPDFFacturaSuperAdmin(id);
      saveAs(blob, `factura_${id}.pdf`);
    } catch (err) {
      toast.error('Error al descargar PDF');
    }
  };

  const handleChangeStatus = async (id, nuevoEstado) => {
    const factura = facturas.find(f => f.id === id);
    if (!factura) {
      toast.error('Factura no encontrada');
      return;
    }
    if (factura.estado === nuevoEstado) {
      toast.warning(`La factura ya está en estado ${nuevoEstado}`);
      return;
    }

    try {
      await cambiarEstadoFacturaSuperAdmin(id, nuevoEstado);
      toast.success(`Factura ${nuevoEstado === 'Pagada' ? 'pagada' : 'reabierta'}`);
      await loadData(page);
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Anular esta factura?')) return;
    try {
      await cancelarFacturaSuperAdmin(id);
      toast.success('Factura anulada');
      await loadData(page);
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al anular');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => loadData(page)} />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Facturas Emitidas (Global)</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.nombre_empresa}</option>
              ))}
            </select>
          </div>
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(2024, m-1).toLocaleString('es', { month: 'long' })}</option>
            ))}
          </select>
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button onClick={() => loadData(1)} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-white transition">
            Refrescar
          </button>
        </div>
      </div>

      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">N°</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Organización</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {facturas.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-400">No hay facturas</td></tr>
            ) : (
              facturas.map((f) => (
                <tr key={f.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">{f.numero_correlativo}</td>
                  <td className="px-6 py-4 text-gray-300">{f.cliente_nombre}</td>
                  <td className="px-6 py-4 text-gray-300">{f.organizacion_nombre}</td>
                  <td className="px-6 py-4 text-gray-300">{new Date(f.creado_en).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-300">${f.total_pagar}</td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => handleDownloadPDF(f.id)}
                      className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs text-white"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => handleChangeStatus(f.id, 'Pagada')}
                      className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded text-xs text-white"
                    >
                      Pagar
                    </button>
                    <button
                      onClick={() => handleCancelar(f.id)}
                      className="bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded text-xs text-white"
                    >
                      Anular
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => loadData(p)}
                className={`px-3 py-1 rounded ${p === page ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 p-2">Total: {total} facturas</p>
      </div>
    </div>
  );
};

export default FacturasEmitidas;