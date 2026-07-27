// frontend/src/components/forms/PurchaseForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

const PurchaseForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading,
  proveedores = [],
  productos = [],
}) => {
  const [formData, setFormData] = useState({
    proveedor_id: initialData.proveedor_id || '',
    proveedor_nombre: initialData.proveedor_nombre || '',
    tipo_documento: initialData.tipo_documento || 'Credito_Fiscal',
    numero_comprobante: initialData.numero_comprobante || '',
    uuid_dte: initialData.uuid_dte ? formatUUID(initialData.uuid_dte) : '',
    numero_control: initialData.numero_control ? formatNumeroControl(initialData.numero_control) : '',
    tipo_egreso: initialData.tipo_egreso || 'Compra',
    descripcion: initialData.descripcion || '',
    fecha_registro: initialData.fecha_registro || new Date().toISOString().split('T')[0],
    url_comprobante_foto: initialData.url_comprobante_foto || '',
    tipo_comprobante: initialData.tipo_comprobante || 'Factura',
    estado_comprobante: initialData.estado_comprobante || 'Pendiente',
    condicion_operacion: initialData.condicion_operacion || 'Contado',
    fecha_vencimiento: initialData.fecha_vencimiento || '',
    retencion_iva: initialData.retencion_iva || 0,
    percepcion_iva: initialData.percepcion_iva || 0,
    es_importacion: initialData.es_importacion || false,
    es_dte: initialData.uuid_dte || initialData.numero_control ? true : false,
  });

  // Estado para el autocomplete de productos
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [detalles, setDetalles] = useState(
    initialData.detalles || [{ producto_id: '', cantidad: 1, precio_unitario: 0 }]
  );
  const [errors, setErrors] = useState({});

  const searchInputRef = useRef(null);

  // Obtener el proveedor seleccionado
  const selectedProveedor = proveedores.find(p => p.id == formData.proveedor_id);

  // Funciones de formateo
  const formatUUID = (value) => {
    const clean = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 32);
    const parts = [];
    for (let i = 0; i < clean.length; i++) {
      if (i === 8 || i === 12 || i === 16 || i === 20) parts.push('-');
      parts.push(clean[i]);
    }
    return parts.join('');
  };

  const formatNumeroControl = (value) => {
    let clean = value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    if (!clean.startsWith('DTE')) {
      clean = 'DTE' + clean;
    }
    const rest = clean.substring(3); // quitamos "DTE"
    const tipo = rest.substring(0, 2);
    const establecimiento = rest.substring(2, 10);
    const correlativo = rest.substring(10, 23); // máximo 13
    let result = 'DTE';
    if (tipo) result += '-' + tipo;
    if (establecimiento) result += '-' + establecimiento;
    if (correlativo) result += '-' + correlativo;
    return result;
  };

  // Calcular percepción y retención automáticamente
  useEffect(() => {
    if (!selectedProveedor || !formData.tipo_documento) return;

    // Calcular subtotal base para aplicar percepciones/retenciones
    let montoBase = 0;
    for (const d of detalles) {
      if (d.producto_id) {
        montoBase += (parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0);
      }
    }

    // Si es Crédito Fiscal, aplicar lógica
    if (formData.tipo_documento === 'Credito_Fiscal') {
      const esGranContribuyente = selectedProveedor.tipo_contribuyente === 'Grande';
      const esEmpresaGran = false; // Esto vendría del perfil de la organización

      // Percepción (1%) - proveedor es Gran Contribuyente y monto >= 100
      if (esGranContribuyente && montoBase >= 100) {
        const percepcionCalculada = montoBase * 0.01;
        setFormData(prev => ({
          ...prev,
          percepcion_iva: parseFloat(percepcionCalculada.toFixed(2)),
        }));
      } else {
        setFormData(prev => ({ ...prev, percepcion_iva: 0 }));
      }

      // Retención (1%) - la empresa es Gran Contribuyente y proveedor NO es Grande
      // Aquí necesitamos saber si la organización es Gran Contribuyente
      // Por ahora lo dejamos manual, pero se puede agregar un flag
    }
  }, [selectedProveedor, detalles, formData.tipo_documento]);

  // Filtrar productos (excluir kits)
  const productosFiltrados = productos.filter(p => p.es_kit !== 1 && p.activo === 1);
  const productosSugeridos = searchTerm.trim() !== ''
    ? productosFiltrados.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.codigo_sku && p.codigo_sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: val });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleDetalleChange = (index, field, value) => {
    const newDetalles = [...detalles];
    newDetalles[index][field] = value;
    if (field === 'cantidad') {
      // Asegurar que sea entero
      newDetalles[index].cantidad = Math.floor(Math.max(0, parseInt(value) || 0));
    }
    if (field === 'cantidad' || field === 'precio_unitario') {
      const cant = parseInt(newDetalles[index].cantidad) || 0;
      const precio = parseFloat(newDetalles[index].precio_unitario) || 0;
      newDetalles[index].subtotal = cant * precio;
    }
    setDetalles(newDetalles);
  };

  // Manejadores para los inputs específicos
  const handleUUIDChange = (e) => {
    const raw = e.target.value;
    if (raw.length > 36) return; 
    const formatted = formatUUID(raw);
    setFormData(prev => ({ ...prev, uuid_dte: formatted }));
  };

  const handleNumeroControlChange = (e) => {
    const raw = e.target.value;
    if (raw.length > 29) return; // límite de 29 caracteres
    const formatted = formatNumeroControl(raw);
    setFormData(prev => ({ ...prev, numero_control: formatted }));
  };


  const addDetalleConProducto = (producto) => {
    setDetalles([...detalles, {
      producto_id: producto.id,
      cantidad: 1,
      precio_unitario: parseFloat(producto.precio_unitario) || 0,
      subtotal: parseFloat(producto.precio_unitario) || 0,
    }]);
    setSearchTerm('');
    setShowProductDropdown(false);
    setSelectedProduct(null);
  };

  const addDetalleVacio = () => {
    setDetalles([...detalles, { producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
  };

  const removeDetalle = (index) => {
    if (detalles.length === 1) return;
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.proveedor_id) newErrors.proveedor_id = 'Seleccione proveedor';
    if (!formData.numero_comprobante.trim()) newErrors.numero_comprobante = 'Requerido';
    if (formData.es_dte && !formData.uuid_dte) newErrors.uuid_dte = 'UUID requerido para DTE';
    if (formData.condicion_operacion === 'Credito' && !formData.fecha_vencimiento) {
      newErrors.fecha_vencimiento = 'Fecha de vencimiento requerida para crédito';
    }
    let hasProducts = false;
    for (const d of detalles) {
      if (d.producto_id) {
        hasProducts = true;
        if (d.cantidad <= 0) newErrors.detalles = 'Cantidad debe ser > 0';
        if (d.precio_unitario < 0) newErrors.detalles = 'Precio no puede ser negativo';
      }
    }
    if (!hasProducts) newErrors.detalles = 'Agregue al menos un producto';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      let monto_subtotal = 0;
      let iva = 0;
      for (const d of detalles) {
        if (d.producto_id) {
          const subtotal = parseInt(d.cantidad) * parseFloat(d.precio_unitario);
          d.subtotal = subtotal;
          monto_subtotal += subtotal;
          if (formData.tipo_documento === 'Credito_Fiscal') {
            iva += subtotal * 0.13;
          }
        }
      }
      const total = monto_subtotal + iva + (parseFloat(formData.percepcion_iva) || 0) - (parseFloat(formData.retencion_iva) || 0);
      const data = {
        ...formData,
        detalles,
        monto_subtotal,
        iva_credito_fiscal: iva,
        total,
        es_importacion: formData.es_importacion ? 1 : 0,
      };
      onSubmit(data);
    }
  };

  const esCreditoFiscal = formData.tipo_documento === 'Credito_Fiscal';
  const isDTE = formData.es_dte;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Proveedor *</label>
          <select
            name="proveedor_id"
            value={formData.proveedor_id}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.proveedor_id ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value="">Seleccionar</option>
            {/* AQUÍ ESTÁ EL CAMBIO: Agregamos el filter antes del map */}
            {proveedores.filter(p => p.activo === 1).map((p) => (
              <option key={p.id} value={p.id}>{p.razon_social} {p.numero_documento ? `(${p.numero_documento})` : ''}</option>
            ))}
          </select>
          {errors.proveedor_id && <p className="text-red-400 text-xs mt-1">{errors.proveedor_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Proveedor</label>
          <input
            type="text"
            name="proveedor_nombre"
            value={formData.proveedor_nombre}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Documento</label>
          <select
            name="tipo_documento"
            value={formData.tipo_documento}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Credito_Fiscal">Crédito Fiscal (CCF)</option>
            <option value="Consumidor_Final">Consumidor Final</option>
            <option value="Sujeto_Excluido">Sujeto Excluido</option>
            <option value="Recibo">Recibo / Ticket</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">N° Comprobante *</label>
          <input
            type="text"
            name="numero_comprobante"
            value={formData.numero_comprobante}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.numero_comprobante ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.numero_comprobante && <p className="text-red-400 text-xs mt-1">{errors.numero_comprobante}</p>}
        </div>

        {/* Toggle DTE */}
        <div className="md:col-span-2 flex items-center gap-3 bg-gray-700/40 p-2 rounded-lg border border-gray-600">
          <input
            type="checkbox"
            name="es_dte"
            checked={isDTE}
            onChange={(e) => setFormData({ ...formData, es_dte: e.target.checked, uuid_dte: '', numero_control: '' })}
            className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
          />
          <label className="text-sm text-gray-300">Es un DTE (Electrónico)</label>
        </div>

        {isDTE && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">UUID (Código Generación) *</label>
              <input
                type="text"
                name="uuid_dte"
                value={formData.uuid_dte}
                onChange={handleUUIDChange}
                maxLength={36}
                placeholder="00000000-0000-0000-0000-000000000000"
                className={`w-full px-3 py-2 bg-gray-700 border ${errors.uuid_dte ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
              {errors.uuid_dte && <p className="text-red-400 text-xs mt-1">{errors.uuid_dte}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Número de Control</label>
              <input
                type="text"
                name="numero_control"
                value={formData.numero_control}
                onChange={handleNumeroControlChange}
                maxLength={29}
                placeholder="DTE-03-00000000-0000000000123"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Egreso</label>
          <select
            name="tipo_egreso"
            value={formData.tipo_egreso}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Compra">Compra</option>
            <option value="Gasto_Operativo">Gasto Operativo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Registro *</label>
          <input
            type="date"
            name="fecha_registro"
            value={formData.fecha_registro}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Condición de Operación</label>
          <select
            name="condicion_operacion"
            value={formData.condicion_operacion}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Contado">Contado</option>
            <option value="Credito">Crédito</option>
          </select>
        </div>
        {formData.condicion_operacion === 'Credito' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Vencimiento *</label>
            <input
              type="date"
              name="fecha_vencimiento"
              value={formData.fecha_vencimiento}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-gray-700 border ${errors.fecha_vencimiento ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
            {errors.fecha_vencimiento && <p className="text-red-400 text-xs mt-1">{errors.fecha_vencimiento}</p>}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Importación</label>
          <select
            name="es_importacion"
            value={formData.es_importacion ? '1' : '0'}
            onChange={(e) => setFormData({ ...formData, es_importacion: e.target.value === '1' })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="0">Local</option>
            <option value="1">Importación</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Retención IVA (1%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="retencion_iva"
            value={formData.retencion_iva}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">Si tu empresa es Gran Contribuyente, retén 1% a proveedores Pequeños/Medianos</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Percepción IVA (1%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="percepcion_iva"
            value={formData.percepcion_iva}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">Si el proveedor es Gran Contribuyente, te cobrará 1% de percepción</p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Detalles de productos con autocomplete */}
      <div className="border-t border-gray-700 p-2">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-300">Productos</h4>
          <button
            type="button"
            onClick={addDetalleVacio}
            className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
          >
            <Plus size={16} /> Agregar producto
          </button>
        </div>
        {errors.detalles && <p className="text-red-400 text-xs mb-2">{errors.detalles}</p>}
        
        {/* Autocomplete de productos */}
        <div className="relative mb-3">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowProductDropdown(true);
            }}
            onFocus={() => setShowProductDropdown(true)}
            placeholder="Buscar producto por nombre o SKU..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {showProductDropdown && searchTerm.trim() !== '' && productosSugeridos.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg max-h-40 overflow-y-auto shadow-lg">
              {productosSugeridos.map((p) => (
                <li
                  key={p.id}
                  onClick={() => addDetalleConProducto(p)}
                  className="px-3 py-2 hover:bg-purple-600/40 text-white text-xs cursor-pointer transition flex justify-between"
                >
                  <span>{p.nombre}</span>
                  <span className="text-emerald-400">${parseFloat(p.precio_unitario).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
          {showProductDropdown && searchTerm.trim() !== '' && productosSugeridos.length === 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-gray-400 text-xs">
              No se encontraron productos
            </div>
          )}
        </div>

        {detalles.map((det, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <select
              value={det.producto_id}
              onChange={(e) => handleDetalleChange(index, 'producto_id', e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccionar producto</option>
              {productosFiltrados.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} (${parseFloat(p.precio_unitario).toFixed(2)})</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="1"
              value={det.cantidad}
              onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)}
              className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Cant"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={det.precio_unitario}
              onChange={(e) => handleDetalleChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Precio"
            />
            <span className="text-gray-300 text-sm w-20 text-right">
              ${(parseInt(det.cantidad) * parseFloat(det.precio_unitario) || 0).toFixed(2)}
            </span>
            {detalles.length > 1 && (
              <button
                type="button"
                onClick={() => removeDetalle(index)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="flex justify-end text-gray-300 text-sm p-2 border-t border-gray-700 mt-2">
        <div className="grid grid-cols-4 gap-4 text-right">
          <div>Subtotal: <span className="text-emerald-400 font-bold">${(detalles.reduce((acc, d) => acc + (parseInt(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0), 0)).toFixed(2)}</span></div>
          {esCreditoFiscal && (
            <div>IVA (13%): <span className="text-yellow-400 font-bold">${(detalles.reduce((acc, d) => acc + (parseInt(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0), 0) * 0.13).toFixed(2)}</span></div>
          )}
          <div>Percepción: <span className="text-blue-400 font-bold">${parseFloat(formData.percepcion_iva || 0).toFixed(2)}</span></div>
          <div>Total: <span className="text-purple-400 font-bold">${(detalles.reduce((acc, d) => acc + (parseInt(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0), 0) + (esCreditoFiscal ? detalles.reduce((acc, d) => acc + (parseInt(d.cantidad) || 0) * (parseFloat(d.precio_unitario) || 0), 0) * 0.13 : 0) + (parseFloat(formData.percepcion_iva) || 0) - (parseFloat(formData.retencion_iva) || 0)).toFixed(2)}</span></div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default PurchaseForm;