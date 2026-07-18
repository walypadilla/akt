// frontend/src/components/SuperAdminPanel.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import {
  listarOrganizaciones,
  obtenerUsuariosPorOrganizacion,
  crearOrganizacion,
  cambiarEstadoOrganizacion,
  crearUsuarioOrganizacion,
  crearMultiplesUsuarios,
  cambiarContraseñaUsuario,
  restablecerContraseña,
  obtenerSuperAdmins,
  crearSuperAdmin,
  eliminarSuperAdmin,
  actualizarSuperAdmin,
  getDashboardSuperAdmin,
  registrarPagoMembresia,
  registrarGastoSaaS,
  obtenerContabilidadDetallada,
  generarFacturaMembresia,
  obtenerFacturasPorOrganizacion,
  descargarPDFFacturaSuperAdmin,
  cambiarEstadoFacturaSuperAdmin,
  obtenerConfiguracionSaaS,
  actualizarConfiguracionSaaS,
  obtenerCuentasCobrar,
  obtenerDetalleIngresos,
  obtenerDetalleGastos,
  obtenerFacturasEmitidasGlobal,
  obtenerFacturasCanceladas,
  cancelarFactura,
  cancelarGasto,
  actualizarOrganizacion,
  actualizarUsuario,
} from '../api';
import { saveAs } from 'file-saver';

const SuperAdminPanel = () => {
  // ========== ESTADOS ==========
  const [activeTab, setActiveTab] = useState('organizaciones');
  const [organizaciones, setOrganizaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedOrgNombre, setSelectedOrgNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [dashboardData, setDashboardData] = useState({
    kpis: { ingresosMembresias: 0, gastosInfraestructura: 0, organizacionesActivas: 0, totalUsuarios: 0, cuentasCobrar: 0 },
    topOrganizaciones: [],
    ventasPorMes: []
  });
  const [contabilidadData, setContabilidadData] = useState({
    detalle: [],
    totales: { ingresos: 0, gastos: 0, utilidad: 0 },
    anio: new Date().getFullYear()
  });
  const [facturasOrg, setFacturasOrg] = useState([]);
  const [paginacionFacturas, setPaginacionFacturas] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [editSuperAdminData, setEditSuperAdminData] = useState(null);
  const [detalleMesModal, setDetalleMesModal] = useState({ open: false, mes: null, data: null });
  const [anioContabilidad, setAnioContabilidad] = useState(new Date().getFullYear());
  const [configuracionSaaS, setConfiguracionSaaS] = useState(null);
  const [facturasEmitidasGlobal, setFacturasEmitidasGlobal] = useState([]);
  const [facturasCanceladas, setFacturasCanceladas] = useState([]);
  const [editOrgModal, setEditOrgModal] = useState({ open: false, data: null });
  const [editUserModal, setEditUserModal] = useState({ open: false, data: null, organizacionNombre: '' });
  const [detalleIngresosModal, setDetalleIngresosModal] = useState({ open: false, data: [], loading: false });
  const [detalleGastosModal, setDetalleGastosModal] = useState({ open: false, data: [], page: 1, totalPages: 1, loading: false });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  // ========== CARGAR DATOS ==========
  const loadOrganizaciones = async () => {
    setLoading(true);
    try {
      const res = await listarOrganizaciones();
      setOrganizaciones(res.data || []);
    } catch (error) {
      toast.error('Error al cargar organizaciones: ' + (error.response?.data?.message || error.message));
      setOrganizaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsuarios = async (organizacion_id) => {
    if (!organizacion_id) return;
    setLoading(true);
    try {
      const res = await obtenerUsuariosPorOrganizacion(organizacion_id);
      setUsuarios(res.data || []);
      setSelectedOrgId(organizacion_id);
      const org = organizaciones.find(o => o.id === parseInt(organizacion_id));
      setSelectedOrgNombre(org ? org.nombre_empresa : '');
    } catch (error) {
      toast.error('Error al cargar usuarios: ' + (error.response?.data?.message || error.message));
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSuperAdmins = async () => {
    setLoading(true);
    try {
      const res = await obtenerSuperAdmins();
      setSuperAdmins(res.data || []);
    } catch (error) {
      toast.error('Error al cargar superadmins: ' + (error.response?.data?.message || error.message));
      setSuperAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getDashboardSuperAdmin();
      const cuentasRes = await obtenerCuentasCobrar();
      setDashboardData({
        kpis: {
          ...(res.data?.kpis || { ingresosMembresias: 0, gastosInfraestructura: 0, organizacionesActivas: 0, totalUsuarios: 0 }),
          cuentasCobrar: cuentasRes.data?.total || 0
        },
        topOrganizaciones: Array.isArray(res.data?.topOrganizaciones) ? res.data.topOrganizaciones : [],
        ventasPorMes: Array.isArray(res.data?.ventasPorMes) ? res.data.ventasPorMes : []
      });
    } catch (error) {
      toast.error('Error al cargar dashboard: ' + (error.response?.data?.message || error.message));
      setDashboardData({ kpis: {}, topOrganizaciones: [], ventasPorMes: [] });
    } finally {
      setLoading(false);
    }
  };

  const loadContabilidad = async (anio) => {
    setLoading(true);
    try {
      const res = await obtenerContabilidadDetallada(anio);
      setContabilidadData(res.data);
    } catch (error) {
      toast.error('Error al cargar contabilidad: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadFacturasOrg = async (orgId, page = 1) => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await obtenerFacturasPorOrganizacion(orgId, page, 10);
      setFacturasOrg(res.data.facturas || []);
      setPaginacionFacturas(res.data.paginacion || { total: 0, page: 1, limit: 10, totalPages: 0 });
    } catch (error) {
      toast.error('Error al cargar facturas: ' + (error.response?.data?.message || error.message));
      setFacturasOrg([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConfiguracionSaaS = async () => {
    try {
      const res = await obtenerConfiguracionSaaS();
      setConfiguracionSaaS(res.data || {});
    } catch (error) {
      toast.error('Error al cargar configuración: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadFacturasEmitidasGlobal = async () => {
    setLoading(true);
    try {
      const res = await obtenerFacturasEmitidasGlobal();
      setFacturasEmitidasGlobal(res.data || []);
    } catch (error) {
      toast.error('Error al cargar facturas emitidas: ' + (error.response?.data?.message || error.message));
      setFacturasEmitidasGlobal([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFacturasCanceladas = async () => {
    setLoading(true);
    try {
      const res = await obtenerFacturasCanceladas();
      setFacturasCanceladas(res.data || []);
    } catch (error) {
      toast.error('Error al cargar facturas canceladas: ' + (error.response?.data?.message || error.message));
      setFacturasCanceladas([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDetalleIngresos = async () => {
    setDetalleIngresosModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await obtenerDetalleIngresos();
      setDetalleIngresosModal({ open: true, data: res.data || [], loading: false });
    } catch (error) {
      toast.error('Error al cargar detalle de ingresos: ' + (error.response?.data?.message || error.message));
      setDetalleIngresosModal(prev => ({ ...prev, loading: false }));
    }
  };

  const loadDetalleGastos = async (page = 1) => {
    setDetalleGastosModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await obtenerDetalleGastos(page);
      setDetalleGastosModal({
        open: true,
        data: res.data.gastos || [],
        page: res.data.paginacion.page || 1,
        totalPages: res.data.paginacion.totalPages || 1,
        loading: false
      });
    } catch (error) {
      toast.error('Error al cargar detalle de gastos: ' + (error.response?.data?.message || error.message));
      setDetalleGastosModal(prev => ({ ...prev, loading: false }));
    }
  };

  // ========== EFECTOS ==========
  useEffect(() => {
    if (activeTab === 'organizaciones') loadOrganizaciones();
    else if (activeTab === 'usuarios') { loadOrganizaciones(); if (organizaciones.length > 0 && !selectedOrgId) loadUsuarios(organizaciones[0].id); }
    else if (activeTab === 'superadmins') loadSuperAdmins();
    else if (activeTab === 'dashboard') loadDashboard();
    else if (activeTab === 'contabilidad') loadContabilidad(anioContabilidad);
    else if (activeTab === 'configuracion') loadConfiguracionSaaS();
    else if (activeTab === 'facturas-emitidas') loadFacturasEmitidasGlobal();
    else if (activeTab === 'facturas-canceladas') loadFacturasCanceladas();
  }, [activeTab]);

  // ========== MANEJADORES DE ORGANIZACIONES ==========
  const toggleEstadoOrg = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await cambiarEstadoOrganizacion(id, nuevoEstado);
      toast.success(`Organización ${nuevoEstado}`);
      loadOrganizaciones();
      loadDashboard();
    } catch (error) {
      toast.error('Error al cambiar estado: ' + (error.response?.data?.message || error.message));
    }
  };

  const onSubmitCrearOrg = async (data) => {
    try {
      await crearOrganizacion(data);
      toast.success('Organización creada exitosamente');
      reset();
      loadOrganizaciones();
      setActiveTab('organizaciones');
    } catch (error) {
      toast.error('Error al crear organización: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditarOrganizacion = (org) => {
    setEditOrgModal({ open: true, data: org });
    setValue('edit_nombre_empresa', org.nombre_empresa);
    setValue('edit_nombre_comercial', org.nombre_comercial || '');
    setValue('edit_direccion', org.direccion || '');
    setValue('edit_telefono', org.telefono || '');
    setValue('edit_telefono_whatsapp', org.telefono_whatsapp || '');
    setValue('edit_nit', org.nit);
    setValue('edit_nrc', org.nrc || '');
    setValue('edit_tipo_contribuyente', org.tipo_contribuyente);
    setValue('edit_tipo_organizacion', org.tipo_organizacion || 'Empresa Comercial');
    setValue('edit_ambiente', org.ambiente || 'Pruebas');
    setValue('edit_token_mh', org.token_mh || '');
    setValue('edit_llave_privada_p12', org.llave_privada_p12 || '');
    setValue('edit_logo_url', org.logo_url || '');
  };

  const onSubmitEditarOrganizacion = async (data) => {
    try {
      await actualizarOrganizacion(editOrgModal.data.id, {
        nombre_empresa: data.edit_nombre_empresa,
        nombre_comercial: data.edit_nombre_comercial,
        direccion: data.edit_direccion,
        telefono: data.edit_telefono,
        telefono_whatsapp: data.edit_telefono_whatsapp,
        nit: data.edit_nit,
        nrc: data.edit_nrc,
        tipo_contribuyente: data.edit_tipo_contribuyente,
        tipo_organizacion: data.edit_tipo_organizacion,
        ambiente: data.edit_ambiente,
        token_mh: data.edit_token_mh,
        llave_privada_p12: data.edit_llave_privada_p12,
        logo_url: data.edit_logo_url,
      });
      toast.success('Organización actualizada');
      setEditOrgModal({ open: false, data: null });
      loadOrganizaciones();
      loadDashboard();
    } catch (error) {
      toast.error('Error al actualizar organización: ' + (error.response?.data?.message || error.message));
    }
  };

  // ========== MANEJADORES DE USUARIOS ==========
  const onSubmitCrearUsuario = async (data) => {
    try {
      await crearUsuarioOrganizacion(selectedOrgId, data);
      toast.success('Usuario creado');
      loadUsuarios(selectedOrgId);
      setModalOpen(false);
      reset();
    } catch (error) {
      toast.error('Error al crear usuario: ' + (error.response?.data?.message || error.message));
    }
  };

  const onSubmitCrearMultiplesUsuarios = async (data) => {
    try {
      const usuarios = [
        { nombre: data.nombre1, correo: data.correo1, password: data.password1, rol: data.rol1 || 'Vendedor' },
        { nombre: data.nombre2, correo: data.correo2, password: data.password2, rol: data.rol2 || 'Vendedor' }
      ];
      await crearMultiplesUsuarios(selectedOrgId, usuarios);
      toast.success('Usuarios creados');
      loadUsuarios(selectedOrgId);
      setModalOpen(false);
      reset();
    } catch (error) {
      toast.error('Error al crear usuarios: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditarUsuario = (user, orgNombre) => {
    setEditUserModal({ open: true, data: user, organizacionNombre: orgNombre });
    setValue('edit_user_nombre', user.nombre);
    setValue('edit_user_correo', user.correo);
    setValue('edit_user_rol', user.rol);
    setValue('edit_user_estado', user.estado);
  };

  const onSubmitEditarUsuario = async (data) => {
    try {
      await actualizarUsuario(editUserModal.data.id, {
        nombre: data.edit_user_nombre,
        correo: data.edit_user_correo,
        rol: data.edit_user_rol,
        estado: data.edit_user_estado,
      });
      toast.success('Usuario actualizado');
      setEditUserModal({ open: false, data: null });
      if (selectedOrgId) loadUsuarios(selectedOrgId);
    } catch (error) {
      toast.error('Error al actualizar usuario: ' + (error.response?.data?.message || error.message));
    }
  };

  const onSubmitCambiarPassword = async (data) => {
    try {
      await cambiarContraseñaUsuario(data.usuario_id, data.nueva_contraseña, data.es_temporal || false);
      toast.success('Contraseña actualizada');
      setModalOpen(false);
      reset();
      if (selectedOrgId) loadUsuarios(selectedOrgId);
      if (activeTab === 'superadmins') loadSuperAdmins();
    } catch (error) {
      toast.error('Error al cambiar contraseña: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRestablecerPassword = async (usuario_id) => {
    if (!confirm('¿Restablecer contraseña? Se generará una temporal.')) return;
    try {
      const res = await restablecerContraseña(usuario_id);
      toast.success(`Contraseña temporal: ${res.data.contraseña_temporal}`);
      if (selectedOrgId) loadUsuarios(selectedOrgId);
      if (activeTab === 'superadmins') loadSuperAdmins();
    } catch (error) {
      toast.error('Error al restablecer contraseña: ' + (error.response?.data?.message || error.message));
    }
  };

  // ========== MANEJADORES DE SUPERADMINS ==========
  const onSubmitCrearSuperAdmin = async (data) => {
    try {
      await crearSuperAdmin(data);
      toast.success('SuperAdmin creado');
      reset();
      loadSuperAdmins();
      setModalOpen(false);
    } catch (error) {
      toast.error('Error al crear SuperAdmin: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEliminarSuperAdmin = async (id) => {
    if (!confirm('¿Desactivar este SuperAdmin?')) return;
    try {
      await eliminarSuperAdmin(id);
      toast.success('SuperAdmin desactivado');
      loadSuperAdmins();
    } catch (error) {
      toast.error('Error al desactivar SuperAdmin: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditarSuperAdmin = (sa) => {
    setEditSuperAdminData(sa);
    setValue('edit_nombre', sa.nombre);
    setValue('edit_correo', sa.correo);
    setModalType('editarSuperAdmin');
    setModalOpen(true);
  };

  const onSubmitEditarSuperAdmin = async (data) => {
    try {
      await actualizarSuperAdmin(editSuperAdminData.id, {
        nombre: data.edit_nombre,
        correo: data.edit_correo,
      });
      toast.success('SuperAdmin actualizado');
      setModalOpen(false);
      loadSuperAdmins();
      setEditSuperAdminData(null);
    } catch (error) {
      toast.error('Error al actualizar SuperAdmin: ' + (error.response?.data?.message || error.message));
    }
  };

  // ========== MEMBRESÍAS, GASTOS Y FACTURAS ==========
  const handleRegistrarPago = async (data) => {
    try {
      await registrarPagoMembresia(data);
      toast.success('Pago registrado y organización activada');
      setModalOpen(false);
      reset();
      loadDashboard();
    } catch (error) {
      toast.error('Error al registrar pago: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRegistrarGasto = async (data) => {
    try {
      await registrarGastoSaaS(data);
      toast.success('Gasto registrado');
      setModalOpen(false);
      reset();
      loadDashboard();
      loadContabilidad(anioContabilidad);
    } catch (error) {
      toast.error('Error al registrar gasto: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleGenerarFacturaMembresia = async (data) => {
    try {
      const res = await generarFacturaMembresia(data);
      toast.success(`Factura de membresía generada: ${res.data.numero_correlativo}`);
      setModalOpen(false);
      reset();
      loadDashboard();
      loadContabilidad(anioContabilidad);
      if (selectedOrgId) loadFacturasOrg(selectedOrgId);
    } catch (error) {
      toast.error('Error al generar factura: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDescargarPDF = async (id) => {
    try {
      const res = await descargarPDFFacturaSuperAdmin(id);
      saveAs(res.data, `factura_${id}.pdf`);
    } catch (error) {
      toast.error('Error al descargar PDF: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCambiarEstadoFactura = async (id, nuevoEstado) => {
    try {
      await cambiarEstadoFacturaSuperAdmin(id, nuevoEstado);
      toast.success(`Factura ${nuevoEstado}`);
      loadFacturasEmitidasGlobal();
      loadDashboard();
      loadContabilidad(anioContabilidad);
      if (selectedOrgId) loadFacturasOrg(selectedOrgId);
    } catch (error) {
      toast.error('Error al cambiar estado: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelarFactura = async (id) => {
    if (!confirm('¿Estás seguro de que deseas anular esta factura?')) return;
    try {
      await cancelarFactura(id);
      toast.success('Factura anulada');
      loadFacturasEmitidasGlobal();
      loadFacturasCanceladas();
      loadDashboard();
      if (selectedOrgId) loadFacturasOrg(selectedOrgId);
    } catch (error) {
      toast.error('Error al cancelar factura: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelarGasto = async (id) => {
    if (!confirm('¿Estás seguro de que deseas cancelar este gasto?')) return;
    try {
      await cancelarGasto(id);
      toast.success('Gasto cancelado');
      loadDashboard();
      loadContabilidad(anioContabilidad);
      if (detalleGastosModal.open) loadDetalleGastos(detalleGastosModal.page);
    } catch (error) {
      toast.error('Error al cancelar gasto: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleVerFacturasOrg = (orgId, orgNombre) => {
    setSelectedOrgId(orgId);
    setSelectedOrgNombre(orgNombre);
    setActiveTab('facturas');
    loadFacturasOrg(orgId);
  };

  const handleAbrirDetalleMes = (mesItem) => {
    setDetalleMesModal({ open: true, mes: mesItem, data: mesItem });
  };

  const handleExportarExcel = () => {
    try {
      const data = contabilidadData.detalle.map(item => ({
        'Mes': item.nombre_mes,
        'Ingresos': item.ingresos,
        'Detalle Ingresos': item.detalle_ingresos || 'Sin ingresos',
        'Gastos': item.gastos,
        'Detalle Gastos': item.detalle_gastos || 'Sin gastos',
        'Utilidad': item.utilidad
      }));
      data.push({
        'Mes': 'TOTALES',
        'Ingresos': contabilidadData.totales.ingresos,
        'Detalle Ingresos': '',
        'Gastos': contabilidadData.totales.gastos,
        'Detalle Gastos': '',
        'Utilidad': contabilidadData.totales.utilidad
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contabilidad');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `Contabilidad_${contabilidadData.anio}.xlsx`);
      toast.success('Excel exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar Excel: ' + error.message);
    }
  };

  // ========== CONFIGURACIÓN SAAS ==========
  const onSubmitActualizarConfiguracion = async (data) => {
    try {
      await actualizarConfiguracionSaaS(data);
      toast.success('Configuración actualizada');
      loadConfiguracionSaaS();
    } catch (error) {
      toast.error('Error al actualizar configuración: ' + (error.response?.data?.message || error.message));
    }
  };

  // ========== RENDERIZADO ==========
  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h2 className="text-2xl font-bold mb-6">Panel de SuperAdmin</h2>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-700 mb-6 gap-2">
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'organizaciones' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => setActiveTab('organizaciones')}>Organizaciones</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'crear' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => { setActiveTab('crear'); reset(); }}>+ Crear Organización</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'usuarios' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => { setActiveTab('usuarios'); if (organizaciones.length > 0) loadUsuarios(organizaciones[0].id); }}>Usuarios</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'superadmins' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => setActiveTab('superadmins')}>SuperAdmins</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'contabilidad' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => setActiveTab('contabilidad')}>💰 Contabilidad</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'facturas' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => { if (selectedOrgId) loadFacturasOrg(selectedOrgId); else loadOrganizaciones(); }}>📄 Facturas</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'facturas-emitidas' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => setActiveTab('facturas-emitidas')}>📋 Emitidas</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'facturas-canceladas' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => setActiveTab('facturas-canceladas')}>🚫 Canceladas</button>
        <button className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'configuracion' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => setActiveTab('configuracion')}>⚙️ Configuración</button>
      </div>

      {/* ===== CONTENIDO POR TAB ===== */}
      {/* ORGANIZACIONES */}
      {activeTab === 'organizaciones' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Listado de Organizaciones</h3>
          {loading ? <p className="text-center py-8">Cargando...</p> : (
            <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Empresa</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">NIT</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tipo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  {Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones.filter(org => org.nombre_empresa !== 'SuperAdmin').map((org) => (
                    <tr key={org.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm">{org.id}</td>
                      <td className="px-6 py-4 text-sm font-medium">{org.nombre_empresa}</td>
                      <td className="px-6 py-4 text-sm">{org.nit}</td>
                      <td className="px-6 py-4 text-sm">{org.tipo_contribuyente}</td>
                      <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${org.estado === 'Activo' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{org.estado}</span></td>
                      <td className="action-cell">
                        <div className="btn-group">
                          <button onClick={() => toggleEstadoOrg(org.id, org.estado)} className={`px-3 py-1 rounded text-xs ${org.estado === 'Activo' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}>{org.estado === 'Activo' ? 'Desactivar' : 'Activar'}</button>
                          <button onClick={() => handleEditarOrganizacion(org)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">Editar</button>
                          <button onClick={() => { loadUsuarios(org.id); setActiveTab('usuarios'); }} className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs">Usuarios</button>
                          <button onClick={() => handleVerFacturasOrg(org.id, org.nombre_empresa)} className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs">Ver Facturas</button>
                        </div>
                        
                      </td>
                    </tr>
                  )) : <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-400">No hay organizaciones</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREAR ORGANIZACIÓN */}
      {activeTab === 'crear' && (
        <div className="max-w-2xl mx-auto bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">Crear Nueva Organización</h3>
          <form onSubmit={handleSubmit(onSubmitCrearOrg)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-300">Nombre Empresa *</label><input {...register('nombre_empresa', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Nombre Comercial</label><input {...register('nombre_comercial')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300">Dirección</label><input {...register('direccion')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Teléfono</label><input {...register('telefono')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Teléfono WhatsApp</label><input {...register('telefono_whatsapp')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">NIT *</label><input {...register('nit', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">NRC</label><input {...register('nrc')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Tipo Contribuyente</label><select {...register('tipo_contribuyente')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Pequeño">Pequeño</option><option value="Mediano">Mediano</option><option value="Grande">Grande</option><option value="Exento">Exento</option></select></div>
              <div><label className="block text-sm font-medium text-gray-300">Tipo Organización</label><select {...register('tipo_organizacion')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Empresa Comercial">Empresa Comercial</option><option value="Clínica General">Clínica General</option><option value="Clínica Dental">Clínica Dental</option><option value="Clinica Veterinaria">Clinica Veterinaria</option></select></div>
              <div><label className="block text-sm font-medium text-gray-300">Ambiente</label><select {...register('ambiente')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Pruebas">Pruebas</option><option value="Producción">Producción</option></select></div>
              <div><label className="block text-sm font-medium text-gray-300">Token MH</label><input {...register('token_mh')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300">Llave Privada P12</label><textarea {...register('llave_privada_p12')} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Logo URL</label><input {...register('logo_url')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-2"><h4 className="text-md font-medium text-blue-400 mb-2">👤 Usuario de ingreso al sistema</h4></div>
              <div><label className="block text-sm font-medium text-gray-300">Nombre *</label><input {...register('nombre_admin', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Correo *</label><input {...register('correo_admin', { required: true })} type="email" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-300">Contraseña *</label><input {...register('password_admin', { required: true, minLength: 6 })} type="password" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
            </div>
            <div className="flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg">Crear Organización</button></div>
          </form>
        </div>
      )}

      {/* USUARIOS */}
      {activeTab === 'usuarios' && (
        <div>
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h3 className="text-xl font-semibold">Usuarios por Organización</h3>
            <div className="flex flex-wrap gap-2">
              <select className="bg-gray-800 border border-gray-700 rounded px-3 py-2" onChange={(e) => loadUsuarios(e.target.value)} value={selectedOrgId || ''}>
                <option value="">Seleccionar organización</option>
                {Array.isArray(organizaciones) && organizaciones.map(org => <option key={org.id} value={org.id}>{org.nombre_empresa}</option>)}
              </select>
              <button onClick={() => { reset(); setModalType('crearUsuario'); setModalOpen(true); }} disabled={!selectedOrgId} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">+ Nuevo Usuario</button>
              <button onClick={() => { reset(); setModalType('crearMultiples'); setModalOpen(true); }} disabled={!selectedOrgId} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">+ Crear 2 Usuarios</button>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Correo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rol</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th></tr></thead>
              <tbody className="divide-y divide-gray-700">
                {Array.isArray(usuarios) && usuarios.length > 0 ? usuarios.map(user => (
                  <tr key={user.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm">{user.nombre}</td>
                    <td className="px-6 py-4 text-sm">{user.correo}</td>
                    <td className="px-6 py-4 text-sm">{user.rol}</td>
                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${user.estado === 'Activo' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{user.estado}</span></td>
                    <td className="action-cell">
                      <div className="btn-group">
                        <button onClick={() => handleEditarUsuario(user, selectedOrgNombre)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">Editar</button>
                        <button onClick={() => { reset(); setModalType('cambiarPassword'); setValue('usuario_id', user.id); setModalOpen(true); }} className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs">Cambiar Pass</button>
                        <button onClick={() => handleRestablecerPassword(user.id)} className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-xs">Restablecer</button>
                      </div>
                      
                    </td>
                  </tr>
                )) : <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">No hay usuarios</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPERADMINS */}
      {activeTab === 'superadmins' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">SuperAdmins del Sistema</h3>
            <button onClick={() => { reset(); setModalType('crearSuperAdmin'); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">+ Nuevo SuperAdmin</button>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Correo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th></tr></thead>
              <tbody className="divide-y divide-gray-700">
                {Array.isArray(superAdmins) && superAdmins.length > 0 ? superAdmins.map(sa => (
                  <tr key={sa.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm">{sa.nombre}</td>
                    <td className="px-6 py-4 text-sm">{sa.correo}</td>
                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${sa.estado === 'Activo' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{sa.estado}</span></td>
                    <td className="action-cell">
                      <div className="btn-group">
                        <button onClick={() => handleEditarSuperAdmin(sa)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">Editar</button>
                        <button onClick={() => { reset(); setModalType('cambiarPassword'); setValue('usuario_id', sa.id); setModalOpen(true); }} className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs">Cambiar Pass</button>
                        <button onClick={() => handleEliminarSuperAdmin(sa.id)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">Desactivar</button>
                      </div>
                      
                    </td>
                  </tr>
                )) : <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-400">No hay SuperAdmins</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Dashboard del SaaS</h3>
            <div className="flex gap-2">
              <button onClick={() => { reset(); setModalType('registrarPago'); setModalOpen(true); }} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm">+ Registrar Pago</button>
              <button onClick={() => { reset(); setModalType('registrarGasto'); setModalOpen(true); }} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm">+ Registrar Gasto</button>
              <button onClick={() => { reset(); setModalType('generarFactura'); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">+ Facturar Membresía</button>
            </div>
          </div>
          {loading ? <p className="text-center py-8">Cargando...</p> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700"><p className="text-sm text-gray-400">Ingresos Realizados (mes)</p><p className="text-2xl font-bold text-green-400">${(dashboardData?.kpis?.ingresosMembresias || 0).toFixed(2)}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700"><p className="text-sm text-gray-400">Gastos Infraestructura (mes)</p><p className="text-2xl font-bold text-red-400">${(dashboardData?.kpis?.gastosInfraestructura || 0).toFixed(2)}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700"><p className="text-sm text-gray-400">Utilidad Neta</p><p className="text-2xl font-bold text-blue-400">${((dashboardData?.kpis?.ingresosMembresias || 0) - (dashboardData?.kpis?.gastosInfraestructura || 0)).toFixed(2)}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700"><div className="flex justify-between items-center"><div><p className="text-sm text-gray-400">💳 Cuentas por Cobrar (mes)</p><p className="text-2xl font-bold text-yellow-400">${(dashboardData?.kpis?.cuentasCobrar || 0).toFixed(2)}</p></div><button onClick={() => setActiveTab('facturas-emitidas')} className="text-xs bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded">Ver emitidas</button></div></div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700"><p className="text-sm text-gray-400">📊 Resumen</p><p className="text-sm text-gray-300">Organizaciones Activas: <span className="font-bold text-white">{dashboardData?.kpis?.organizacionesActivas || 0}</span></p><p className="text-sm text-gray-300">Total Usuarios: <span className="font-bold text-white">{dashboardData?.kpis?.totalUsuarios || 0}</span></p></div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-2"><h4 className="font-semibold">Top 5 Organizaciones por Facturación (este mes)</h4><div className="flex gap-2"><button onClick={loadDetalleIngresos} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs">Ver Ingresos</button><button onClick={loadDetalleGastos} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">Ver Gastos</button></div></div>
                {Array.isArray(dashboardData?.topOrganizaciones) && dashboardData.topOrganizaciones.length > 0 ? (
                  <ul className="space-y-1">{dashboardData.topOrganizaciones.map((org, i) => (<li key={i} className="flex justify-between border-b border-gray-700 py-1"><span>{org.nombre_empresa}</span><span className="text-green-400">${Number(org.total_facturado || 0).toFixed(2)}</span></li>))}</ul>
                ) : <p className="text-gray-400">No hay datos de facturación</p>}
              </div>
            </>
          )}
        </div>
      )}

      {/* CONTABILIDAD */}
      {activeTab === 'contabilidad' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Contabilidad SaaS</h3>
            <div className="flex gap-2">
              <select className="bg-gray-800 border border-gray-700 rounded px-3 py-2" value={anioContabilidad} onChange={(e) => { setAnioContabilidad(parseInt(e.target.value)); loadContabilidad(parseInt(e.target.value)); }}>{[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}</select>
              <button onClick={handleExportarExcel} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm">📊 Excel</button>
              <button onClick={loadDetalleIngresos} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm">Ver Ingresos</button>
              <button onClick={loadDetalleGastos} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm">Ver Gastos</button>
            </div>
          </div>
          {loading ? <p className="text-center py-8">Cargando...</p> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700"><p className="text-sm text-gray-400">Total Ingresos {contabilidadData.anio}</p><p className="text-2xl font-bold text-green-400">${(contabilidadData.totales?.ingresos || 0).toFixed(2)}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700"><p className="text-sm text-gray-400">Total Gastos {contabilidadData.anio}</p><p className="text-2xl font-bold text-red-400">${(contabilidadData.totales?.gastos || 0).toFixed(2)}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700"><p className="text-sm text-gray-400">Utilidad Neta {contabilidadData.anio}</p><p className="text-2xl font-bold text-blue-400">${(contabilidadData.totales?.utilidad || 0).toFixed(2)}</p></div>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mes</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ingresos</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Gastos</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Utilidad</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acción</th></tr></thead>
                  <tbody className="divide-y divide-gray-700">
                    {Array.isArray(contabilidadData.detalle) && contabilidadData.detalle.map((item) => (
                      <tr key={item.mes} className="hover:bg-gray-700/50 cursor-pointer" onClick={() => handleAbrirDetalleMes(item)}>
                        <td className="px-6 py-4 text-sm capitalize">{item.nombre_mes}</td>
                        <td className="px-6 py-4 text-sm text-green-400">${item.ingresos.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-red-400">${item.gastos.toFixed(2)}</td>
                        <td className={`px-6 py-4 text-sm ${item.utilidad >= 0 ? 'text-green-400' : 'text-red-400'}`}>${item.utilidad.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm"><button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs" onClick={(e) => { e.stopPropagation(); handleAbrirDetalleMes(item); }}>Ver Detalle</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* FACTURAS POR ORGANIZACIÓN */}
      {activeTab === 'facturas' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Facturas de: {selectedOrgNombre || 'Organización'}</h3>
            <button onClick={() => { reset(); setModalType('generarFactura'); setModalOpen(true); setValue('organizacion_id', selectedOrgId); }} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">+ Nueva Factura Membresía</button>
          </div>
          {loading ? <p className="text-center py-8">Cargando...</p> : (
            <>
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">N°</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th></tr></thead>
                  <tbody className="divide-y divide-gray-700">
                    {Array.isArray(facturasOrg) && facturasOrg.length > 0 ? facturasOrg.map(f => (
                      <tr key={f.id} className="hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm">{f.numero_correlativo}</td>
                        <td className="px-6 py-4 text-sm">{f.cliente_nombre}</td>
                        <td className="px-6 py-4 text-sm">{new Date(f.creado_en).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">${f.total_pagar}</td>
                        <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${f.estado === 'Pagada' ? 'bg-green-900/50 text-green-400' : f.estado === 'Anulada' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>{f.estado}</span></td>
                        <td className="action-cell">
                          <div className="btn-group">
                            <button onClick={() => handleDescargarPDF(f.id)} className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs">PDF</button>
                            {f.estado === 'Emitida' && (<><button onClick={() => handleCambiarEstadoFactura(f.id, 'Pagada')} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs">Pagar</button><button onClick={() => handleCancelarFactura(f.id)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">Cancelar</button></>)}
                            {f.estado === 'Pagada' && (<><button onClick={() => handleCambiarEstadoFactura(f.id, 'Emitida')} className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-xs">Reabrir</button><button onClick={() => handleCancelarFactura(f.id)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">Cancelar</button></>)}
                            {f.estado === 'Anulada' && <span className="text-red-400 text-xs">✖ Anulada</span>}
                          </div>
                          
                        </td>
                      </tr>
                    )) : <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-400">No hay facturas</td></tr>}
                  </tbody>
                </table>
              </div>
              {paginacionFacturas.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">{Array.from({ length: paginacionFacturas.totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => loadFacturasOrg(selectedOrgId, p)} className={`px-3 py-1 rounded ${p === paginacionFacturas.page ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{p}</button>))}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* FACTURAS EMITIDAS (GLOBAL) */}
      {activeTab === 'facturas-emitidas' && (
        <div>
          <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold">Facturas Emitidas (Global)</h3><button onClick={loadFacturasEmitidasGlobal} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">Refrescar</button></div>
          {loading ? <p className="text-center py-8">Cargando...</p> : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">N°</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Organización</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  {Array.isArray(facturasEmitidasGlobal) && facturasEmitidasGlobal.length > 0 ? facturasEmitidasGlobal.map(f => (
                    <tr key={f.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm">{f.numero_correlativo}</td>
                      <td className="px-6 py-4 text-sm">{f.cliente_nombre}</td>
                      <td className="px-6 py-4 text-sm">{f.organizacion_nombre}</td>
                      <td className="px-6 py-4 text-sm">{new Date(f.creado_en).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">${f.total_pagar}</td>
                      <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded-full text-xs bg-yellow-900/50 text-yellow-400">Emitida</span></td>
                      <td className="action-cell">
                        <div className="btn-group">
                          <button onClick={() => handleDescargarPDF(f.id)} className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs">PDF</button>
                          <button onClick={() => handleCambiarEstadoFactura(f.id, 'Pagada')} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs">Pagar</button>
                          <button onClick={() => handleCancelarFactura(f.id)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">Cancelar</button>
                        </div>
                        
                      </td>
                    </tr>
                  )) : <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-400">No hay facturas emitidas</td></tr>}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 p-2">Mostrando todas las facturas emitidas del sistema</p>
            </div>
          )}
        </div>
      )}

      {/* FACTURAS CANCELADAS */}
      {activeTab === 'facturas-canceladas' && (
        <div>
          <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold">Facturas Canceladas</h3><button onClick={loadFacturasCanceladas} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">Refrescar</button></div>
          {loading ? <p className="text-center py-8">Cargando...</p> : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">N°</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Organización</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  {Array.isArray(facturasCanceladas) && facturasCanceladas.length > 0 ? facturasCanceladas.map(f => (
                    <tr key={f.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm">{f.numero_correlativo}</td>
                      <td className="px-6 py-4 text-sm">{f.cliente_nombre}</td>
                      <td className="px-6 py-4 text-sm">{f.organizacion_nombre}</td>
                      <td className="px-6 py-4 text-sm">{new Date(f.creado_en).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">${f.total_pagar}</td>
                      <td className="px-6 py-4 text-sm"><button onClick={() => handleDescargarPDF(f.id)} className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs">PDF</button><span className="text-red-400 text-xs ml-1">✖ Anulada</span></td>
                    </tr>
                  )) : <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-400">No hay facturas canceladas</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONFIGURACIÓN SAAS */}
      {activeTab === 'configuracion' && (
        <div className="max-w-2xl mx-auto bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">Configuración de la Empresa SaaS</h3>
          <p className="text-sm text-gray-400 mb-4">Estos datos aparecerán como emisor en las facturas generadas desde el sistema.</p>
          {loading ? <p className="text-center py-8">Cargando configuración...</p> : configuracionSaaS ? (
            <form onSubmit={handleSubmit(onSubmitActualizarConfiguracion)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300">Nombre Empresa *</label><input {...register('nombre_empresa', { required: true })} defaultValue={configuracionSaaS.nombre_empresa || ''} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Nombre Comercial</label><input {...register('nombre_comercial')} defaultValue={configuracionSaaS.nombre_comercial || ''} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">NIT *</label><input {...register('nit', { required: true })} defaultValue={configuracionSaaS.nit || ''} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">NRC</label><input {...register('nrc')} defaultValue={configuracionSaaS.nrc || ''} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300">Dirección</label><input {...register('direccion')} defaultValue={configuracionSaaS.direccion || ''} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Teléfono</label><input {...register('telefono')} defaultValue={configuracionSaaS.telefono || ''} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Correo</label><input {...register('correo')} defaultValue={configuracionSaaS.correo || ''} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300">Logo URL</label><input {...register('logo_url')} defaultValue={configuracionSaaS.logo_url || ''} placeholder="https://ejemplo.com/logo.png" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg">Guardar Configuración</button></div>
            </form>
          ) : <p className="text-center py-4 text-gray-400">No se pudo cargar la configuración.</p>}
        </div>
      )}

      {/* ===== MODALES ===== */}

      {/* Registrar Pago */}
      {modalOpen && modalType === 'registrarPago' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Registrar Pago de Membresía</h3>
            <form onSubmit={handleSubmit(handleRegistrarPago)} className="space-y-4">
              <select {...register('organizacion_id', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="">Seleccionar organización</option>{Array.isArray(organizaciones) && organizaciones.map(org => <option key={org.id} value={org.id}>{org.nombre_empresa}</option>)}</select>
              <input {...register('monto', { required: true, min: 0.01 })} type="number" step="0.01" placeholder="Monto" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <div className="grid grid-cols-2 gap-2"><select {...register('mes_pagado', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2024, m-1).toLocaleString('es', { month: 'long' })}</option>)}</select><select {...register('anio_pagado', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">{[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => { setModalOpen(false); reset(); }} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">Registrar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Registrar Gasto */}
      {modalOpen && modalType === 'registrarGasto' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Registrar Gasto de Infraestructura</h3>
            <form onSubmit={handleSubmit(handleRegistrarGasto)} className="space-y-4">
              <input {...register('proveedor', { required: true })} placeholder="Proveedor" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('monto', { required: true, min: 0.01 })} type="number" step="0.01" placeholder="Monto" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('descripcion')} placeholder="Descripción (opcional)" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('fecha_gasto', { required: true })} type="date" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => { setModalOpen(false); reset(); }} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">Registrar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Generar Factura */}
      {modalOpen && modalType === 'generarFactura' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Generar Factura de Membresía</h3>
            <form onSubmit={handleSubmit(handleGenerarFacturaMembresia)} className="space-y-4">
              <select {...register('organizacion_id', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="">Seleccionar organización</option>{Array.isArray(organizaciones) && organizaciones.map(org => <option key={org.id} value={org.id}>{org.nombre_empresa}</option>)}</select>
              <input {...register('monto', { required: true, min: 0.01 })} type="number" step="0.01" placeholder="Monto" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('concepto')} placeholder="Concepto (opcional)" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => { setModalOpen(false); reset(); }} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Generar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Crear Usuario */}
      {modalOpen && modalType === 'crearUsuario' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-2">Crear Usuario para: {selectedOrgNombre || 'Organización'}</h3>
            <form onSubmit={handleSubmit(onSubmitCrearUsuario)} className="space-y-4">
              <input {...register('nombre', { required: true })} placeholder="Nombre" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('correo', { required: true })} type="email" placeholder="Correo" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <select {...register('rol')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Vendedor">Vendedor</option><option value="Admin">Admin</option><option value="Contador">Contador</option></select>
              <input {...register('password', { required: true, minLength: 6 })} type="password" placeholder="Contraseña" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => { setModalOpen(false); reset(); }} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Crear</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Crear 2 Usuarios */}
      {modalOpen && modalType === 'crearMultiples' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-2">Crear 2 Usuarios para: {selectedOrgNombre || 'Organización'}</h3>
            <form onSubmit={handleSubmit(onSubmitCrearMultiplesUsuarios)} className="space-y-4">
              <div className="border-b border-gray-600 pb-2 mb-2"><h4 className="text-sm font-medium text-blue-400">Usuario 1</h4><input {...register('nombre1', { required: true })} placeholder="Nombre" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1" /><input {...register('correo1', { required: true })} type="email" placeholder="Correo" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1" /><input {...register('password1', { required: true, minLength: 6 })} type="password" placeholder="Contraseña" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1" /><select {...register('rol1')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1"><option value="Vendedor">Vendedor</option><option value="Admin">Admin</option><option value="Contador">Contador</option></select></div>
              <div className="border-b border-gray-600 pb-2 mb-2"><h4 className="text-sm font-medium text-blue-400">Usuario 2</h4><input {...register('nombre2', { required: true })} placeholder="Nombre" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1" /><input {...register('correo2', { required: true })} type="email" placeholder="Correo" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1" /><input {...register('password2', { required: true, minLength: 6 })} type="password" placeholder="Contraseña" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1" /><select {...register('rol2')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mt-1"><option value="Vendedor">Vendedor</option><option value="Admin">Admin</option><option value="Contador">Contador</option></select></div>
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => { setModalOpen(false); reset(); }} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Crear</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Cambiar Password */}
      {modalOpen && modalType === 'cambiarPassword' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Cambiar Contraseña</h3>
            <form onSubmit={handleSubmit(onSubmitCambiarPassword)} className="space-y-4">
              <input {...register('usuario_id')} type="hidden" />
              <input {...register('nueva_contraseña', { required: true, minLength: 6 })} type="password" placeholder="Nueva Contraseña" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <label className="flex items-center gap-2"><input {...register('es_temporal')} type="checkbox" /><span className="text-sm">Contraseña temporal</span></label>
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => { setModalOpen(false); reset(); }} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Actualizar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Crear SuperAdmin */}
      {modalOpen && modalType === 'crearSuperAdmin' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Crear SuperAdmin</h3>
            <form onSubmit={handleSubmit(onSubmitCrearSuperAdmin)} className="space-y-4">
              <input {...register('nombre', { required: true })} placeholder="Nombre" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('correo', { required: true })} type="email" placeholder="Correo" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('password', { required: true, minLength: 6 })} type="password" placeholder="Contraseña" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => { setModalOpen(false); reset(); }} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Crear</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Editar SuperAdmin */}
      {modalOpen && modalType === 'editarSuperAdmin' && editSuperAdminData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Editar SuperAdmin</h3>
            <form onSubmit={handleSubmit(onSubmitEditarSuperAdmin)} className="space-y-4">
              <input {...register('edit_nombre', { required: true })} placeholder="Nombre" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('edit_correo', { required: true })} type="email" placeholder="Correo" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => { setModalOpen(false); reset(); setEditSuperAdminData(null); }} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Actualizar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Editar Organización - Modal */}
      {editOrgModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Editar Organización</h3>
            <form onSubmit={handleSubmit(onSubmitEditarOrganizacion)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300">Nombre Empresa *</label><input {...register('edit_nombre_empresa', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Nombre Comercial</label><input {...register('edit_nombre_comercial')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300">Dirección</label><input {...register('edit_direccion')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Teléfono</label><input {...register('edit_telefono')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Teléfono WhatsApp</label><input {...register('edit_telefono_whatsapp')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">NIT *</label><input {...register('edit_nit', { required: true })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">NRC</label><input {...register('edit_nrc')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Tipo Contribuyente</label><select {...register('edit_tipo_contribuyente')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Pequeño">Pequeño</option><option value="Mediano">Mediano</option><option value="Grande">Grande</option><option value="Exento">Exento</option></select></div>
                <div><label className="block text-sm font-medium text-gray-300">Tipo Organización</label><select {...register('edit_tipo_organizacion')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Empresa Comercial">Empresa Comercial</option><option value="Clínica General">Clínica General</option><option value="Clínica Dental">Clínica Dental</option><option value="Clinica Veterinaria">Clinica Veterinaria</option></select></div>
                <div><label className="block text-sm font-medium text-gray-300">Ambiente</label><select {...register('edit_ambiente')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Pruebas">Pruebas</option><option value="Producción">Producción</option></select></div>
                <div><label className="block text-sm font-medium text-gray-300">Token MH</label><input {...register('edit_token_mh')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300">Llave Privada P12</label><textarea {...register('edit_llave_privada_p12')} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Logo URL</label><input {...register('edit_logo_url')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" /></div>
              </div>
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => setEditOrgModal({ open: false, data: null })} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Actualizar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Editar Usuario - Modal */}
      {editUserModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold mb-2">Editar Usuario: {editUserModal.organizacionNombre}</h3>
            <form onSubmit={handleSubmit(onSubmitEditarUsuario)} className="space-y-4">
              <input {...register('edit_user_nombre', { required: true })} placeholder="Nombre" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <input {...register('edit_user_correo', { required: true })} type="email" placeholder="Correo" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              <select {...register('edit_user_rol')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Vendedor">Vendedor</option><option value="Admin">Admin</option><option value="Contador">Contador</option></select>
              <select {...register('edit_user_estado')} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select>
              <div className="flex justify-end space-x-2"><button type="button" onClick={() => setEditUserModal({ open: false, data: null })} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Actualizar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Detalle de Ingresos - Modal */}
      {detalleIngresosModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-4xl w-full border border-gray-700 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">📈 Detalle de Ingresos</h3><button onClick={() => setDetalleIngresosModal({ open: false, data: [] })} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">Cerrar</button></div>
            <div className="flex-1 overflow-y-auto">
              {detalleIngresosModal.loading ? <p className="text-center py-8">Cargando...</p> : detalleIngresosModal.data.length === 0 ? <p className="text-gray-400 text-center py-8">No hay ingresos registrados.</p> : (
                <table className="min-w-full divide-y divide-gray-700"><thead className="bg-gray-900 sticky top-0"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Organización</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Concepto</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Monto</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Factura</th></tr></thead><tbody className="divide-y divide-gray-700">{detalleIngresosModal.data.map((item, idx) => (<tr key={idx} className="hover:bg-gray-700/50"><td className="px-4 py-2 text-sm">{new Date(item.fecha).toLocaleDateString()}</td><td className="px-4 py-2 text-sm">{item.organizacion_nombre || 'N/A'}</td><td className="px-4 py-2 text-sm">{item.concepto || 'Membresía'}</td><td className="px-4 py-2 text-sm text-green-400">${Number(item.monto).toFixed(2)}</td><td className="px-4 py-2 text-sm">{item.factura_numero || '-'}</td></tr>))}</tbody></table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detalle de Gastos - Modal */}
      {detalleGastosModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-4xl w-full border border-gray-700 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">📉 Detalle de Gastos</h3><button onClick={() => setDetalleGastosModal({ open: false, data: [] })} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">Cerrar</button></div>
            <div className="flex-1 overflow-y-auto">
              {detalleGastosModal.loading ? <p className="text-center py-8">Cargando...</p> : detalleGastosModal.data.length === 0 ? <p className="text-gray-400 text-center py-8">No hay gastos registrados.</p> : (
                <>
                  <table className="min-w-full divide-y divide-gray-700"><thead className="bg-gray-900 sticky top-0"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Proveedor</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Descripción</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Monto</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Acción</th></tr></thead><tbody className="divide-y divide-gray-700">{detalleGastosModal.data.map((item, idx) => (<tr key={idx} className="hover:bg-gray-700/50"><td className="px-4 py-2 text-sm">{new Date(item.fecha).toLocaleDateString()}</td><td className="px-4 py-2 text-sm">{item.proveedor}</td><td className="px-4 py-2 text-sm">{item.descripcion || '-'}</td><td className="px-4 py-2 text-sm text-red-400">${Number(item.monto).toFixed(2)}</td><td className="px-4 py-2 text-sm"><button onClick={() => handleCancelarGasto(item.id)} className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs">Cancelar</button></td></tr>))}</tbody></table>
                  {detalleGastosModal.totalPages > 1 && (<div className="flex justify-center gap-2 mt-4">{Array.from({ length: detalleGastosModal.totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => loadDetalleGastos(p)} className={`px-3 py-1 rounded ${p === detalleGastosModal.page ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{p}</button>))}</div>)}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detalle de Mes - Modal */}
      {detalleMesModal.open && detalleMesModal.data && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Detalle del Mes: {detalleMesModal.data.nombre_mes}</h3>
            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded"><h4 className="font-semibold text-green-400 mb-2">📈 Ingresos: ${detalleMesModal.data.ingresos.toFixed(2)}</h4><p className="text-sm text-gray-300">{detalleMesModal.data.detalle_ingresos || 'Sin ingresos'}</p></div>
              <div className="bg-gray-700/50 p-4 rounded"><h4 className="font-semibold text-red-400 mb-2">📉 Gastos: ${detalleMesModal.data.gastos.toFixed(2)}</h4><p className="text-sm text-gray-300">{detalleMesModal.data.detalle_gastos || 'Sin gastos'}</p></div>
              <div className="bg-gray-700/50 p-4 rounded"><h4 className={`font-semibold ${detalleMesModal.data.utilidad >= 0 ? 'text-blue-400' : 'text-red-400'}`}>💰 Utilidad: ${detalleMesModal.data.utilidad.toFixed(2)}</h4></div>
            </div>
            <div className="flex justify-end mt-4"><button onClick={() => setDetalleMesModal({ open: false, mes: null, data: null })} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel;