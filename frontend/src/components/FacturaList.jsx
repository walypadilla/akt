// frontend/src/components/FacturaList.jsx
import { useState, useEffect } from 'react';
import {
  getUltimasFacturas,
  buscarFacturas,
  cambiarEstadoFactura,
  editarFactura,
  descargarPDF,
  obtenerFactura
} from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { saveAs } from 'file-saver';

const FacturaList = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    cliente_id: '',
    monto_min: '',
    monto_max: '',
    mes: '',
    anio: '',
    estado: '',
    tipo_documento: ''
  });
  const [modal, setModal] = useState({ open: false, factura: null, action: 'view' });
  const [editarData, setEditarData] = useState({ descuento: '', intereses_mora: '' });

  // Cargar facturas al montar el componente
  useEffect(() => {
    const cargarFacturas = async () => {
      setLoading(true);
      try {
        const hasFilters = Object.values(filtros).some(v => v !== '');
        let res;
        if (hasFilters) {
          res = await buscarFacturas(filtros);
        } else {
          res = await getUltimasFacturas(14);
        }
        setFacturas(res.data);
      } catch (error) {
        toast.error('Error al cargar facturas: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  // Manejar cambio en los filtros
  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  // Buscar con filtros aplicados
  const handleBuscar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await buscarFacturas(filtros);
      setFacturas(res.data);
    } catch (error) {
      toast.error('Error en la búsqueda: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado de una factura
  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await cambiarEstadoFactura(id, nuevoEstado);
      toast.success('Estado actualizado');
      // Recargar lista
      const res = await getUltimasFacturas(14);
      setFacturas(res.data);
    } catch (error) {
      toast.error('Error al cambiar estado: ' + error.message);
    }
  };

  // Abrir modal de edición o vista
  const openModal = async (id, action) => {
    try {
      const res = await obtenerFactura(id);
      const factura = res.data;
      setEditarData({ descuento: factura.descuento, intereses_mora: factura.intereses_mora });
      setModal({ open: true, factura, action });
    } catch (error) {
      toast.error('Error al obtener detalles: ' + error.message);
    }
  };

  // Editar factura (descuento e intereses)
  const handleEditar = async (id) => {
    try {
      await editarFactura(id, editarData);
      toast.success('Factura editada');
      setModal({ ...modal, open: false });
      // Recargar lista
      const res = await getUltimasFacturas(14);
      setFacturas(res.data);
    } catch (error) {
      toast.error('Error al editar: ' + error.message);
    }
  };

  // Descargar PDF
  const handleDescargarPDF = async (id) => {
    try {
      const res = await descargarPDF(id);
      saveAs(res.data, `factura_${id}.pdf`);
    } catch (error) {
      toast.error('Error al descargar PDF: ' + error.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Listado de Facturas</h2>

      {/* Filtros de búsqueda */}
      <form onSubmit={handleBuscar} className="bg-gray-100 p-4 rounded mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <input
          name="cliente_id"
          placeholder="ID Cliente"
          value={filtros.cliente_id}
          onChange={handleFiltroChange}
          className="border p-2 rounded"
        />
        <input
          name="monto_min"
          placeholder="Monto mínimo"
          type="number"
          step="0.01"
          value={filtros.monto_min}
          onChange={handleFiltroChange}
          className="border p-2 rounded"
        />
        <input
          name="monto_max"
          placeholder="Monto máximo"
          type="number"
          step="0.01"
          value={filtros.monto_max}
          onChange={handleFiltroChange}
          className="border p-2 rounded"
        />
        <select
          name="mes"
          value={filtros.mes}
          onChange={handleFiltroChange}
          className="border p-2 rounded"
        >
          <option value="">Mes</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
        <input
          name="anio"
          placeholder="Año"
          type="number"
          value={filtros.anio}
          onChange={handleFiltroChange}
          className="border p-2 rounded"
        />
        <select
          name="estado"
          value={filtros.estado}
          onChange={handleFiltroChange}
          className="border p-2 rounded"
        >
          <option value="">Estado</option>
          <option value="Borrador">Borrador</option>
          <option value="Emitida">Emitida</option>
          <option value="Pagada">Pagada</option>
          <option value="Anulada">Anulada</option>
        </select>
        <select
          name="tipo_documento"
          value={filtros.tipo_documento}
          onChange={handleFiltroChange}
          className="border p-2 rounded"
        >
          <option value="">Tipo</option>
          <option value="FAF">FAF</option>
          <option value="CCF">CCF</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Buscar
        </button>
      </form>

      {/* Tabla de facturas */}
      {loading ? (
        <p className="text-center py-4">Cargando facturas...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg shadow">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-3 px-4 text-left">N°</th>
                <th className="py-3 px-4 text-left">Cliente</th>
                <th className="py-3 px-4 text-left">Fecha</th>
                <th className="py-3 px-4 text-left">Tipo</th>
                <th className="py-3 px-4 text-left">Total</th>
                <th className="py-3 px-4 text-left">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{f.numero_correlativo}</td>
                  <td className="py-3 px-4">{f.cliente_nombre}</td>
                  <td className="py-3 px-4">{new Date(f.creado_en).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{f.tipo_documento}</td>
                  <td className="py-3 px-4">${f.total_pagar}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      f.estado === 'Pagada' ? 'bg-green-200 text-green-800' :
                      f.estado === 'Anulada' ? 'bg-red-200 text-red-800' :
                      f.estado === 'Emitida' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {f.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex flex-wrap gap-1 justify-center">
                    <button
                      onClick={() => openModal(f.id, 'view')}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => openModal(f.id, 'edit')}
                      className="bg-indigo-500 text-white px-2 py-1 rounded text-xs hover:bg-indigo-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDescargarPDF(f.id)}
                      className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600"
                    >
                      PDF
                    </button>
                    <select
                      onChange={(e) => handleCambiarEstado(f.id, e.target.value)}
                      defaultValue=""
                      className="border rounded text-xs p-1"
                    >
                      <option value="">Cambiar Estado</option>
                      <option value="Emitida">Emitida</option>
                      <option value="Pagada">Pagada</option>
                      <option value="Anulada">Anulada</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {facturas.length === 0 && <p className="text-center py-4 text-gray-500">No hay facturas que coincidan con los filtros</p>}
        </div>
      )}

      {/* Modal para Ver/Editar */}
      {modal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {modal.action === 'view' ? 'Detalle de Factura' : 'Editar Factura'}
            </h3>

            {modal.action === 'view' && modal.factura && (
              <div className="space-y-2">
                <p><strong>N°:</strong> {modal.factura.numero_correlativo}</p>
                <p><strong>Cliente:</strong> {modal.factura.cliente_nombre}</p>
                <p><strong>Fecha:</strong> {new Date(modal.factura.creado_en).toLocaleString()}</p>
                <p><strong>Tipo:</strong> {modal.factura.tipo_documento}</p>
                <p><strong>Subtotal:</strong> ${modal.factura.subtotal_sumas}</p>
                <p><strong>Descuento:</strong> ${modal.factura.descuento}</p>
                <p><strong>IVA:</strong> ${modal.factura.iva_13}</p>
                <p><strong>Retención:</strong> ${modal.factura.retencion_1}</p>
                <p><strong>Intereses:</strong> ${modal.factura.intereses_mora}</p>
                <p><strong>Total:</strong> ${modal.factura.total_pagar}</p>
                <p><strong>Estado:</strong> {modal.factura.estado}</p>
                {modal.factura.eliminado_en && <p><strong>Eliminada:</strong> {new Date(modal.factura.eliminado_en).toLocaleString()}</p>}
              </div>
            )}

            {modal.action === 'edit' && modal.factura && (
              <div className="space-y-4">
                <div>
                  <label className="block font-medium">Descuento</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editarData.descuento}
                    onChange={(e) => setEditarData({ ...editarData, descuento: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium">Intereses Mora</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editarData.intereses_mora}
                    onChange={(e) => setEditarData({ ...editarData, intereses_mora: parseFloat(e.target.value) || 0 })}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <button
                  onClick={() => handleEditar(modal.factura.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Guardar Cambios
                </button>
              </div>
            )}

            <button
              onClick={() => setModal({ ...modal, open: false })}
              className="mt-4 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturaList;