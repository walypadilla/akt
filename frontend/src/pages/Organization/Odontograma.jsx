import React, { useState, useEffect } from 'react';
import { Activity, Save, History, X } from 'lucide-react';
import { getOdontogramas, guardarOdontograma } from '../../api/clinica';
import { getPacientes } from '../../api/clinica';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

// Configuración de dientes adultos (32)
const dientesAdultos = [
  // Superior derecha (18-11)
  { num: 18, label: '18' }, { num: 17, label: '17' }, { num: 16, label: '16' }, { num: 15, label: '15' },
  { num: 14, label: '14' }, { num: 13, label: '13' }, { num: 12, label: '12' }, { num: 11, label: '11' },
  // Superior izquierda (21-28)
  { num: 21, label: '21' }, { num: 22, label: '22' }, { num: 23, label: '23' }, { num: 24, label: '24' },
  { num: 25, label: '25' }, { num: 26, label: '26' }, { num: 27, label: '27' }, { num: 28, label: '28' },
  // Inferior izquierda (31-38)
  { num: 31, label: '31' }, { num: 32, label: '32' }, { num: 33, label: '33' }, { num: 34, label: '34' },
  { num: 35, label: '35' }, { num: 36, label: '36' }, { num: 37, label: '37' }, { num: 38, label: '38' },
  // Inferior derecha (41-48)
  { num: 41, label: '41' }, { num: 42, label: '42' }, { num: 43, label: '43' }, { num: 44, label: '44' },
  { num: 45, label: '45' }, { num: 46, label: '46' }, { num: 47, label: '47' }, { num: 48, label: '48' },
];

const caras = ['Vestibular', 'Lingual', 'Distal', 'Mesial', 'Oclusal'];

const condiciones = {
  'Caries': '#ef4444',
  'Resina': '#f59e0b',
  'Extracción': '#8b5cf6',
  'Implante': '#10b981',
  'Corona': '#06b6d4',
  'Sano': '#22c55e',
};

