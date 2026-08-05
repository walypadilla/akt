import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, X } from 'lucide-react';
import { getPacientes, getConsultas } from '../../api/clinica';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';

const ControlPeso = () => {
  const [pacientes, setPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [datosPeso, setDatosPeso] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPacientes = async () => {
    try {
      const data = await getPacientes();
      setPacientes(data || []);
    } catch (error) {
      toast.error('Error al cargar pacientes');
    }
  };

  useEffect(() => {
    loadPacientes();
  }, []);

  const loadPeso = async (pacienteId) => {
    if (!pacienteId) {
      setDatosPeso([]);
      return;
    }
    setLoading(true);
    try {
      const consultas = await getConsultas({ paciente_id: pacienteId });
      const pesoData = consultas
        .filter(c => c.peso && c.peso > 0)
        .sort((a, b) => new Date(a.fecha_consulta) - new Date(b.fecha_consulta))
        .map(c => ({
          fecha: new Date(c.fecha_consulta).toLocaleDateString('es-SV'),
          peso: parseFloat(c.peso),
          fechaRaw: new Date(c.fecha_consulta),
        }));
      setDatosPeso(pesoData);
    } catch (error) {
      toast.error('Error al cargar datos de peso');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPaciente) {
      loadPeso(selectedPaciente);
    } else {
      setDatosPeso([]);
    }
  }, [selectedPaciente]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-purple-400" />
          Control de Peso
        </h1>
        <select
          value={selectedPaciente}
          onChange={(e) => setSelectedPaciente(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Seleccionar paciente</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {!selectedPaciente && (
        <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-8 text-center text-gray-400">
          Seleccione un paciente para ver su evolución de peso
        </div>
      )}

      {selectedPaciente && (
        <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-6">
          {datosPeso.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>No hay registros de peso para este paciente</p>
              <p className="text-xs mt-1">Registre el peso en las consultas para ver la evolución</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={datosPeso}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="fecha" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                <Line type="monotone" dataKey="peso" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {datosPeso.length > 0 && (
            <div className="mt-4 text-xs text-gray-400 text-center">
              Último peso: {datosPeso[datosPeso.length - 1].peso} kg
              {datosPeso.length > 1 && (
                <span className="ml-4">
                  Variación: {(datosPeso[datosPeso.length - 1].peso - datosPeso[0].peso).toFixed(1)} kg
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ControlPeso;