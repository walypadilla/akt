// frontend/src/components/forms/PurchaseForm.jsx
import React, { useState, useEffect } from 'react';
import { getProveedores } from '../../api/proveedores';
import { getProductos } from '../../api/productos';
import { Plus, Trash2 } from 'lucide-react';

const PurchaseForm = ({ initialData = {}, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    proveedor_id: initialData.proveedor_id || '',
    proveedor_nombre: initialData.proveedor_nombre || '',
    tipo_documento: initialData.tipo_documento || 'Factura',
    numero_comprobante: initialData.numero_comprobante || '',
    tipo_egreso: initialData.tipo_egreso || 'Compra',
    descripcion: initialData.descripcion || '',
    fecha_registro: initialData.fecha_registro || new Date().toISOString().split('T')[0],
    url_comprobante_foto: initialData.url_comprobante_foto || '',
    tipo_comprobante: initialData.tipo_comprobante || 'Factura',
    estado_comprobante: initialData.estado_comprobante || 'Pendiente',
  });

  const [detalles, setDetalles] = useState(
    initialData.detalles || [{ producto_id: '', cantidad: 1, precio_unitario: 0 }]
  );
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [provs, prods] = await Promise.all([
          getProveedores(),
          getProductos(),
        ]);
        setProveedores(provs);
        setProductos(prods);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
    // Si cambia proveedor, actualizar nombre automáticamente
    if (name === 'proveedor_id') {
      const prov = proveedores.find(p => p.id == value);
      setFormData(prev => ({ ...prev, proveedor_nombre: prov ? prov.razon_social : '' }));
    }
  };

  const handleDetalleChange = (index, field, value) => {
    const newDetalles = [...detalles];
    newDetalles[index][field] = value;
    // Si cambia producto, actualizar precio automáticamente
    if (field === 'producto_id') {
      const prod = productos.find(p => p.id == value);
      if (prod) {
        newDetalles[index].precio_unitario = parseFloat(prod.precio_unitario) || 0;
      }
    }
    // Recalcular subtotal
    if (field === 'cantidad' || field === 'precio_unitario') {
      const cant = parseFloat(newDetalles[index].cantidad) || 0;
      const precio = parseFloat(newDetalles[index].precio_unitario) || 0;
      newDetalles[index].subtotal = cant * precio;
    }
    setDetalles(newDetalles);
  };

  const addDetalle = () => {
    setDetalles([...detalles, { producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
  };

  const removeDetalle = (index) => {
    if (detalles.length === 1) return;
    const newDetalles = detalles.filter((_, i) => i !== index);
    setDetalles(newDetalles);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.proveedor_id) newErrors.proveedor_id = 'Seleccione proveedor';
    if (!formData.numero_comprobante.trim()) newErrors.numero_comprobante = 'Requerido';
    // Validar detalles
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
      }
    }
    if (!hasProducts) {
      newErrors.detalles = 'Debe agregar al menos un producto';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Calcular totales
      let monto_subtotal = 0;
      let iva = 0;
      for (const d of detalles) {
        if (d.producto_id) {
          const subtotal = parseFloat(d.cantidad) * parseFloat(d.precio_unitario);
          d.subtotal = subtotal;
          monto_subtotal += subtotal;
          iva += subtotal * 0.13;
        }
      }
      const total = monto_subtotal + iva;
      onSubmit({ ...formData, detalles, monto_subtotal, iva_credito_fiscal: iva, total });
    }
  };

  // Calcular totales para mostrar
  const calcularTotales = () => {
    let subtotal = 0;
    let iva = 0;
    for (const d of detalles) {
      if (d.producto_id) {
        const cant = parseFloat(d.cantidad) || 0;
        const precio = parseFloat(d.precio_unitario) || 0;
        subtotal += cant * precio;
        iva += cant * precio * 0.13;
      }
    }
    return { subtotal, iva, total: subtotal + iva };
  };

  const totals = calcularTotales();

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
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.razon_social}</option>
            ))}
          </select>
          {errors.proveedor_id && <p className="text-red-400 text-xs mt-1">{errors.proveedor_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Proveedor (opcional)</label>
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
            <option value="Factura">Factura</option>
            <option value="Boleta">Boleta</option>
            <option value="Otro">Otro</option>
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
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">URL Comprobante Foto</label>
          <input
            type="text"
            name="url_comprobante_foto"
            value={formData.url_comprobante_foto}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-300">Productos</h4>
          <button
            type="button"
            onClick={addDetalle}
            className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
          >
            <Plus size={16} /> Agregar producto
          </button>
        </div>
        {errors.detalles && <p className="text-red-400 text-xs mb-2">{errors.detalles}</p>}
        {detalles.map((det, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <select
              value={det.producto_id}
              onChange={(e) => handleDetalleChange(index, 'producto_id', e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccionar producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} (${parseFloat(p.precio_unitario).toFixed(2)})</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={det.cantidad}
              onChange={(e) => handleDetalleChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
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
              ${(parseFloat(det.cantidad) * parseFloat(det.precio_unitario) || 0).toFixed(2)}
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
        <div className="flex justify-end text-gray-300 text-sm pt-2 border-t border-gray-700 mt-2">
          <div className="grid grid-cols-3 gap-4">
            <div>Subtotal: <span className="text-emerald-400">${totals.subtotal.toFixed(2)}</span></div>
            <div>IVA: <span className="text-yellow-400">${totals.iva.toFixed(2)}</span></div>
            <div>Total: <span className="text-purple-400 font-bold">${totals.total.toFixed(2)}</span></div>
          </div>
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