const Odontograma = () => {
  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [dientes, setDientes] = useState(() => {
    const inicial = {};
    dientesAdultos.forEach(d => {
      inicial[d.num] = { ...d, caras: {} };
    });
    return inicial;
  });
  const [dienteSeleccionado, setDienteSeleccionado] = useState(null);
  const [caraSeleccionada, setCaraSeleccionada] = useState(null);
  const [condicionSeleccionada, setCondicionSeleccionada] = useState('Sano');
  const [observaciones, setObservaciones] = useState('');
  const [historial, setHistorial] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [guardando, setGuardando] = useState(false);

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

  const loadOdontograma = async (pId) => {
    if (!pId) return;
    setLoading(true);
    try {
      const data = await getOdontogramas(pId);
      if (data && data.length > 0) {
        const ultimo = data[0];
        const dientesData = ultimo.dientes;
        const nuevoDientes = {};
        dientesAdultos.forEach(d => {
          nuevoDientes[d.num] = { ...d, caras: dientesData[d.num]?.caras || {} };
        });
        setDientes(nuevoDientes);
        setObservaciones(ultimo.observaciones || '');
      } else {
        resetOdontograma();
      }
      setHistorial(data || []);
    } catch (error) {
      toast.error('Error al cargar odontograma');
    } finally {
      setLoading(false);
    }
  };

  const resetOdontograma = () => {
    const inicial = {};
    dientesAdultos.forEach(d => {
      inicial[d.num] = { ...d, caras: {} };
    });
    setDientes(inicial);
    setObservaciones('');
  };

  useEffect(() => {
    if (pacienteId) {
      loadOdontograma(pacienteId);
    } else {
      resetOdontograma();
    }
  }, [pacienteId]);

  const handleDienteClick = (num) => {
    setDienteSeleccionado(num);
    setCaraSeleccionada(null);
  };

  const handleCaraClick = (num, cara) => {
    setDienteSeleccionado(num);
    setCaraSeleccionada(cara);
  };

  const aplicarCondicion = () => {
    if (!dienteSeleccionado) return;
    const num = dienteSeleccionado;
    const cara = caraSeleccionada;
    const cond = condicionSeleccionada;

    setDientes(prev => {
      const nuevo = { ...prev };
      if (cara) {
        // Aplicar a una cara específica
        if (!nuevo[num].caras) nuevo[num].caras = {};
        if (cond === 'Sano') {
          delete nuevo[num].caras[cara];
        } else {
          nuevo[num].caras[cara] = cond;
        }
      } else {
        // Aplicar a todo el diente (todas las caras)
        const todasLasCaras = ['Vestibular', 'Lingual', 'Distal', 'Mesial', 'Oclusal'];
        if (cond === 'Sano') {
          nuevo[num].caras = {};
        } else {
          todasLasCaras.forEach(c => {
            nuevo[num].caras[c] = cond;
          });
        }
      }
      return nuevo;
    });
  };

  const guardarOdontogramaActual = async () => {
    if (!pacienteId) {
      toast.warning('Seleccione un paciente');
      return;
    }
    setGuardando(true);
    try {
      const dientesParaGuardar = {};
      dientesAdultos.forEach(d => {
        dientesParaGuardar[d.num] = { caras: dientes[d.num]?.caras || {} };
      });
      await guardarOdontograma({
        paciente_id: pacienteId,
        dientes: dientesParaGuardar,
        observaciones,
      });
      toast.success('Odontograma guardado');
      loadOdontograma(pacienteId);
    } catch (error) {
      toast.error('Error al guardar odontograma');
    } finally {
      setGuardando(false);
    }
  };

  const getColorCara = (num, cara) => {
    const d = dientes[num];
    if (!d || !d.caras || !d.caras[cara]) return '#22c55e'; // Sano (verde)
    return condiciones[d.caras[cara]] || '#22c55e';
  };

  const getColorDiente = (num) => {
    const d = dientes[num];
    if (!d || !d.caras || Object.keys(d.caras).length === 0) return '#22c55e';
    // Si todas las caras tienen la misma condición, usar ese color
    const values = Object.values(d.caras);
    const first = values[0];
    if (values.every(v => v === first)) return condiciones[first] || '#22c55e';
    return '#8b5cf6'; // Color mixto
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-purple-400" />
          Odontograma
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Seleccionar paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <History size={18} />
            Historial
          </button>
          <button
            onClick={guardarOdontogramaActual}
            disabled={guardando || !pacienteId}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            <Save size={18} />
            Guardar
          </button>
        </div>
      </div>

      {!pacienteId && (
        <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-8 text-center text-gray-400">
          Seleccione un paciente para comenzar
        </div>
      )}

      {pacienteId && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Odontograma */}
          <div className="lg:col-span-3 bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-6">
            <div className="mb-4 text-center">
              <p className="text-xs text-gray-400">Haga clic en un diente o cara para seleccionar, luego elija condición</p>
            </div>

            {/* Superior */}
            <div className="mb-6">
              <p className="text-xs text-gray-400 text-center mb-2">Superior</p>
              <div className="flex flex-wrap justify-center gap-1">
                {dientesAdultos.slice(0, 16).map((d) => (
                  <Diente
                    key={d.num}
                    num={d.num}
                    label={d.label}
                    color={getColorDiente(d.num)}
                    caras={dientes[d.num]?.caras || {}}
                    onDienteClick={() => handleDienteClick(d.num)}
                    onCaraClick={(cara) => handleCaraClick(d.num, cara)}
                    getColorCara={(cara) => getColorCara(d.num, cara)}
                    seleccionado={dienteSeleccionado === d.num}
                  />
                ))}
              </div>
            </div>

            {/* Inferior */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 text-center mb-2">Inferior</p>
              <div className="flex flex-wrap justify-center gap-1">
                {dientesAdultos.slice(16).map((d) => (
                  <Diente
                    key={d.num}
                    num={d.num}
                    label={d.label}
                    color={getColorDiente(d.num)}
                    caras={dientes[d.num]?.caras || {}}
                    onDienteClick={() => handleDienteClick(d.num)}
                    onCaraClick={(cara) => handleCaraClick(d.num, cara)}
                    getColorCara={(cara) => getColorCara(d.num, cara)}
                    seleccionado={dienteSeleccionado === d.num}
                  />
                ))}
              </div>
            </div>

            {/* Condiciones */}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-700 pt-4">
              <span className="text-sm text-gray-400">Condición:</span>
              {Object.entries(condiciones).map(([nombre, color]) => (
                <button
                  key={nombre}
                  onClick={() => setCondicionSeleccionada(nombre)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    condicionSeleccionada === nombre ? 'ring-2 ring-white scale-105' : ''
                  }`}
                  style={{ backgroundColor: color, color: '#fff' }}
                >
                  {nombre}
                </button>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={aplicarCondicion}
                disabled={!dienteSeleccionado}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition disabled:opacity-50"
              >
                Aplicar {dienteSeleccionado ? `al diente ${dienteSeleccionado}${caraSeleccionada ? ` (${caraSeleccionada})` : ''}` : ''}
              </button>
            </div>

            {dienteSeleccionado && (
              <div className="mt-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                <p className="text-sm text-gray-300">
                  Diente <span className="font-bold text-white">{dienteSeleccionado}</span>
                  {caraSeleccionada && ` - Cara: ${caraSeleccionada}`}
                  <span className="ml-2 text-xs text-gray-400">
                    (Condición actual: {dientes[dienteSeleccionado]?.caras?.[caraSeleccionada] || 'Sano'})
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Panel lateral */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Observaciones</h3>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                placeholder="Notas adicionales..."
              />
            </div>

            <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Leyenda</h3>
              <div className="space-y-1 text-xs">
                {Object.entries(condiciones).map(([nombre, color]) => (
                  <div key={nombre} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></span>
                    <span className="text-gray-300">{nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Historial de Odontogramas</h2>
              <button onClick={() => setMostrarHistorial(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            {historial.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No hay registros previos</p>
            ) : (
              <div className="space-y-4">
                {historial.map((item, idx) => (
                  <div key={idx} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{new Date(item.fecha_registro).toLocaleString('es-SV')}</span>
                      <span className="text-gray-400">Médico ID: {item.medico_id}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.observaciones || 'Sin observaciones'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Diente
const Diente = ({ num, label, color, caras, onDienteClick, onCaraClick, getColorCara, seleccionado }) => {
  const [hover, setHover] = useState(false);
  const tamaño = 40;

  const renderCara = (cara, pos) => {
    const col = getColorCara(cara);
    const estilos = {
      top: 'absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-2 rounded-full cursor-pointer',
      bottom: 'absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-5 h-2 rounded-full cursor-pointer',
      left: 'absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-5 rounded-full cursor-pointer',
      right: 'absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-2 h-5 rounded-full cursor-pointer',
      center: 'absolute inset-0 m-auto w-3 h-3 rounded-full cursor-pointer',
    };
    const posMap = {
      'Vestibular': 'top',
      'Lingual': 'bottom',
      'Distal': 'right',
      'Mesial': 'left',
      'Oclusal': 'center',
    };
    return (
      <div
        className={estilos[posMap[cara]]}
        style={{ backgroundColor: col, border: '1px solid #1f2937' }}
        onClick={(e) => { e.stopPropagation(); onCaraClick(cara); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={`${label} - ${cara}`}
      />
    );
  };

  return (
    <div
      className="relative inline-block m-1 rounded-lg transition-all"
      style={{
        width: tamaño,
        height: tamaño,
        backgroundColor: color,
        border: seleccionado ? '3px solid #8b5cf6' : '2px solid #1f2937',
        boxShadow: hover ? '0 0 12px rgba(139,92,246,0.4)' : 'none',
        transform: hover ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onClick={onDienteClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold drop-shadow-md z-10">
        {label}
      </span>
      {renderCara('Vestibular', 'top')}
      {renderCara('Lingual', 'bottom')}
      {renderCara('Distal', 'right')}
      {renderCara('Mesial', 'left')}
      {renderCara('Oclusal', 'center')}
    </div>
  );
};

export default Odontograma;