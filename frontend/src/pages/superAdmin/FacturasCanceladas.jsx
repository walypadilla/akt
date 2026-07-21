// frontend/src/pages/superadmin/FacturasCanceladas.jsx
import React, { useState, useEffect } from 'react';
import { getFacturasCanceladas, descargarPDFFacturaSuperAdmin } from '../../api/superadminInvoices';
import { getOrganizations } from '../../api/organizations';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const FacturasCanceladas = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [filtros, setFiltros] = useState({
    organizacion_id: '',
    mes: '',
    anio: new Date().getFullYear(),
  });
  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const loadOrganizations = async () => {
    try {
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (err) {
      toast.error('Error al cargar organizaciones');
    }
  };

  const loadData = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', paginacion.limit);
      if (filtros.organizacion_id) params.append('organizacion_id', filtros.organizacion_id);
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);
      
      const data = await getFacturasCanceladas(params);
      setFacturas(data.facturas || []);
      setPaginacion(data.paginacion || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message);
      toast.error('Error al cargar facturas canceladas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    loadData(1);
  }, [filtros]);

  const handleDownloadPDF = async (id) => {
    try {
      const blob = await descargarPDFFacturaSuperAdmin(id);
      saveAs(blob, `factura_${id}.pdf`);
      toast.success('PDF descargado');
    } catch (err) {
      toast.error('Error al descargar PDF');
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= paginacion.totalPages) {
      loadData(newPage);
    }
  };

  if (loading && !facturas.length) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => loadData(paginacion.page)} />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Facturas Canceladas</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              name="organizacion_id"
              value={filtros.organizacion_id}
              onChange={handleFiltroChange}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[200px]"
            >
              <option value="">Todas las organizaciones</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.nombre_empresa}</option>
              ))}
            </select>
          </div>
          <select
            name="mes"
            value={filtros.mes}
            onChange={handleFiltroChange}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            name="anio"
            value={filtros.anio}
            onChange={handleFiltroChange}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[2024, 2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            onClick={() => loadData(1)}
            className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-white transition flex items-center gap-2"
          >
            <Filter size={18} />
            Aplicar filtros
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
              <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-400">No hay facturas canceladas</td></tr>
            ) : (
              facturas.map(f => (
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
                    <span className="text-red-400 text-xs">✖ Anulada</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Paginación */}
        {paginacion.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-700">
            <span className="text-sm text-gray-400">
              Mostrando {((paginacion.page - 1) * paginacion.limit) + 1} - {Math.min(paginacion.page * paginacion.limit, paginacion.total)} de {paginacion.total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(paginacion.page - 1)}
                disabled={paginacion.page === 1}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, paginacion.totalPages) }, (_, i) => {
                let pageNum;
                if (paginacion.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (paginacion.page <= 3) {
                  pageNum = i + 1;
                } else if (paginacion.page >= paginacion.totalPages - 2) {
                  pageNum = paginacion.totalPages - 4 + i;
                } else {
                  pageNum = paginacion.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded ${pageNum === paginacion.page ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(paginacion.page + 1)}
                disabled={paginacion.page === paginacion.totalPages}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 p-2">Total: {paginacion.total} facturas canceladas</p>
      </div>
    </div>
  );
};

export default FacturasCanceladas;