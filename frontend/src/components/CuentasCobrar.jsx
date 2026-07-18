import { useState, useEffect } from 'react';
import { getCuentasCobrar, pagarCuenta } from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CuentasCobrar = () => {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Función para cargar cuentas (definida dentro del useEffect) ---
  useEffect(() => {
    const cargarCuentas = async () => {
      setLoading(true);
      try {
        const res = await getCuentasCobrar();
        setCuentas(res.data);
      } catch (error) {
        toast.error('Error al cargar cuentas por cobrar: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarCuentas();
  }, []); // Dependencias vacías → solo se ejecuta al montar

  // --- Función para marcar como pagada ---
  const handlePagar = async (id) => {
    if (!window.confirm('¿Marcar esta factura como pagada?')) return;
    try {
      await pagarCuenta(id);
      toast.success('Factura pagada');
      // Recargar la lista
      const res = await getCuentasCobrar();
      setCuentas(res.data);
    } catch (error) {
      toast.error('Error al marcar como pagada: ' + error.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Cuentas por Cobrar</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-2 px-4">N°</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Antigüedad (días)</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => {
                const dias = Math.floor((new Date() - new Date(c.creado_en)) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{c.numero_correlativo}</td>
                    <td>{c.cliente_nombre}</td>
                    <td>{c.telefono || 'N/A'}</td>
                    <td>{new Date(c.creado_en).toLocaleDateString()}</td>
                    <td>${c.total_pagar}</td>
                    <td>{dias}</td>
                    <td>
                      <button
                        onClick={() => handlePagar(c.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Marcar Pagado
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {cuentas.length === 0 && <p className="text-center py-4">No hay cuentas pendientes</p>}
        </div>
      )}
    </div>
  );
};

export default CuentasCobrar;