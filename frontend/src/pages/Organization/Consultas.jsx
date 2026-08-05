// frontend/src/pages/organization/Consultas.jsx
import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  Clipboard, Search, Plus, Edit2, Trash2, Eye, X, Download, Filter,
  Printer, FileText, Calendar, Clock, User, Activity, DollarSign
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getConsultas,
  createConsulta,
  updateConsulta,
  getConsulta,
  facturarConsulta,
  exportarConsultas,
  exportarConsultasFiltrados
} from '../../api/clinica';
import { getPacientes } from '../../api/clinica';
import { getMedicos } from '../../api/clinica';
import { getProductos } from '../../api/productos';
import ConsultaForm from '../../components/forms/clinica/ConsultaForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { getTodayLocal } from '../../utils/dateUtils';

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const Consultas = () => {
  const { user } = useAuth();
  const tipoOrg = user?.organizacion?.tipo_organizacion || 'Empresa Comercial';

  const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };
  const tipoNormalizado = normalizarTexto(tipoOrg);
  const isClinica = ['clinica general', 'clinica dental', 'clinica veterinaria'].includes(tipoNormalizado);

  if (!isClinica) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Clipboard className="w-12 h-12 mx-auto text-gray-600 mb-2" />
        <p className="text-lg font-semibold">Esta función solo está disponible para clínicas.</p>
      </div>
    );
  }

  // Estados principales
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const tableRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    search: '',
    paciente_id: '',
    medico_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    page: 1,
    limit: 10,
  });
  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

  // Modales
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [showFacturar, setShowFacturar] = useState(false);
  const [facturaData, setFacturaData] = useState({
    servicios: [{ producto_id: '', cantidad: 1, precio_unitario: 0, tipo_venta: 'Gravado' }],
    tipo_documento: 'FAF',
    estado: 'Emitida',
    condicion_operacion: 'Contado',
  });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Cargar datos
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filtros };
      if (!params.search) delete params.search;
      if (!params.paciente_id) delete params.paciente_id;
      if (!params.medico_id) delete params.medico_id;
      if (!params.fecha_inicio) delete params.fecha_inicio;
      if (!params.fecha_fin) delete params.fecha_fin;

      const [consultasData, pacientesData, medicosData, productosData] = await Promise.all([
        getConsultas(params),
        getPacientes({ limit: 99999 }),
        getMedicos(),
        getProductos({ limit: 99999 }),
      ]);

      setConsultas(consultasData.consultas || consultasData || []);
      setPaginacion({
        total: consultasData.total || 0,
        page: consultasData.page || 1,
        limit: consultasData.limit || 10,
        totalPages: consultasData.totalPages || 1,
      });
      setPacientes(pacientesData.pacientes || pacientesData || []);
      setMedicos(medicosData || []);
      setProductos(productosData.productos || productosData || []);
    } catch (err) {
      console.error('Error loading consultas:', err);
      setError(err.message || 'Error al cargar consultas');
      toast.error('Error al cargar consultas');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    loadData();
  }, [
    filtros.page,
    filtros.search,
    filtros.paciente_id,
    filtros.medico_id,
    filtros.fecha_inicio,
    filtros.fecha_fin,
  ]);

  // Scroll restoration
  useLayoutEffect(() => {
    if (!loading && tableRef.current && scrollPosition > 0) {
      setTimeout(() => {
        if (tableRef.current) {
          tableRef.current.scrollTop = scrollPosition;
        }
      }, 50);
    }
  }, [loading, consultas, scrollPosition]);

  // Filtros
  const aplicarFiltros = () => {
    if (tableRef.current) {
      setScrollPosition(tableRef.current.scrollTop);
    }
    setFiltros({ ...filtrosTemp, page: 1 });
    setShowFilters(false);
  };

  const cancelarFiltros = () => {
    setFiltrosTemp({ ...filtros });
    setShowFilters(false);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios = {
      search: '',
      paciente_id: '',
      medico_id: '',
      fecha_inicio: '',
      fecha_fin: '',
      page: 1,
      limit: 10,
    };
    setFiltros(filtrosLimpios);
    setFiltrosTemp(filtrosLimpios);
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
      setScrollPosition(0);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') aplicarFiltros();
  };

  const goToPage = (page) => {
    if (tableRef.current) {
      setScrollPosition(tableRef.current.scrollTop);
    }
    setFiltros({ ...filtros, page });
  };

  // CRUD
  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateConsulta(editing.id, data);
        toast.success('Consulta actualizada');
      } else {
        await createConsulta(data);
        toast.success('Consulta creada');
      }
      setShowForm(false);
      setEditing(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (consulta) => {
    setEditing(consulta);
    setShowForm(true);
  };

  const handleVerDetalle = async (id) => {
    try {
      const data = await getConsulta(id);
      setSelectedConsulta(data);
      setShowDetail(true);
    } catch (error) {
      toast.error('Error al cargar detalle');
    }
  };

  const handleFacturar = async (consultaId) => {
    try {
      const consulta = await getConsulta(consultaId);
      setSelectedConsulta(consulta);
      setFacturaData({
        servicios: [{ producto_id: '', cantidad: 1, precio_unitario: 0, tipo_venta: 'Gravado' }],
        tipo_documento: 'FAF',
        estado: 'Emitida',
        condicion_operacion: 'Contado',
      });
      setShowFacturar(true);
    } catch (error) {
      toast.error('Error al preparar facturación');
    }
  };

  const handleFacturarSubmit = async (e) => {
    e.preventDefault();
    try {
      const serviciosValidos = facturaData.servicios.filter(s => s.producto_id);
      if (serviciosValidos.length === 0) {
        toast.warning('Agregue al menos un servicio');
        return;
      }
      const result = await facturarConsulta(selectedConsulta.id, {
        servicios: serviciosValidos,
        tipo_documento: facturaData.tipo_documento,
        estado: facturaData.estado,
        condicion_operacion: facturaData.condicion_operacion,
      });
      toast.success(`Factura generada: ${result.numero_correlativo} - $${result.total.toFixed(2)}`);
      setShowFacturar(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al facturar');
    }
  };

  const addServicio = () => {
    setFacturaData({
      ...facturaData,
      servicios: [...facturaData.servicios, { producto_id: '', cantidad: 1, precio_unitario: 0, tipo_venta: 'Gravado' }],
    });
  };

  const removeServicio = (index) => {
    if (facturaData.servicios.length === 1) return;
    const nuevos = facturaData.servicios.filter((_, i) => i !== index);
    setFacturaData({ ...facturaData, servicios: nuevos });
  };

  const updateServicio = (index, field, value) => {
    const nuevos = [...facturaData.servicios];
    nuevos[index][field] = value;
    if (field === 'producto_id') {
      const prod = productos.find(p => p.id == value);
      nuevos[index].precio_unitario = prod ? parseFloat(prod.precio_unitario) : 0;
    }
    setFacturaData({ ...facturaData, servicios: nuevos });
  };

  // Exportar
  const handleExportarTodos = async () => {
    try {
      const blob = await exportarConsultas();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consultas_todos_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Todas las consultas exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarFiltrados = async () => {
    try {
      const params = { ...filtros };
      delete params.page;
      delete params.limit;
      const blob = await exportarConsultasFiltrados(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consultas_filtrados_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Consultas filtradas exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  // Imprimir receta
  const handleImprimirReceta = (consulta) => {
    // Esto abrirá una ventana con la receta formateada para imprimir
    if (!consulta.receta) {
      toast.warning('Esta consulta no tiene receta');
      return;
    }

    const ventana = window.open('', '_blank', 'width=600,height=800');
    if (!ventana) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    const fecha = new Date(consulta.fecha_consulta).toLocaleDateString('es-SV');
    const paciente = consulta.paciente_nombre || 'Paciente';
    const medico = consulta.medico_nombre || 'Médico';

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receta Médica</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }
          .header { text-align: center; border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #8b5cf6; margin: 0; }
          .header .empresa { font-size: 14px; color: #666; }
          .info { margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          .info .label { font-weight: bold; color: #555; }
          .receta { background: #f5f5f5; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6; white-space: pre-wrap; min-height: 100px; }
          .footer { text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; }
          .firma { margin-top: 30px; text-align: center; }
          .firma .linea { border-top: 1px solid #333; width: 200px; margin: 20px auto 5px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 RECETA MÉDICA</h1>
          <div class="empresa">${user?.organizacion?.nombre_empresa || 'Clínica'}</div>
        </div>
        <div class="info">
          <p><span class="label">Paciente:</span> ${paciente}</p>
          <p><span class="label">Fecha:</span> ${fecha}</p>
          <p><span class="label">Médico:</span> ${medico}</p>
          ${consulta.diagnostico_texto ? `<p><span class="label">Diagnóstico:</span> ${consulta.diagnostico_texto}</p>` : ''}
        </div>
        <div class="receta">${consulta.receta.replace(/\n/g, '<br>')}</div>
        <div class="firma">
          <div class="linea"></div>
          <p>Firma del Médico</p>
        </div>
        <div class="footer">
          Documento generado el ${new Date().toLocaleDateString('es-SV')}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    ventana.document.close();
  };

  // Render
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some(v => v && v !== '' && v !== 1 && v !== false);

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Clipboard className="w-6 h-6 text-purple-400" /> Consultas
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Historial clínico y atención de pacientes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportarTodos}
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar Todo
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
          >
            <Plus size={14} /> Nueva Consulta
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                showFilters
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'
              }`}
            >
              <Filter size={14} />
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Consultas'}
            </button>
            <button
              onClick={handleExportarFiltrados}
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={13} /> Exportar Vista
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="italic">
              {filtros.search ? `🔍 "${filtros.search}"` : 'Todas las consultas'}
              {filtros.paciente_id && ` | Paciente seleccionado`}
              {filtros.medico_id && ` | Médico seleccionado`}
              {(filtros.fecha_inicio || filtros.fecha_fin) && ' | Rango de fechas'}
            </span>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 p-3 border-t border-gray-700/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por paciente..."
                value={filtrosTemp.search}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, search: e.target.value })}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-7 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filtrosTemp.paciente_id}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, paciente_id: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los pacientes</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellidos || ''}</option>
              ))}
            </select>
            <select
              value={filtrosTemp.medico_id}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, medico_id: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los médicos</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <div className="flex gap-2 col-span-full md:col-span-2 lg:col-span-4">
              <input
                type="date"
                value={filtrosTemp.fecha_inicio}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, fecha_inicio: e.target.value })}
                className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Fecha inicio"
              />
              <input
                type="date"
                value={filtrosTemp.fecha_fin}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, fecha_fin: e.target.value })}
                className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Fecha fin"
              />
            </div>
            <div className="col-span-full flex justify-end gap-2 mt-1">
              <button
                onClick={cancelarFiltros}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarFiltros}
                className="px-4 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md transition"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Consultas</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {total}
          </span>
        </div>

        <div ref={tableRef} className="overflow-x-auto" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Fecha</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Paciente</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Médico</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Diagnóstico</th>
                <th className="px-2 py-2 text-left font-bold text-gray-300 uppercase tracking-wider">Receta</th>
                <th className="px-2 py-2 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {consultas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-gray-400">
                    <Clipboard className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron consultas.</p>
                  </td>
                </tr>
              ) : (
                consultas.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">
                      {new Date(c.fecha_consulta).toLocaleString('es-SV')}
                    </td>
                    <td className="px-2 py-1.5 text-white font-semibold whitespace-nowrap">
                      {c.paciente_nombre || 'N/A'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">
                      {c.medico_nombre || 'N/A'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-300 max-w-[150px] truncate">
                      {c.diagnostico_texto || '-'}
                      {c.diagnostico_codigo && <span className="text-xs text-gray-500 ml-1">({c.diagnostico_codigo})</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {c.receta ? (
                        <button
                          onClick={() => handleImprimirReceta(c)}
                          className="text-cyan-400 hover:text-cyan-300"
                          title="Imprimir receta"
                        >
                          <Printer size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleVerDetalle(c.id)}
                          title="Ver detalle"
                          className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          title="Editar consulta"
                          className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleFacturar(c.id)}
                          title="Facturar"
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <DollarSign size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-2 border-t border-gray-700/80 bg-gray-900/50 text-xs">
            <span className="text-gray-400">
              Mostrando página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> ({total} consultas)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                      p === page
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODALES */}
      {/* ============================================================ */}

      {/* Formulario de Consulta */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[95vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Editar Consulta' : 'Nueva Consulta'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <ConsultaForm
              initialData={editing || {}}
              tipoOrganizacion={tipoOrg}
              pacientes={pacientes}
              medicos={medicos}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              loading={saving}
              isEditing={!!editing}
            />
          </div>
        </div>
      )}

      {/* Detalle de Consulta */}
      {showDetail && selectedConsulta && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Detalle de Consulta</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-400">Paciente:</span> <span className="text-white">{selectedConsulta.paciente_nombre}</span></div>
                <div><span className="text-gray-400">Médico:</span> <span className="text-white">{selectedConsulta.medico_nombre}</span></div>
                <div><span className="text-gray-400">Fecha:</span> <span className="text-white">{new Date(selectedConsulta.fecha_consulta).toLocaleString('es-SV')}</span></div>
                {selectedConsulta.diagnostico_codigo && (
                  <div><span className="text-gray-400">CIE-10:</span> <span className="text-white">{selectedConsulta.diagnostico_codigo}</span></div>
                )}
              </div>

              {selectedConsulta.presion_arterial && (
                <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                  <h4 className="font-semibold text-gray-300 mb-2">Signos Vitales</h4>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div><span className="text-gray-400">PA:</span> {selectedConsulta.presion_arterial}</div>
                    <div><span className="text-gray-400">FC:</span> {selectedConsulta.frecuencia_cardiaca}</div>
                    <div><span className="text-gray-400">Temp:</span> {selectedConsulta.temperatura}°C</div>
                    <div><span className="text-gray-400">Peso:</span> {selectedConsulta.peso} kg</div>
                    <div><span className="text-gray-400">Talla:</span> {selectedConsulta.talla} cm</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 font-semibold">S (Subjetivo):</span>
                  <p className="text-white mt-1">{selectedConsulta.subjetivo || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">O (Objetivo):</span>
                  <p className="text-white mt-1">{selectedConsulta.objetivo || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">A (Análisis):</span>
                  <p className="text-white mt-1">{selectedConsulta.analisis || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">P (Plan):</span>
                  <p className="text-white mt-1">{selectedConsulta.plan || '-'}</p>
                </div>
              </div>
              <div>
                <span className="text-gray-400 font-semibold">Diagnóstico:</span>
                <span className="text-white ml-2">{selectedConsulta.diagnostico_texto || '-'}</span>
              </div>
              {selectedConsulta.receta && (
                <div className="bg-cyan-900/20 border border-cyan-700 p-3 rounded-lg">
                  <span className="text-gray-400 font-semibold">Receta:</span>
                  <div className="text-white mt-1 whitespace-pre-wrap">{selectedConsulta.receta}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => handleImprimirReceta(selectedConsulta)}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition flex items-center gap-2"
              >
                <Printer size={16} /> Imprimir Receta
              </button>
              <button
                onClick={() => handleFacturar(selectedConsulta.id)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
              >
                <DollarSign size={16} /> Facturar
              </button>
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Facturación */}
      {showFacturar && selectedConsulta && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Facturar Consulta - {selectedConsulta.paciente_nombre}</h2>
              <button onClick={() => setShowFacturar(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleFacturarSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Tipo Documento</label>
                  <select
                    value={facturaData.tipo_documento}
                    onChange={(e) => setFacturaData({ ...facturaData, tipo_documento: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="FAF">FAF</option>
                    <option value="CCF">CCF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Estado</label>
                  <select
                    value={facturaData.estado}
                    onChange={(e) => setFacturaData({ ...facturaData, estado: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Emitida">Emitida</option>
                    <option value="Pagada">Pagada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Condición</label>
                  <select
                    value={facturaData.condicion_operacion}
                    onChange={(e) => setFacturaData({ ...facturaData, condicion_operacion: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Credito">Crédito</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-gray-300">Servicios</h4>
                  <button type="button" onClick={addServicio} className="text-cyan-400 hover:text-cyan-300 text-sm">+ Agregar</button>
                </div>
                {facturaData.servicios.map((serv, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <select
                      value={serv.producto_id}
                      onChange={(e) => updateServicio(idx, 'producto_id', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="">Seleccionar producto</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre} - ${parseFloat(p.precio_unitario).toFixed(2)}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={serv.cantidad}
                      onChange={(e) => updateServicio(idx, 'cantidad', parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={serv.precio_unitario}
                      onChange={(e) => updateServicio(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    <select
                      value={serv.tipo_venta}
                      onChange={(e) => updateServicio(idx, 'tipo_venta', e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="Gravado">Gravado</option>
                      <option value="Exento">Exento</option>
                      <option value="No_Sujeto">No Sujeto</option>
                    </select>
                    {facturaData.servicios.length > 1 && (
                      <button type="button" onClick={() => removeServicio(idx)} className="text-red-400 hover:text-red-300">✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowFacturar(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  Generar Factura
                </button>
              </div>
            </form>
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

export default Consultas;