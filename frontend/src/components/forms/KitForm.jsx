// frontend/src/components/forms/KitForm.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { createProducto, getKitComponentes, addKitComponente, removeKitComponente } from '../../api/inventory';
import { toast } from 'react-toastify';

const KitForm = ({ isOpen, onClose, onSuccess, productos = [], categorias = [], marcas = [] }) => {
  const [kitData, setKitData] = useState({
    nombre: '',
    descripcion: '',
    categoria_id: '',
    marca_id: '',
    costo_kit: 0,
    stock_actual: 0
  });
  const [stockInicial, setStockInicial] = useState(0);
  const [componentes, setComponentes] = useState([]);
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creando, setCreando] = useState(false);
  const [kitCreado, setKitCreado] = useState(null);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [showProductoList, setShowProductoList] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Productos disponibles (no kits, solo productos)
  const productosDisponibles = useMemo(
    () => productos.filter(p => p.tipo === 'Producto' && !p.es_kit),
    [productos]
  );

  // Filtrar productos según búsqueda
  const productosFiltrados = useMemo(() => {
    if (busquedaProducto.trim() === '') return [];
    return productosDisponibles
      .filter(p =>
        p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
        (p.codigo_sku && p.codigo_sku.toLowerCase().includes(busquedaProducto.toLowerCase()))
      )
      .slice(0, 20);
  }, [busquedaProducto, productosDisponibles]);

  // Cerrar lista al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowProductoList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setKitData({
        nombre: '',
        descripcion: '',
        categoria_id: '',
        marca_id: '',
        costo_kit: 0,
      });
      setStockInicial(0);
      setComponentes([]);
      setSelectedProductoId('');
      setCantidad(1);
      setCreando(false);
      setKitCreado(null);
      setBusquedaProducto('');
      setShowProductoList(false);
    }
  }, [isOpen]);

  // Generar SKU automático para el kit
  const generarSKU = (nombre) => {
    if (!nombre) return '';
    const prefix = 'KIT';
    const namePart = nombre.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const randomNum = String(Math.floor(1000 + Math.random() * 9000));
    return `${prefix}${namePart}${randomNum}`;
  };

  // Calcular costo total del kit
  const calcularCostoTotal = () => {
    let total = 0;
    componentes.forEach(c => {
      const producto = productos.find(p => p.id === c.producto_componente_id);
      if (producto) {
        total += (parseFloat(producto.costo_promedio) || 0) * c.cantidad;
      }
    });
    return total;
  };

  const handleCrearKit = async () => {
    if (!kitData.nombre.trim()) {
      toast.error('Debes ingresar un nombre para el kit');
      return;
    }
    if (componentes.length === 0) {
      toast.error('Debes agregar al menos un producto al kit');
      return;
    }
    if (stockInicial < 0) {
      toast.error('La cantidad inicial no puede ser negativa');
      return;
    }
    setCreando(true);
    try {
      const sku = generarSKU(kitData.nombre);
      const costoTotal = kitData.costo_kit || calcularCostoTotal();
      const data = {
        nombre: kitData.nombre.trim(),
        descripcion: kitData.descripcion || '',
        tipo: 'Producto',
        es_kit: true,
        precio_unitario: costoTotal,
        costo_promedio: costoTotal,
        stock_actual: kitData.stock_actual || 0, // ← Aquí se envía
        stock_minimo: 0,
        codigo_sku: sku,
        categoria_id: kitData.categoria_id || null,
        marca_id: kitData.marca_id || null,
      };
      const result = await createProducto(data);
      const kitId = result.id;
      // Agregar componentes al kit
      for (const comp of componentes) {
        await addKitComponente({
          producto_kit_id: kitId,
          producto_componente_id: comp.producto_componente_id,
          cantidad: comp.cantidad,
        });
      }
      toast.success('Kit creado exitosamente');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al crear kit');
    } finally {
      setCreando(false);
    }
  };

  const handleAgregarComponente = () => {
    if (!selectedProductoId || cantidad <= 0) {
      toast.error('Selecciona un producto y una cantidad válida');
      return;
    }
    // Verificar duplicado
    if (componentes.some(c => c.producto_componente_id === parseInt(selectedProductoId))) {
      toast.error('Este producto ya está en el kit');
      return;
    }
    const producto = productos.find(p => p.id === parseInt(selectedProductoId));
    if (!producto) {
      toast.error('Producto no encontrado');
      return;
    }
    setComponentes([
      ...componentes,
      {
        id: Date.now(),
        producto_componente_id: parseInt(selectedProductoId),
        componente_nombre: producto.nombre,
        cantidad: parseInt(cantidad),
      },
    ]);
    setSelectedProductoId('');
    setCantidad(1);
    setBusquedaProducto('');
    setShowProductoList(false);
  };

  const handleEliminarComponente = (index) => {
    const newComponentes = [...componentes];
    newComponentes.splice(index, 1);
    setComponentes(newComponentes);
  };

  const seleccionarProducto = (productoId) => {
    setSelectedProductoId(productoId);
    const producto = productos.find(p => p.id === parseInt(productoId));
    if (producto) {
      setBusquedaProducto(producto.nombre);
    }
    setShowProductoList(false);
  };

  if (!isOpen) return null;

  const costoTotal = calcularCostoTotal();
  const precioKit = kitData.costo_kit || costoTotal;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">🧩 Crear Kit/Combo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300 block mb-1">Nombre del Kit *</label>
            <input
              type="text"
              value={kitData.nombre}
              onChange={(e) => setKitData({ ...kitData, nombre: e.target.value })}
              placeholder="Ej: Canasta Navideña, Almuerzo Ejecutivo"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">SKU</label>
            <input
              type="text"
              value={kitData.nombre ? generarSKU(kitData.nombre) : ''}
              disabled
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Automático</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-300 block mb-1">Descripción</label>
          <textarea
            value={kitData.descripcion}
            onChange={(e) => setKitData({ ...kitData, descripcion: e.target.value })}
            placeholder="Descripción del kit..."
            rows="2"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm text-gray-300 block mb-1">Categoría</label>
            <select
              value={kitData.categoria_id}
              onChange={(e) => setKitData({ ...kitData, categoria_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Marca</label>
            <select
              value={kitData.marca_id}
              onChange={(e) => setKitData({ ...kitData, marca_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Sin marca</option>
              {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>


        <div className="mt-4">
          <label className="text-sm text-gray-300 block mb-1">Costo del Kit (opcional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={kitData.costo_kit}
            onChange={(e) => setKitData({ ...kitData, costo_kit: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Si no ingresas costo, se calculará automáticamente con los componentes.
            {costoTotal > 0 && ` Costo calculado: $${costoTotal.toFixed(2)}`}
          </p>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-300 block mb-1">Stock Inicial (Cantidad de kits)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={kitData.stock_actual}
            onChange={(e) => setKitData({ ...kitData, stock_actual: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">Cantidad de unidades del kit que se van a ensamblar.</p>
        </div>

        <hr className="my-4 border-gray-700" />

        {/* Agregar Componentes */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Agregar Componentes</h4>
          <div ref={wrapperRef} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={inputRef}
                type="text"
                value={busquedaProducto}
                onChange={(e) => {
                  setBusquedaProducto(e.target.value);
                  setShowProductoList(true);
                }}
                onFocus={() => setShowProductoList(true)}
                placeholder="Buscar producto..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {showProductoList && (
                <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {productosFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-gray-400">No hay productos</div>
                  ) : (
                    productosFiltrados.map(p => (
                      <div
                        key={p.id}
                        onClick={() => seleccionarProducto(p.id)}
                        className="px-3 py-2 hover:bg-gray-600 cursor-pointer text-white flex justify-between"
                      >
                        <span>{p.nombre}</span>
                        <span className="text-xs text-gray-400">Stock: {p.stock_actual}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <input
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleAgregarComponente}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition flex items-center gap-1 whitespace-nowrap"
            >
              <Plus size={18} /> Agregar
            </button>
          </div>
        </div>

        {/* Componentes del Kit */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Componentes del Kit ({componentes.length})
          </h4>
          {componentes.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay componentes agregados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Producto</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Cantidad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Precio Unit.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Subtotal</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {componentes.map((c, index) => {
                    const prod = productos.find(p => p.id === c.producto_componente_id);
                    const precio = prod ? parseFloat(prod.precio_unitario) : 0;
                    const subtotal = precio * c.cantidad;
                    return (
                      <tr key={c.id || index}>
                        <td className="px-3 py-2 text-gray-300">{c.componente_nombre}</td>
                        <td className="px-3 py-2 text-gray-300">{c.cantidad}</td>
                        <td className="px-3 py-2 text-gray-300">${precio.toFixed(2)}</td>
                        <td className="px-3 py-2 text-gray-300">${subtotal.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleEliminarComponente(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-700/50">
                  <tr>
                    <td colSpan="3" className="px-3 py-2 text-right font-medium text-gray-300">Total Kit:</td>
                    <td className="px-3 py-2 font-bold text-emerald-400">
                      ${componentes.reduce((acc, c) => {
                        const prod = productos.find(p => p.id === c.producto_componente_id);
                        const precio = prod ? parseFloat(prod.precio_unitario) : 0;
                        return acc + (precio * c.cantidad);
                      }, 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrearKit}
            disabled={creando || componentes.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition disabled:opacity-50 flex items-center gap-2"
          >
            {creando ? 'Creando...' : 'Crear Kit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KitForm;