// frontend/src/components/forms/InvoiceForm.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Select from 'react-select';
import ConfirmModal from '../common/ConfirmModal';
import { getComponentesKit } from '../../api/productos';

const MEDIOS_PAGO = ['Efectivo', 'Tarjeta Débito/Crédito', 'Transferencia Bancaria', 'Cheque', 'Otro'];

const InvoiceForm = ({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  loading = false,
  clientes = [],
  productos = [],
}) => {
  const [formData, setFormData] = useState({
    cliente_id: initialData.cliente_id || '',
    tipo_documento: initialData.tipo_documento || 'FAF',
    descuento: initialData.descuento || 0,
    intereses_mora: initialData.intereses_mora || 0,
    estado: initialData.estado || 'Emitida',
    condicion_operacion: initialData.condicion_operacion || 'Contado',
    plazo_credito: initialData.plazo_credito || '',
    fecha_vencimiento: initialData.fecha_vencimiento || '',
    medio_pago: initialData.medio_pago || '',
    observaciones: initialData.observaciones || '',
    retencion_1: initialData.retencion_1 || 0,
    percepcion_1: initialData.percepcion_1 || 0,
    bodega_id: initialData.bodega_id || null,
  });

  const [detalles, setDetalles] = useState(
    initialData.detalles && initialData.detalles.length > 0
      ? initialData.detalles
      : [{ producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0, iva: 0, tipo_venta: 'Gravado', descuento_item: 0, unidad_medida: '59' }]
  );
  const [errors, setErrors] = useState({});
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [componentesKit, setComponentesKit] = useState([]);
  const [kitSeleccionadoIndex, setKitSeleccionadoIndex] = useState(null);

  const clienteOptions = clientes.map(c => ({
    value: c.id,
    label: `${c.nombre} - ${c.nit || 'Sin NIT'}`,
  }));

  const productoOptions = productos.map(p => ({
    value: p.id,
    label: `${p.nombre} ($${parseFloat(p.precio_unitario).toFixed(2)}) - Stock: ${p.stock_actual || 0}`,
    precio: parseFloat(p.precio_unitario),
    unidad: p.unidad_medida || '59',
    stock: p.stock_actual || 0,
    es_kit: p.es_kit || false,
  }));

  useEffect(() => {
    if (formData.condicion_operacion === 'Credito' && formData.plazo_credito) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + parseInt(formData.plazo_credito));
      setFormData(prev => ({
        ...prev,
        fecha_vencimiento: fecha.toISOString().split('T')[0],
      }));
    } else if (formData.condicion_operacion === 'Contado') {
      setFormData(prev => ({
        ...prev,
        fecha_vencimiento: '',
        plazo_credito: '',
      }));
    }
  }, [formData.condicion_operacion, formData.plazo_credito]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let val = value;
    if (type === 'number') val = parseFloat(value) || 0;
    setFormData({ ...formData, [name]: val });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleClienteSelect = (option) => {
    setFormData({ ...formData, cliente_id: option ? option.value : '' });
    if (errors.cliente_id) setErrors({ ...errors, cliente_id: '' });
  };

  const handleMedioPagoChange = (medio) => {
    setFormData({ ...formData, medio_pago: medio });
  };

  const handleDetalleChange = (index, field, value) => {
    const newDetalles = [...detalles];
    newDetalles[index][field] = value;
    const cant = parseFloat(newDetalles[index].cantidad) || 0;
    const precio = parseFloat(newDetalles[index].precio_unitario) || 0;
    const descItem = parseFloat(newDetalles[index].descuento_item) || 0;
    const subtotal = cant * precio - descItem;
    newDetalles[index].subtotal = subtotal;
    newDetalles[index].iva = newDetalles[index].tipo_venta === 'Gravado' ? subtotal * 0.13 : 0;
    setDetalles(newDetalles);
  };

  const handleProductoSelect = async (index, option) => {
    const newDetalles = [...detalles];
    newDetalles[index].producto_id = option ? option.value : '';
    newDetalles[index].precio_unitario = option ? option.precio : 0;
    newDetalles[index].unidad_medida = option ? option.unidad : '59';
    newDetalles[index].stock_disponible = option ? option.stock : 0;
    const cant = parseFloat(newDetalles[index].cantidad) || 0;
    const precio = parseFloat(newDetalles[index].precio_unitario) || 0;
    const descItem = parseFloat(newDetalles[index].descuento_item) || 0;
    const subtotal = cant * precio - descItem;
    newDetalles[index].subtotal = subtotal;
    newDetalles[index].iva = newDetalles[index].tipo_venta === 'Gravado' ? subtotal * 0.13 : 0;
    setDetalles(newDetalles);

    // Cargar componentes si es kit
    if (option && option.es_kit) {
      try {
        const comps = await getComponentesKit(option.value);
        setComponentesKit(comps);
        setKitSeleccionadoIndex(index);
      } catch (error) {
        console.error('Error cargando componentes del kit:', error);
        setComponentesKit([]);
        setKitSeleccionadoIndex(null);
      }
    } else {
      setComponentesKit([]);
      setKitSeleccionadoIndex(null);
    }

    // Validar stock
    if (option && cant > option.stock) {
      setErrors(prev => ({ ...prev, detalles: `Stock insuficiente. Disponible: ${option.stock}` }));
    } else {
      setErrors(prev => ({ ...prev, detalles: '' }));
    }
  };

  const addDetalle = () => {
    setDetalles([...detalles, { producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0, iva: 0, tipo_venta: 'Gravado', descuento_item: 0, unidad_medida: '59' }]);
    setComponentesKit([]);
    setKitSeleccionadoIndex(null);
  };

  const removeDetalle = (index) => {
    if (detalles.length === 1) return;
    setDetalles(detalles.filter((_, i) => i !== index));
    if (kitSeleccionadoIndex === index) {
      setComponentesKit([]);
      setKitSeleccionadoIndex(null);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.cliente_id) newErrors.cliente_id = 'Seleccione un cliente';
    if (formData.condicion_operacion === 'Credito' && !formData.plazo_credito) {
      newErrors.plazo_credito = 'Ingrese el plazo de crédito';
    }
    if (!formData.medio_pago) newErrors.medio_pago = 'Seleccione un medio de pago';
    let hasProducts = false;
    for (const d of detalles) {
      if (d.producto_id) {
        hasProducts = true;
        if (d.cantidad <= 0) {
          newErrors.detalles = 'Cantidad debe ser mayor a 0';
          break;
        }
        if (d.precio_unitario < 0) {
          newErrors.detalles = 'Precio no puede ser negativo';
          break;
        }
        if (d.stock_disponible !== undefined && d.cantidad > d.stock_disponible) {
          newErrors.detalles = `Stock insuficiente. Disponible: ${d.stock_disponible}`;
          break;
        }
      }
    }
    if (!hasProducts) newErrors.detalles = 'Debe agregar al menos un producto';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calcularTotales = () => {
    let subtotal = 0, iva = 0, iva0 = 0, ivaNoSujeto = 0;
    for (const d of detalles) {
      if (d.producto_id) {
        const cant = parseFloat(d.cantidad) || 0;
        const precio = parseFloat(d.precio_unitario) || 0;
        const descItem = parseFloat(d.descuento_item) || 0;
        const subtotalItem = cant * precio - descItem;
        subtotal += subtotalItem;
        if (d.tipo_venta === 'Gravado') iva += subtotalItem * 0.13;
        else if (d.tipo_venta === 'Exento') iva0 += subtotalItem;
        else if (d.tipo_venta === 'No_Sujeto') ivaNoSujeto += subtotalItem;
      }
    }
    const descuento = parseFloat(formData.descuento) || 0;
    const intereses = parseFloat(formData.intereses_mora) || 0;
    const retencion = parseFloat(formData.retencion_1) || 0;
    const percepcion = parseFloat(formData.percepcion_1) || 0;
    const total = subtotal - descuento + iva + intereses - retencion + percepcion;
    return { subtotal, iva, iva0, ivaNoSujeto, descuento, intereses, retencion, percepcion, total };
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const totals = calcularTotales();
    const payload = {
      ...formData,
      subtotal_sumas: totals.subtotal,
      iva_13: totals.iva,
      iva_0: totals.iva0,
      iva_no_sujeto: totals.ivaNoSujeto,
      total_pagar: totals.total,
      medio_pago: formData.medio_pago,
      detalles: detalles.map(d => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal,
        iva: d.iva,
        tipo_venta: d.tipo_venta,
        descuento_item: d.descuento_item || 0,
        unidad_medida: d.unidad_medida || '59',
      })),
    };

    const action = formData.estado === 'Pagada' ? 'generar y pagar' : 'emitir';
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Factura',
      message: `¿Está seguro de ${action} esta factura por $${totals.total.toFixed(2)}?`,
      onConfirm: async () => {
        await onSubmit(payload);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const totals = calcularTotales();

  return (
    <div className="space-y-6">
      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Cliente *</label>
        <Select
          options={clienteOptions}
          value={clienteOptions.find(opt => opt.value === formData.cliente_id) || null}
          onChange={handleClienteSelect}
          placeholder="Buscar cliente..."
          isClearable
          className="react-select-container"
          classNamePrefix="react-select"
          theme={(theme) => ({
            ...theme,
            colors: {
              ...theme.colors,
              primary: '#8b5cf6',
              primary25: '#4c1d95',
              primary50: '#6d28d9',
              neutral0: '#1f2937',
              neutral5: '#374151',
              neutral10: '#4b5563',
              neutral20: '#6b7280',
              neutral30: '#9ca3af',
              neutral40: '#d1d5db',
              neutral50: '#e5e7eb',
              neutral60: '#f3f4f6',
              neutral70: '#f9fafb',
              neutral80: '#ffffff',
              neutral90: '#ffffff',
            },
          })}
        />
        {errors.cliente_id && <p className="text-red-400 text-xs mt-1">{errors.cliente_id}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Documento</label>
          <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="FAF">FAF (Consumidor Final)</option>
            <option value="CCF">CCF (Contribuyente)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
          <select name="estado" value={formData.estado} onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="Borrador">Borrador</option>
            <option value="Emitida">Emitida (Cuentas por Cobrar)</option>
            <option value="Pagada">Pagada</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Condición de Operación</label>
          <select name="condicion_operacion" value={formData.condicion_operacion} onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="Contado">Contado</option>
            <option value="Credito">Crédito</option>
          </select>
        </div>
        {formData.condicion_operacion === 'Credito' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Plazo de Crédito (días) *</label>
              <input type="number" min="1" name="plazo_credito" value={formData.plazo_credito} onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border ${errors.plazo_credito ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`} />
              {errors.plazo_credito && <p className="text-red-400 text-xs mt-1">{errors.plazo_credito}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de Vencimiento</label>
              <input type="date" value={formData.fecha_vencimiento} readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-400" />
            </div>
          </>
        )}
      </div>

      {/* Medios de Pago */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Método de Pago *</label>
        <div className="flex flex-wrap gap-2">
          {MEDIOS_PAGO.map((medio) => {
            const colores = {
              'Efectivo': 'border-green-500 text-green-400 hover:bg-green-900/30',
              'Tarjeta Débito/Crédito': 'border-blue-500 text-blue-400 hover:bg-blue-900/30',
              'Transferencia Bancaria': 'border-cyan-500 text-cyan-400 hover:bg-cyan-900/30',
              'Cheque': 'border-yellow-500 text-yellow-400 hover:bg-yellow-900/30',
              'Otro': 'border-gray-500 text-gray-400 hover:bg-gray-700/50',
            };
            const isActive = formData.medio_pago === medio;
            return (
              <button
                key={medio}
                type="button"
                onClick={() => handleMedioPagoChange(medio)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition border-2 ${
                  isActive
                    ? `bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/50 scale-105 ${colores[medio].split(' ').slice(2).join(' ')}`
                    : `bg-gray-700 text-gray-300 ${colores[medio]}`
                }`}
              >
                {medio}
              </button>
            );
          })}
        </div>
        {errors.medio_pago && <p className="text-red-400 text-xs mt-1">{errors.medio_pago}</p>}
      </div>

      {/* Descuento, Intereses, Retención, Percepción */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Descuento Global ($)</label>
          <input type="number" min="0" step="0.01" name="descuento" value={formData.descuento} onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Intereses Mora ($)</label>
          <input type="number" min="0" step="0.01" name="intereses_mora" value={formData.intereses_mora} onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Retención IVA 1% ($)</label>
          <input type="number" min="0" step="0.01" name="retencion_1" value={formData.retencion_1} onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Percepción IVA 1% ($)</label>
          <input type="number" min="0" step="0.01" name="percepcion_1" value={formData.percepcion_1} onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Observaciones / Notas</label>
        <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows="2"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Notas adicionales..." />
      </div>

      {/* Productos con stock visible */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-medium text-gray-300">Productos / Servicios</h4>
          <button type="button" onClick={addDetalle} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
            <Plus size={16} /> Agregar producto
          </button>
        </div>
        {errors.detalles && <p className="text-red-400 text-xs mb-2">{errors.detalles}</p>}

        {/* Cabecera */}
        <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-gray-400 px-1">
          <div className="col-span-3">Producto</div>
          <div className="col-span-1 text-center">Cant.</div>
          <div className="col-span-2 text-center">Precio</div>
          <div className="col-span-1 text-center">Desc.</div>
          <div className="col-span-2 text-center">Tipo IVA</div>
          <div className="col-span-2 text-right">Subtotal</div>
          <div className="col-span-1 text-center">Acción</div>
        </div>

        {detalles.map((det, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <div className="col-span-3">
              <Select
                options={productoOptions}
                value={productoOptions.find(opt => opt.value === det.producto_id) || null}
                onChange={(option) => handleProductoSelect(index, option)}
                placeholder="Buscar..."
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
                theme={(theme) => ({ ...theme, colors: { ...theme.colors, primary: '#8b5cf6', primary25: '#4c1d95', neutral0: '#1f2937' } })}
              />
              {det.producto_id && (
                <span className="text-xs text-gray-400 mt-1 block">
                  Stock: {det.stock_disponible || 0}
                </span>
              )}
              {/* Mostrar componentes del kit */}
              {componentesKit.length > 0 && kitSeleccionadoIndex === index && (
                <div className="text-xs text-gray-400 mt-1 bg-gray-700/30 p-1 rounded">
                  <span className="font-semibold">Componentes:</span>
                  {componentesKit.map(comp => (
                    <span key={comp.id} className="ml-2">
                      {comp.componente_nombre} x{comp.cantidad}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <input type="number" min="0" step="1" value={det.cantidad} onChange={(e) => handleDetalleChange(index, 'cantidad', parseInt(e.target.value) || 0)}
              className="col-span-1 w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <input type="number" min="0" step="0.01" value={det.precio_unitario} onChange={(e) => handleDetalleChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
              className="col-span-2 w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <input type="number" min="0" step="0.01" value={det.descuento_item || 0} onChange={(e) => handleDetalleChange(index, 'descuento_item', parseFloat(e.target.value) || 0)}
              className="col-span-1 w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <select value={det.tipo_venta} onChange={(e) => handleDetalleChange(index, 'tipo_venta', e.target.value)}
              className="col-span-2 w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="Gravado">Gravado (13%)</option>
              <option value="Exento">Exento</option>
              <option value="No_Sujeto">No Sujeto</option>
            </select>
            <span className="col-span-2 text-gray-300 text-sm text-right font-mono">${(det.subtotal || 0).toFixed(2)}</span>
            <div className="col-span-1 text-center">
              {detalles.length > 1 && (
                <button type="button" onClick={() => removeDetalle(index)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Totales */}
        <div className="flex justify-end text-gray-300 text-sm pt-2 border-t border-gray-700 mt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>Subtotal: <span className="text-emerald-400">${totals.subtotal.toFixed(2)}</span></div>
            <div>IVA 13%: <span className="text-yellow-400">${totals.iva.toFixed(2)}</span></div>
            <div>Descuento: <span className="text-rose-400">${totals.descuento.toFixed(2)}</span></div>
            <div>Total: <span className="text-purple-400 font-bold">${totals.total.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 mt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
          {loading ? 'Guardando...' : initialData.id ? 'Actualizar' : 'Crear Factura'}
        </button>
      </div>

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

export default InvoiceForm;