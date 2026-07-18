import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const FacturaForm = () => {
  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      tipo_documento: 'FAF',
      items: [{ descripcion: '', cantidad: 1, precio_unitario: 0 }],
      descuento: 0,
      intereses_mora: 0,
    }
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [facturaCreada, setFacturaCreada] = useState(null);
  const [clienteInfo] = useState({}); // Si no lo usas, puedes eliminarlo o usarlo más adelante
  
  const tipoDoc = watch('tipo_documento');
  const items = watch('items');
  const descuento = watch('descuento');
  const interesesMora = watch('intereses_mora');

  // Cálculos en tiempo real
  const calcularTotales = () => {
    let subtotal = items.reduce((acc, item) => acc + (item.cantidad || 0) * (item.precio_unitario || 0), 0);
    let base = subtotal - (descuento || 0);
    let iva = base * 0.13;
    let retencion = 0;
    // Si es CCF y cliente Grande y base > 100
    if (tipoDoc === 'CCF' && clienteInfo.tipo_contribuyente === 'Grande' && base > 100) {
      retencion = base * 0.01;
    }
    let total = base + iva - retencion + (interesesMora || 0);
    return { subtotal, base, iva, retencion, total };
  };

  const totals = calcularTotales();

  const onSubmit = async (data) => {
    try {
      const payload = {
        cliente_id: data.cliente_id,
        tipo_documento: data.tipo_documento,
        items: data.items,
        descuento: data.descuento,
        intereses_mora: data.intereses_mora,
      };
      const res = await api.post('/facturas', payload);
      setFacturaCreada(res.data);
      toast.success('Factura creada exitosamente');
    } catch (error) {
      console.error('Error al crear factura:', error);
      toast.error('Error al crear factura: ' + error.message);
    }
  };

  const enviarWhatsApp = () => {
    if (!facturaCreada) return;
    const telefono = clienteInfo.telefono || '50300000000';
    const mensaje = `Hola, su factura N° ${facturaCreada.numero_correlativo} ha sido emitida. 
    Puede verla en: ${facturaCreada.enlace}`;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Crear Factura</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tipo documento */}
        <div>
          <label className="block font-medium">Tipo de Documento</label>
          <select {...register('tipo_documento')} className="border p-2 rounded w-full">
            <option value="FAF">Factura Consumidor Final (FAF)</option>
            <option value="CCF">Crédito Fiscal (CCF)</option>
          </select>
        </div>

        {/* Cliente */}
        <div>
          <label className="block font-medium">ID Cliente</label>
          <input {...register('cliente_id')} type="number" className="border p-2 rounded w-full" />
        </div>

        {/* Tabla de productos */}
        <div>
          <label className="block font-medium">Productos</label>
          <table className="w-full border">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td><input {...register(`items.${index}.descripcion`)} className="border p-1 w-full" /></td>
                  <td><input {...register(`items.${index}.cantidad`)} type="number" className="border p-1 w-20" /></td>
                  <td><input {...register(`items.${index}.precio_unitario`)} type="number" step="0.01" className="border p-1 w-24" /></td>
                  <td><button type="button" onClick={() => remove(index)} className="text-red-500">X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => append({ descripcion: '', cantidad: 1, precio_unitario: 0 })} className="mt-2 bg-blue-500 text-white px-3 py-1 rounded">
            Agregar Producto
          </button>
        </div>

        {/* Descuento e intereses */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Descuento</label>
            <input {...register('descuento')} type="number" step="0.01" className="border p-2 rounded w-full" />
          </div>
          <div>
            <label>Intereses Mora</label>
            <input {...register('intereses_mora')} type="number" step="0.01" className="border p-2 rounded w-full" />
          </div>
        </div>

        {/* Totales */}
        <div className="bg-gray-100 p-4 rounded">
          <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
          <p>Base imponible: ${totals.base.toFixed(2)}</p>
          <p>IVA (13%): ${totals.iva.toFixed(2)}</p>
          <p>Retención (1%): ${totals.retencion.toFixed(2)}</p>
          <p className="font-bold">Total a Pagar: ${totals.total.toFixed(2)}</p>
        </div>

        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">Guardar Factura</button>
      </form>

      {/* Modal de confirmación */}
      {facturaCreada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-xl font-bold">Factura Creada</h3>
            <p>N° {facturaCreada.numero_correlativo}</p>
            <p>Total: ${facturaCreada.total}</p>
            <div className="flex gap-4 mt-4">
              <button onClick={() => setFacturaCreada(null)} className="bg-gray-400 px-4 py-2 rounded">Cerrar</button>
              <button onClick={enviarWhatsApp} className="bg-green-500 text-white px-4 py-2 rounded flex items-center">
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturaForm;