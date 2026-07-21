// frontend/src/pages/superadmin/FacturasPorOrganizacion.jsx
import React, { useState, useEffect } from 'react';
import {
  getFacturasPorOrganizacion,
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

const FacturasPorOrganizacion = ({ onDashboardUpdate }) => {
  // ========== ESTADOS ==========
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [filtroEstado, setFiltroEstado] = useState(''); // Todos los estados por defecto
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // ========== CARGAR ORGANIZACIONES ==========
  const loadOrganizations = async () => {
    try {
      const data = await getOrganizations();
      setOrganizations(data || []);
      // Seleccionar la primera organización por defecto
      if (data.length > 0 && !selectedOrg) {
        setSelectedOrg(data[0].id);
      }
    } catch (err) {
      toast.error('Error al cargar organizaciones');
    }
  };

  // ========== CARGAR FACTURAS (con paginación y filtros) ==========
  const loadData = async (pageNum = 1) => {
    if (!selectedOrg) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum);
      params.append('limit', 10);
      if (filtroMes) params.append('mes', filtroMes);
      if (filtroAnio) params.append('anio', filtroAnio);
      if (filtroEstado) params.append('estado', filtroEstado);

      const data = await getFacturasPorOrganizacion(selectedOrg, params.toString());
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

  // ========== EFECTOS ==========
  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadData(1);
    }
  }, [selectedOrg, filtroMes, filtroAnio, filtroEstado]);

  // ========== MANEJADORES ==========
  const handleDownloadPDF = async (id) => {
    try {
      const blob = await descargarPDFFacturaSuperAdmin(id);
      saveAs(blob, `factura_${id}.pdf`);
    } catch (err) {
      toast.error('Error al descargar PDF');
    }
  };

  const handleChangeStatus = async (id, nuevoEstado) => {
    // Buscar la factura actual para validar
    const factura = facturas.find(f => f.id === id);
    if (!factura) {
      toast.error('Factura no encontrada');
      return;
    }

    // Si ya está en ese estado, no hacer nada
    if (factura.estado === nuevoEstado) {
      toast.warning(`La factura ya está en estado ${nuevoEstado}`);
      return;
    }

    try {
      await cambiarEstadoFacturaSuperAdmin(id, nuevoEstado);
      toast.success(`Factura ${nuevoEstado === 'Pagada' ? 'pagada' : 'reabierta'} correctamente`);

      // ✅ Recargar la tabla
      await loadData(page);

      // ✅ Actualizar el dashboard (si la prop existe)
      if (onDashboardUpdate) {
        onDashboardUpdate();
      }
    } catch (err) {
      console.error('❌ Error al cambiar estado:', err);
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

  // ========== RENDER ==========
  if (loading && !facturas.length) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => loadData(page)} />;

  // Colores según estado
  const statusColors = {
    Borrador: 'bg-gray-700 text-gray-300 border border-gray-600',
    Emitida: 'bg-blue-900/50 text-blue-400 border border-blue-700',
    Pagada: 'bg-green-900/50 text-green-400 border border-green-700',
    Anulada: 'bg-red-900/50 text-red-400 border border-red-700',
  };

  return (
    <div className="p-6">
      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Facturas por Organización</h1>

        {/* ===== FILTROS ===== */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de organización */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.nombre_empresa}</option>
              ))}
            </select>
          </div>

          {/* Filtro de estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los estados</option>
            <option value="Emitida">Emitida</option>
            <option value="Pagada">Pagada</option>
            <option value="Anulada">Anulada</option>
            <option value="Borrador">Borrador</option>
          </select>

          {/* Filtro de mes */}
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
              </option>
            ))}
          </select>

          {/* Filtro de año */}
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Botón refrescar */}
          <button
            onClick={() => loadData(1)}
            className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-white transition"
          >
            Refrescar
          </button>
        </div>
      </div>

      {/* ===== TABLA ===== */}
      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">N°</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-400">
                    No hay facturas para esta organización
                  </td>
                </tr>
              ) : (
                facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 text-gray-300">{f.numero_correlativo}</td>
                    <td className="px-6 py-4 text-gray-300">{f.cliente_nombre}</td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(f.creado_en).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-300">${f.total_pagar}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${statusColors[f.estado] || 'bg-gray-700 text-gray-300 border border-gray-600'}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                      {/* PDF */}
                      <button
                        onClick={() => handleDownloadPDF(f.id)}
                        className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs text-white"
                      >
                        PDF
                      </button>

                      {/* Botones según estado */}
                      {f.estado === 'Emitida' && (
                        <>
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
                        </>
                      )}

                      {f.estado === 'Pagada' && (
                        <>
                          <button
                            onClick={() => handleChangeStatus(f.id, 'Emitida')}
                            className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-xs text-white"
                          >
                            Reabrir
                          </button>
                          <button
                            onClick={() => handleCancelar(f.id)}
                            className="bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded text-xs text-white"
                          >
                            Anular
                          </button>
                        </>
                      )}

                      {f.estado === 'Anulada' && (
                        <span className="text-red-400 text-xs">✖ Anulada</span>
                      )}

                      {f.estado === 'Borrador' && (
                        <span className="text-gray-400 text-xs">Borrador</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===== PAGINACIÓN ===== */}
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

        {/* ===== TOTAL ===== */}
        <p className="text-xs text-gray-500 p-2">Total: {total} facturas</p>
      </div>
    </div>
  );
};

export default FacturasPorOrganizacion;