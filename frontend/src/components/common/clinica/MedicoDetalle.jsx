import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getMedicoDetalle, 
  exportarConsultasMedico 
} from '../../api/clinica'; 
import { toast } from 'react-toastify'; 

const MedicoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [medico, setMedico] = useState(null);
  const [consultas, setConsultas] = useState([]);
  const [resumen, setResumen] = useState({
    totalConsultas: 0,
    consultasConFactura: 0,
    totalFacturado: 0,
    aniosDisponibles: [],
    mesesDisponibles: [],
  });

  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDetalleMedico = async () => {
    try {
      setLoading(true);
      const params = {};
      if (anioSeleccionado) params.anio = anioSeleccionado;
      if (mesSeleccionado) params.mes = mesSeleccionado;

      // Consumiendo directamente el método limpio del API
      const data = await getMedicoDetalle(id, params);

      setMedico(data.medico);
      setConsultas(data.consultas);
      setResumen(data.resumen);

      if (!anioSeleccionado && data.resumen.aniosDisponibles.length > 0) {
        setAnioSeleccionado(data.resumen.aniosDisponibles[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar detalle:', err);
      setError('No se pudo cargar la información del médico.');
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDetalleMedico();
  }, [id, anioSeleccionado, mesSeleccionado]);

  const handleExportarFiltrado = async () => {
    try {
      const params = {};
      if (anioSeleccionado) params.anio = anioSeleccionado;
      if (mesSeleccionado) params.mes = mesSeleccionado;

      // Consumiendo el método exportado del API
      const blob = await exportarConsultasMedico(id, params);

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `consultas_medico_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error al exportar CSV:', err);
      if (toast) {
        toast.error('Error al descargar el archivo.');
      } else {
        alert('Error al descargar el archivo.');
      }
    }
  };

  const mesesNombres = [
    { num: 1, nombre: 'Enero' }, { num: 2, nombre: 'Febrero' },
    { num: 3, nombre: 'Marzo' }, { num: 4, nombre: 'Abril' },
    { num: 5, nombre: 'Mayo' }, { num: 6, nombre: 'Junio' },
    { num: 7, nombre: 'Julio' }, { num: 8, nombre: 'Agosto' },
    { num: 9, nombre: 'Septiembre' }, { num: 10, nombre: 'Octubre' },
    { num: 11, nombre: 'Noviembre' }, { num: 12, nombre: 'Diciembre' },
  ];

  if (loading && !medico) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-gray-500 dark:text-gray-400">Cargando información del médico...</span>
      </div>
    );
  }

  if (error || !medico) {
    return (
      <div className="p-4 bg-red-800 text-white rounded-lg">
        {error || 'Médico no encontrado'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y botón volver */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-500 hover:underline mb-2 block"
          >
            ← Volver a Médicos
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Detalle del Médico: {medico.nombre}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {medico.especialidad || 'Sin especialidad registrada'} | Licencia: {medico.numero_licencia || 'N/A'}
          </p>
        </div>

        <button
          onClick={handleExportarFiltrado}
          disabled={consultas.length === 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white text-sm font-medium rounded-lg shadow transition"
        >
          Exportar Tabla Filtrada (CSV)
        </button>
      </div>

      {/* Filtros por Año y Mes disponible */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase mb-1">
            Año Disponible
          </label>
          <select
            value={anioSeleccionado}
            onChange={(e) => {
              setAnioSeleccionado(e.target.value);
              setMesSeleccionado('');
            }}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Todos los años</option>
            {resumen.aniosDisponibles.map((anio) => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase mb-1">
            Mes Disponible
          </label>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            disabled={!anioSeleccionado || resumen.mesesDisponibles.length === 0}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Todos los meses</option>
            {resumen.mesesDisponibles.map((mesNum) => {
              const objMes = mesesNombres.find((m) => m.num === mesNum);
              return (
                <option key={mesNum} value={mesNum}>
                  {objMes ? objMes.nombre : `Mes ${mesNum}`}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Consultas</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {resumen.totalConsultas}
          </h3>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Consultas con Factura</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {resumen.consultasConFactura}
          </h3>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Facturado (Pagado)</p>
          <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            ${Number(resumen.totalFacturado || 0).toFixed(2)}
          </h3>
        </div>
      </div>

      {/* Tabla de Historial de Consultas y Facturación */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Historial de Consultas y Facturación
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">N° Factura</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Total Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {consultas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    No se encontraron consultas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                consultas.map((c) => (
                  <tr key={c.consulta_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      {c.fecha_consulta ? new Date(c.fecha_consulta).toLocaleDateString('es-SV') : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {c.paciente_nombre || 'Paciente no registrado'}
                    </td>
                    <td className="px-4 py-3">{c.motivo || '-'}</td>
                    <td className="px-4 py-3">
                      {c.factura_numero ? (
                        <span className="font-semibold">{c.factura_numero}</span>
                      ) : (
                        <span className="text-gray-400 italic">Sin factura</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.factura_estado ? (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            c.factura_estado === 'Pagada'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}
                        >
                          {c.factura_estado}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {c.factura_total ? `$${Number(c.factura_total).toFixed(2)}` : '$0.00'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MedicoDetalle;