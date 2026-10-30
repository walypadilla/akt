// frontend/src/pages/organization/Invoices.jsx
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFacturas,
  getFactura,
  createFactura,
  updateFactura,
  cambiarEstadoFactura,
  anularFactura,
  getFacturaPDF,
  enviarFacturaWhatsApp,
  getAniosDisponiblesFacturas,
  exportarFacturasFiltradas,
  exportarTodasFacturas,
  getFacturaTicket,
  enviarFacturaMH,        
  enviarFacturaEmail,
  exportarCierreMes
} from '../../api/invoices';
import { getClients } from '../../api/clients';
import { getProductos } from '../../api/productos';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import InvoiceForm from '../../components/forms/InvoiceForm';
import FacturacionDashboard from './FacturacionDashboard'; // IMPORTACIÓN DEL DASHBOARD
import { toast } from 'react-toastify';
import {
  Printer,
  Download,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Search,
  X,
  Eye,
  Calendar,
  DollarSign,
  Mail,
  Send,
  Monitor,
  CheckCircle,
  ChevronDown,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const statusColors = {
  Borrador: 'bg-gray-700 text-gray-300 border border-gray-600',
  Emitida: 'bg-blue-900/50 text-blue-400 border border-blue-700',
  Pagada: 'bg-green-900/50 text-green-400 border border-green-700',
  Anulada: 'bg-red-900/50 text-red-400 border border-red-700',
};

const Invoices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    search: '',
    mes: '',
    anio: new Date().getFullYear(),
    cliente_id: '',
    estado: '',
    tipo_documento: '',
    condicion_operacion: '',
    solo_pendientes: '',
    page: 1,
    limit: 10,
  });
  const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

  // Obtener número de WhatsApp de la organización
  const orgTelefono = user?.organizacion?.telefono_whatsapp || 'No configurado';

  // Catálogos
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  // Modales
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [whatsappModal, setWhatsappModal] = useState({ isOpen: false, facturaId: null, clienteNombre: '', clienteTelefono: '', orgTelefono: '' });
  const [emailModal, setEmailModal] = useState({ 
    isOpen: false, 
    facturaId: null, 
    clienteNombre: '', 
    clienteEmail: '' 
  });

  // Cerrar el menú de acciones si se hace clic afuera
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filtros };
      if (!params.search) delete params.search;
      if (!params.cliente_id) delete params.cliente_id;
      if (!params.estado) delete params.estado;
      if (!params.tipo_documento) delete params.tipo_documento;
      if (!params.condicion_operacion) delete params.condicion_operacion;
      if (!params.solo_pendientes || params.solo_pendientes === 'false') delete params.solo_pendientes;

      const data = await getFacturas(params);
      setFacturas(data.facturas || []);
      setPaginacion({
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 10,
        totalPages: data.totalPages || 1,
      });
    } catch (err) {
      console.error('Error loading facturas:', err);
      setError(err.message || 'Error al cargar facturas');
      toast.error('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [years, clients, products] = await Promise.all([
          getAniosDisponiblesFacturas().catch(() => []),
          getClients({ limit: 99999 }).catch(() => ({ clientes: [] })),
          getProductos({ limit: 99999 }).catch(() => ({ productos: [] })),
        ]);
        setAniosDisponibles(years.length ? years : [new Date().getFullYear()]);
        setClientes(clients.clientes || []);
        setProductos(products.productos || []);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    loadCatalogos();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filtros.page,
    filtros.mes,
    filtros.anio,
    filtros.search,
    filtros.cliente_id,
    filtros.estado,
    filtros.tipo_documento,
    filtros.condicion_operacion,
    filtros.solo_pendientes,
  ]);

  useLayoutEffect(() => {
    if (!loading && tableRef.current && scrollPosition > 0) {
      requestAnimationFrame(() => {
        if (tableRef.current) tableRef.current.scrollTop = scrollPosition;
      });
    }
  }, [loading, facturas, scrollPosition]);

  // ============================================================
  // MANEJADORES DE FILTROS Y PERÍODO
  // ============================================================

  const aplicarFiltros = () => {
    if (tableRef.current) setScrollPosition(tableRef.current.scrollTop);
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
      mes: '',
      anio: new Date().getFullYear(),
      cliente_id: '',
      estado: '',
      tipo_documento: '',
      condicion_operacion: '',
      solo_pendientes: '',
      page: 1,
      limit: 10,
    };
    setFiltros(filtrosLimpios);
    setFiltrosTemp(filtrosLimpios);
    if (tableRef.current) setScrollPosition(0);
  };

  const volverMesActual = () => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = (hoy.getMonth() + 1).toString();
    setFiltros(prev => ({ ...prev, anio, mes, page: 1 }));
    setFiltrosTemp(prev => ({ ...prev, anio, mes }));
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') aplicarFiltros();
  };

  const handleAlertasClick = () => {
    setFiltros({
      ...filtros,
      search: '',
      cliente_id: '',
      estado: 'Emitida',
      condicion_operacion: 'Credito',
      solo_pendientes: 'true',
      page: 1,
    });
    setFiltrosTemp({ 
      ...filtrosTemp, 
      search: '',
      cliente_id: '',
      estado: 'Emitida', 
      condicion_operacion: 'Credito', 
      solo_pendientes: 'true' 
    });
  };

  const getTablaTitle = () => {
    const partes = [];
    if (filtros.search) partes.push(`🔍 "${filtros.search}"`);
    if (filtros.cliente_id) {
      const cli = clientes.find((c) => c.id === parseInt(filtros.cliente_id));
      if (cli) partes.push(`Cliente: ${cli.nombre}`);
    }
    if (filtros.estado) partes.push(`Estado: ${filtros.estado}`);
    if (filtros.tipo_documento) partes.push(`Tipo: ${filtros.tipo_documento}`);
    if (filtros.condicion_operacion) partes.push(`Condición: ${filtros.condicion_operacion}`);
    if (partes.length === 0) return 'Todas las facturas';
    return `Filtrado por: ${partes.join(' | ')}`;
  };

  const goToPage = (page) => {
    if (tableRef.current) setScrollPosition(tableRef.current.scrollTop);
    setFiltros({ ...filtros, page });
  };

  // ============================================================
  // CRUD Y ACCIONES DE FACTURA
  // ============================================================

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await updateFactura(editing.id, data);
        toast.success('Factura actualizada');
      } else {
        await createFactura(data);
        toast.success('Factura creada');
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

  const handleStatusChange = async (id, estado) => {
    try {
      await cambiarEstadoFactura(id, estado);
      toast.success(`Estado cambiado a ${estado}`);
      loadData();
    } catch (err) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Anular Factura',
      message: '¿Estás seguro de anular esta factura? Se revertirá el stock.',
      onConfirm: async () => {
        try {
          await anularFactura(id);
          toast.success('Factura anulada');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al anular');
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleVerDetalle = async (id) => {
    try {
      const data = await getFactura(id);
      setSelectedFactura(data);
      setShowDetailModal(true);
    } catch (err) {
      toast.error('Error al cargar detalle');
    }
  };

  const handleImprimirPDF = async (id) => {
    try {
      const blob = await getFacturaPDF(id);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.success('Abriendo PDF para impresión');
    } catch (err) {
      toast.error('Error al abrir el PDF');
    }
  };

  const handleImprimirTicket = async (id) => {
    try {
      const blob = await getFacturaTicket(id);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.success('Abriendo ticket para impresión');
    } catch (err) {
      toast.error('Error al abrir el ticket');
    }
  };

  const handleEnviarMH = async (id) => {
    try {
      setConfirmModal({
        isOpen: true,
        title: 'Enviar al Ministerio de Hacienda',
        message: '¿Está seguro de enviar esta factura al MH?',
        onConfirm: async () => {
          const response = await enviarFacturaMH(id);
          toast.success('Factura enviada al MH');
          if (response.selloRecepcion) {
            toast.success(`Sello de recepción: ${response.selloRecepcion}`);
          }
          loadData();
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar');
    }
  };

  const handleEnviarEmailAdjuntos = async (id) => {
    try {
      const factura = await getFactura(id);
      const cliente = clientes.find(c => c.id === factura.cliente_id);
      
      if (!cliente) {
        toast.error('Cliente no encontrado');
        return;
      }
      
      if (!cliente.correo) {
        toast.error('El cliente no tiene correo electrónico registrado');
        return;
      }

      if (factura.estado_dte !== 'procesado') {
        toast.warning('La factura no ha sido enviada al MH. Se enviará sin sello de recepción.');
      }

      setEmailModal({
        isOpen: true,
        facturaId: id,
        clienteNombre: cliente.nombre,
        clienteEmail: cliente.correo,
      });
    } catch (err) {
      console.error('Error al preparar envío de correo con adjuntos:', err);
      toast.error('Error al preparar envío');
    }
  };

  const confirmarEnvioEmail = async () => {
    try {
      await enviarFacturaEmail(emailModal.facturaId, {
        email: emailModal.clienteEmail,
      });
      toast.success(`Factura enviada por correo a ${emailModal.clienteEmail}`);
      setEmailModal({ 
        isOpen: false, 
        facturaId: null, 
        clienteNombre: '', 
        clienteEmail: '' 
      });
    } catch (err) {
      console.error('Error al enviar correo:', err);
      toast.error('Error al enviar por correo');
    }
  };

  const handleWhatsApp = async (id) => {
    try {
      const factura = await getFactura(id);
      const cliente = clientes.find(c => c.id === factura.cliente_id);
      
      if (!cliente || !cliente.telefono_whatsapp) {
        toast.error('El cliente no tiene número de WhatsApp registrado');
        return;
      }
      
      setWhatsappModal({
        isOpen: true,
        facturaId: id,
        clienteNombre: cliente.nombre,
        clienteTelefono: cliente.telefono_whatsapp,
        orgTelefono: orgTelefono,
      });
    } catch (err) {
      toast.error('Error al preparar envío');
    }
  };

  const confirmarWhatsApp = async () => {
    try {
      await enviarFacturaWhatsApp(whatsappModal.facturaId);
      toast.success('Factura enviada por WhatsApp');
      setWhatsappModal({ isOpen: false, facturaId: null, clienteNombre: '', clienteTelefono: '', orgTelefono: '' });
    } catch (err) {
      toast.error('Error al enviar por WhatsApp');
    }
  };

  const handleExportarCierreMes = async () => {
    try {
      const hoy = new Date();
      const mesActual = hoy.getMonth() + 1;
      const anioActual = hoy.getFullYear();
      
      const params = new URLSearchParams();
      params.append('mes', mesActual);
      params.append('anio', anioActual);
      
      const blob = await exportarCierreMes(params.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cierre_mes_${mesActual}_${anioActual}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Cierre de mes exportado');
    } catch (err) {
      toast.error(err.message || 'Error al exportar cierre de mes');
    }
  };

  // ============================================================
  // EXPORTACIONES DE LISTADOS
  // ============================================================

  const handleExportarFiltrados = async () => {
    try {
      const params = { ...filtros };
      delete params.page;
      delete params.limit;
      const blob = await exportarFacturasFiltradas(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_filtradas_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Facturas filtradas exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  const handleExportarTodas = async () => {
    try {
      const params = new URLSearchParams();
      params.append('anio', filtros.anio);
      if (filtros.mes) params.append('mes', filtros.mes);
      const blob = await exportarTodasFacturas(params.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_todas_${filtros.anio}${filtros.mes ? `_mes_${filtros.mes}` : ''}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Todas las facturas exportadas');
    } catch (err) {
      toast.error(err.message || 'Error al exportar');
    }
  };

  if (loading && facturas.length === 0) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const { total, page, totalPages } = paginacion;
  const tieneFiltrosActivos = Object.values(filtros).some((v) => v && v !== '' && v !== 1 && v !== false && v !== new Date().getFullYear());

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-purple-400" /> Gestión de Facturación
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Control de facturas y ventas con DTE.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportarTodas}
            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} /> Exportar Todo
          </button>
          <button
            onClick={() => navigate('/facturas/monitor-dte')}
            className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Monitor size={14} /> Monitor DTE
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
          >
            <Plus size={14} /> Nueva Factura
          </button>
        </div>
      </div>

      {/* BANNER DE PERÍODO Y CIERRE */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <Calendar size={14} className="text-purple-400" /> Período
        </span>
        <select
          value={filtros.anio}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setFiltros(prev => ({ ...prev, anio: val, page: 1 }));
            setFiltrosTemp(prev => ({ ...prev, anio: val }));
          }}
          className="bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
        >
          {aniosDisponibles.length > 0 ? (
            aniosDisponibles.map((year) => (
              <option key={year} value={year}>Año: {year}</option>
            ))
          ) : (
            <option value={new Date().getFullYear()}>Año: {new Date().getFullYear()}</option>
          )}
        </select>
        <select
          value={filtros.mes}
          onChange={(e) => {
            const val = e.target.value;
            setFiltros(prev => ({ ...prev, mes: val, page: 1 }));
            setFiltrosTemp(prev => ({ ...prev, mes: val }));
          }}
          className="bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
        >
          <option value="">Todos los meses</option>
          {MESES.map((n, i) => (
            <option key={i + 1} value={i + 1}>{n}</option>
          ))}
        </select>
        <button
          onClick={volverMesActual}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 font-semibold transition"
        >
          Mes Actual
        </button>
        <button
          onClick={handleExportarCierreMes}
          title="Descargar reporte y cierre del mes actual"
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 font-semibold flex items-center gap-1.5 transition ml-auto"
        >
          <FileCheck size={14} /> Cierre de Mes
        </button>
      </div>

      {/* DASHBOARD DE MÉTRICAS Y GRÁFICAS (COMPONENTE SEPARADO) */}
      <FacturacionDashboard 
        mes={filtros.mes} 
        anio={filtros.anio} 
        onAlertClick={handleAlertasClick} 
      />

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${showFilters ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-700/70 hover:bg-gray-700 text-gray-200 border-gray-600'}`}
            >
              <Filter size={14} />
              {showFilters ? 'Ocultar Filtros' : 'Filtrar Facturas'}
            </button>
            <button
              onClick={handleExportarFiltrados}
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download size={13} /> Exportar Vista
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="italic">{getTablaTitle()}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 p-3 border-t border-gray-700/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por N°, cliente, NIT..."
                value={filtrosTemp.search}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, search: e.target.value })}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-7 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filtrosTemp.cliente_id}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, cliente_id: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select
              value={filtrosTemp.estado}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, estado: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Emitida">Emitida</option>
              <option value="Pagada">Pagada</option>
              <option value="Anulada">Anulada</option>
            </select>
            <select
              value={filtrosTemp.tipo_documento}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, tipo_documento: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los tipos</option>
              <option value="FAF">FAF (Consumidor Final)</option>
              <option value="CCF">CCF (Contribuyente)</option>
            </select>
            <select
              value={filtrosTemp.condicion_operacion}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, condicion_operacion: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas las condiciones</option>
              <option value="Contado">Contado</option>
              <option value="Credito">Crédito</option>
            </select>
            <select
              value={filtrosTemp.mes}
              onChange={(e) => setFiltrosTemp({ ...filtrosTemp, mes: e.target.value })}
              className="px-2 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}</option>
              ))}
            </select>
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

      {/* TABLA DE FACTURAS */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Listado de Facturas</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            Total: {total}
          </span>
        </div>

        <div ref={tableRef} className="overflow-x-auto min-h-[380px] pb-4 rounded-b-xl" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">N° Correlativo</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Cliente</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Fecha</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Usuario</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Tipo</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Total</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Condición</th>
                <th className="px-2 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-10 text-center text-gray-400">
                    <DollarSign className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">No se encontraron facturas.</p>
                  </td>
                </tr>
              ) : (
                facturas.map((f, index) => {
                  const esUltimasFilas = index >= facturas.length - 3 && facturas.length > 4;
                  return (
                    <tr key={f.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-2 py-1 text-white font-semibold whitespace-nowrap">{f.numero_correlativo}</td>
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{f.cliente_nombre || 'N/A'}</td>
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap">
                        {new Date(f.creado_en).toLocaleDateString('es-SV')}
                      </td>
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{f.usuario_nombre || 'N/A'}</td>
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap font-mono">{f.tipo_documento}</td>
                      <td className="px-2 py-1 text-emerald-400 font-bold whitespace-nowrap">${parseFloat(f.total_pagar).toFixed(2)}</td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs rounded ${statusColors[f.estado] || 'bg-gray-700 text-gray-300 border border-gray-600'}`}>
                          {f.estado}
                        </span>
                        {f.estado_dte === 'procesado' && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-purple-900/50 text-purple-300 border border-purple-700">
                            Sellada
                          </span>
                        )}
                        {f.estado_dte === 'rechazado' && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-red-900/50 text-red-300 border border-red-700">
                            Rechazada
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{f.condicion_operacion || 'Contado'}</td>

                      {/* MENÚ DESPLEGABLE DE ACCIONES */}
                      <td className="px-2 py-1 whitespace-nowrap text-center">
                        <div 
                          className="relative group inline-block text-left"
                          onMouseEnter={() => setOpenActionMenuId(f.id)}
                          onMouseLeave={() => setOpenActionMenuId(null)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === f.id ? null : f.id);
                            }}
                            className="inline-flex justify-center items-center w-full rounded-md border border-gray-600 shadow-sm px-2 py-1 bg-gray-800 text-xs font-medium text-gray-300 hover:bg-gray-700 focus:outline-none transition-colors"
                          >
                            Acciones 
                            <ChevronDown 
                              className={`-mr-1 ml-1 h-3 w-3 transition-transform duration-200 ${
                                openActionMenuId === f.id 
                                  ? esUltimasFilas ? 'rotate-0' : 'rotate-180' 
                                  : esUltimasFilas ? 'rotate-180 group-hover:rotate-0' : 'group-hover:rotate-180'
                              }`} 
                            />
                          </button>

                          {openActionMenuId === f.id && (
                            <div className={`absolute right-0 w-48 rounded-xl shadow-2xl bg-gray-800/95 backdrop-blur-sm border border-gray-700 p-2 z-50 flex flex-col gap-1 transition-all duration-150 ${esUltimasFilas ? 'bottom-full -mb-2 origin-bottom-right' : 'top-full -mt-3 origin-top-right'}`}>
                              
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVerDetalle(f.id); setOpenActionMenuId(null); }}
                                className="group flex items-center w-full px-2.5 py-1.5 text-xs font-semibold text-gray-200 bg-gray-900/60 hover:bg-gray-700 border border-gray-700/50 rounded-lg transition-all"
                              >
                                <Eye className="mr-2 h-3.5 w-3.5 text-cyan-400" />
                                Ver Detalle
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); handleImprimirPDF(f.id); setOpenActionMenuId(null); }}
                                className="group flex items-center w-full px-2.5 py-1.5 text-xs font-semibold text-gray-200 bg-gray-900/60 hover:bg-gray-700 border border-gray-700/50 rounded-lg transition-all"
                              >
                                <Printer className="mr-2 h-3.5 w-3.5 text-indigo-400" />
                                Imprimir Factura
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); handleImprimirTicket(f.id); setOpenActionMenuId(null); }}
                                className="group flex items-center w-full px-2.5 py-1.5 text-xs font-semibold text-gray-200 bg-gray-900/60 hover:bg-gray-700 border border-gray-700/50 rounded-lg transition-all"
                              >
                                <Printer className="mr-2 h-3.5 w-3.5 text-amber-400" />
                                Imprimir Ticket
                              </button>

                              <div className="my-0.5 border-t border-gray-700/60"></div>

                              <button
                                onClick={(e) => { e.stopPropagation(); handleEnviarMH(f.id); setOpenActionMenuId(null); }}
                                disabled={f.estado_dte === 'procesado' || f.estado_dte === 'rechazado'}
                                className={`group flex items-center w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                                  f.estado_dte === 'procesado' || f.estado_dte === 'rechazado'
                                    ? 'bg-gray-900/30 text-gray-500 border-gray-800 cursor-not-allowed'
                                    : 'text-purple-200 bg-purple-900/20 hover:bg-purple-800/40 border-purple-800/30 hover:border-purple-500/50'
                                }`}
                              >
                                <Send className="mr-2 h-3.5 w-3.5 text-purple-400" />
                                Enviar a Hacienda
                              </button>

                              {f.estado_dte === 'procesado' && f.sello_recepcion && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEnviarEmailAdjuntos(f.id); setOpenActionMenuId(null); }}
                                  className="group flex items-center w-full px-2.5 py-1.5 text-xs font-semibold text-gray-200 bg-gray-900/60 hover:bg-gray-700 border border-gray-700/50 rounded-lg transition-all"
                                >
                                  <Mail className="mr-2 h-3.5 w-3.5 text-blue-400" />
                                  Correo con Adjuntos
                                </button>
                              )}

                              {(f.estado === 'Emitida' || (f.estado !== 'Pagada' && f.estado !== 'Anulada')) && (
                                <div className="my-0.5 border-t border-gray-700/60"></div>
                              )}

                              {f.estado === 'Emitida' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(f.id, 'Pagada'); setOpenActionMenuId(null); }}
                                  className="group flex items-center w-full px-2.5 py-1.5 text-xs font-semibold text-emerald-100 bg-emerald-900/20 hover:bg-emerald-800/40 border border-emerald-800/30 hover:border-emerald-500/50 rounded-lg transition-all"
                                >
                                  <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                                  Marcar Pagada
                                </button>
                              )}

                              {f.estado !== 'Pagada' && f.estado !== 'Anulada' && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditing(f); setShowForm(true); setOpenActionMenuId(null); }}
                                    className="group flex items-center w-full px-2.5 py-1.5 text-xs font-semibold text-gray-200 bg-gray-900/60 hover:bg-gray-700 border border-gray-700/50 rounded-lg transition-all"
                                  >
                                    <Edit3 className="mr-2 h-3.5 w-3.5 text-yellow-400" />
                                    Editar Factura
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(f.id); setOpenActionMenuId(null); }}
                                    className="group flex items-center w-full px-2.5 py-1.5 text-xs font-semibold text-rose-200 bg-rose-900/20 hover:bg-rose-800/40 border border-rose-800/30 hover:border-rose-500/50 rounded-lg transition-all mt-0.5"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-400" />
                                    Anular Factura
                                  </button>
                                </>
                              )}

                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-2 border-t border-gray-700/80 bg-gray-900/50 text-xs">
            <span className="text-gray-400">
              Mostrando página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> ({total} facturas)
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
                    className={`px-2.5 py-1 rounded text-xs font-bold transition ${p === page ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
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

      {/* MODALES */}

      {/* Modal de Detalle */}
      {showDetailModal && selectedFactura && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Detalle de Factura - {selectedFactura.numero_correlativo}</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Cliente:</span> <span className="text-white">{selectedFactura.cliente_nombre}</span></div>
                <div><span className="text-gray-400">NIT:</span> <span className="text-white">{selectedFactura.cliente_nit || '-'}</span></div>
                <div><span className="text-gray-400">Tipo Documento:</span> <span className="text-white">{selectedFactura.tipo_documento}</span></div>
                <div><span className="text-gray-400">Condición:</span> <span className="text-white">{selectedFactura.condicion_operacion}</span></div>
                <div><span className="text-gray-400">Fecha:</span> <span className="text-white">{new Date(selectedFactura.creado_en).toLocaleDateString('es-SV')}</span></div>
                {selectedFactura.fecha_vencimiento && (
                  <div><span className="text-gray-400">Vencimiento:</span> <span className="text-white">{new Date(selectedFactura.fecha_vencimiento).toLocaleDateString('es-SV')}</span></div>
                )}
                <div><span className="text-gray-400">Estado:</span> <span className="text-white">{selectedFactura.estado}</span></div>
                <div><span className="text-gray-400">UUID:</span> <span className="text-white font-mono text-xs">{selectedFactura.uuid_dte || '-'}</span></div>
                <div>
                  <span className="text-gray-400">Atendido por:</span>{' '}
                  <span className="text-white">{selectedFactura.usuario_nombre || 'N/A'}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-700 p-2">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Productos</h4>
                <table className="min-w-full divide-y divide-gray-700/80 text-xs">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-2 py-1 text-left text-gray-400">Producto</th>
                      <th className="px-2 py-1 text-left text-gray-400">Cant.</th>
                      <th className="px-2 py-1 text-left text-gray-400">Precio</th>
                      <th className="px-2 py-1 text-left text-gray-400">Subtotal</th>
                      <th className="px-2 py-1 text-left text-gray-400">IVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60">
                    {(selectedFactura.detalles || []).map((d, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 text-gray-300">{d.producto_nombre}</td>
                        <td className="px-2 py-1 text-gray-300">{d.cantidad}</td>
                        <td className="px-2 py-1 text-gray-300">${parseFloat(d.precio_unitario).toFixed(2)}</td>
                        <td className="px-2 py-1 text-gray-300">${parseFloat(d.subtotal).toFixed(2)}</td>
                        <td className="px-2 py-1 text-gray-300">${parseFloat(d.iva).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex justify-end text-sm border-t border-gray-700 p-2">
                <div className="space-y-1">
                  <div><span className="text-gray-400">Subtotal:</span> <span className="text-white">${parseFloat(selectedFactura.subtotal_sumas).toFixed(2)}</span></div>
                  <div><span className="text-gray-400">IVA 13%:</span> <span className="text-white">${parseFloat(selectedFactura.iva_13 || 0).toFixed(2)}</span></div>
                  {selectedFactura.retencion_1 > 0 && (
                    <div><span className="text-gray-400">Retención 1%:</span> <span className="text-white">-${parseFloat(selectedFactura.retencion_1).toFixed(2)}</span></div>
                  )}
                  {selectedFactura.percepcion_1 > 0 && (
                    <div><span className="text-gray-400">Percepción 1%:</span> <span className="text-white">+${parseFloat(selectedFactura.percepcion_1).toFixed(2)}</span></div>
                  )}
                  <div><span className="text-gray-400 font-bold">Total:</span> <span className="text-emerald-400 font-bold">${parseFloat(selectedFactura.total_pagar).toFixed(2)}</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-3 border-t border-gray-700">
              <button
                onClick={() => handleImprimirPDF(selectedFactura.id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition"
              >
                <Printer size={16} /> Imprimir
              </button>
              
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-4">{editing ? 'Editar Factura' : 'Nueva Factura'}</h2>
            <InvoiceForm
              initialData={editing || {}}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              loading={saving}
              clientes={clientes}
              productos={productos}
            />
          </div>
        </div>
      )}

      {/* Modal de Confirmación WhatsApp */}
      {whatsappModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Confirmar Envío WhatsApp</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p><span className="text-gray-400">Desde:</span> {whatsappModal.orgTelefono}</p>
              <p><span className="text-gray-400">Para:</span> {whatsappModal.clienteNombre} - {whatsappModal.clienteTelefono}</p>
              <p className="text-yellow-400 text-xs">Se enviará la factura como PDF por WhatsApp.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setWhatsappModal({ isOpen: false, facturaId: null, clienteNombre: '', clienteTelefono: '', orgTelefono: '' })}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarWhatsApp}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enviar Correo */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Confirmar Envío por Correo</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p><span className="text-gray-400">Para:</span> {emailModal.clienteNombre}</p>
              <p><span className="text-gray-400">Correo:</span> {emailModal.clienteEmail}</p>
              <p className="text-yellow-400 text-xs">Se enviará la factura en formato PDF por correo electrónico.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEmailModal({ 
                  isOpen: false, 
                  facturaId: null, 
                  clienteNombre: '', 
                  clienteEmail: '' 
                })}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEnvioEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Enviar
              </button>
            </div>
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

export default Invoices;