// frontend/src/pages/organization/ControlPeso.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Scale, Search, Download,
  Plus, Settings2, Eye, AlertCircle, Filter, ChevronDown
} from 'lucide-react';
import {
  getKpisPeso, getPacientesPeso, exportarPesosFiltrados,
} from '../../api/clinica';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ModalGraficaPeso from '../../components/common/clinica/ModalGraficaPeso';
import ModalRegistroRapido from '../../components/common/clinica/ModalRegistroRapido';
import ModalPesoIdeal from '../../components/common/clinica/ModalPesoIdeal';
import { toast } from 'react-toastify';
import { getTodayLocal } from '../../utils/dateUtils';

const CLASIF_META = {
  ideal:          { label: 'Buen estado',    color: 'emerald' },
  sobrepeso:      { label: 'Sobrepeso',      color: 'amber'   },
  bajo:           { label: 'Bajo peso',      color: 'rose'    },
  sin_clasificar: { label: 'Sin clasificar', color: 'gray'    },
};

const KPICard = ({ id, label, valor, colorKey, icon: Icon, filtro, setFiltro }) => {
  const active = filtro === id;
  const colorMap = {
    purple:  { border: 'border-purple-500',  bg: 'bg-purple-900/20',  text: 'text-purple-400',  icon: 'text-purple-400' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-900/20', text: 'text-emerald-400', icon: 'text-emerald-400' },
    amber:   { border: 'border-amber-500',   bg: 'bg-amber-900/20',   text: 'text-amber-400',   icon: 'text-amber-400' },
    rose:    { border: 'border-rose-500',    bg: 'bg-rose-900/20',    text: 'text-rose-400',    icon: 'text-rose-400' },
    gray:    { border: 'border-gray-500',    bg: 'bg-gray-700/40',    text: 'text-gray-300',    icon: 'text-gray-400' },
  };
  const c = colorMap[colorKey];
  return (
    <button
      onClick={() => setFiltro(id)}
      className={`flex-1 min-w-[160px] p-4 rounded-xl border-2 text-left transition-all
        ${active
          ? `${c.border}${c.bg} shadow-lg shadow-black/20`
          : 'border-gray-700/70 bg-gray-800/70 hover:border-gray-600 hover:bg-gray-800'
        }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={c.icon} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
      </div>
      <div className={`text-3xl font-bold ${c.text}`}>{valor}</div>
    </button>
  );
};

const ControlPeso = () => {
  const [kpis, setKpis] = useState({
    total: 0, ideal: 0, sobrepeso: 0, bajo: 0, sin_clasificar: 0,
  });
  const [filtro, setFiltro] = useState('todos');
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  const [pacienteGrafica, setPacienteGrafica] = useState(null);
  const [pacienteRegistro, setPacienteRegistro] = useState(null);
  const [pacienteIdeal, setPacienteIdeal] = useState(null);

  const cargarKPIs = useCallback(async () => {
    try {
      const data = await getKpisPeso();
      setKpis(data);
    } catch (e) {
      console.error('Error KPIs:', e);
    }
  }, []);

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const cargarPacientes = useCallback(async (f) => {
    setLoading(true);
    try {
      const data = await getPacientesPeso({ filtro: f });
      setPacientes(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarKPIs(); }, [cargarKPIs]);
  useEffect(() => { cargarPacientes(filtro); }, [filtro, cargarPacientes]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      `${p.nombre} ${p.apellidos || ''}`.toLowerCase().includes(q) ||
      (p.codigo_expediente || '').toLowerCase().includes(q) ||
      (p.cliente_nombre || '').toLowerCase().includes(q)
    );
  }, [pacientes, busqueda]);

  const exportar = async () => {
    try {
      const blob = await exportarPesosFiltrados({ filtro });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `control_peso_${filtro}_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exportado correctamente');
    } catch (err) {
      toast.error(err.response?.status === 404
        ? 'No hay datos para exportar'
        : 'Error al exportar');
    }
  };

  const refrescar = () => {
    cargarKPIs();
    cargarPacientes(filtro);
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-purple-400" /> Control de Peso
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Monitoreo de evolución de peso de pacientes
          </p>
        </div>
        <button
          onClick={exportar}
          className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Download size={14} /> Exportar Vista
        </button>
      </div>

      {/* KPIs */}
      <div className="flex flex-wrap gap-3">
        <KPICard id="todos"          label="Todos"          valor={kpis.total}          colorKey="purple"  icon={Activity}     filtro={filtro} setFiltro={setFiltro} />
        <KPICard id="ideal"          label="Buen estado"    valor={kpis.ideal}          colorKey="emerald" icon={TrendingUp}   filtro={filtro} setFiltro={setFiltro} />
        <KPICard id="sobrepeso"      label="Sobrepeso"      valor={kpis.sobrepeso}      colorKey="amber"   icon={TrendingUp}   filtro={filtro} setFiltro={setFiltro} />
        <KPICard id="bajo"           label="Bajo peso"      valor={kpis.bajo}           colorKey="rose"    icon={TrendingDown} filtro={filtro} setFiltro={setFiltro} />
        <KPICard id="sin_clasificar" label="Sin clasificar" valor={kpis.sin_clasificar} colorKey="gray"    icon={Scale}        filtro={filtro} setFiltro={setFiltro} />
      </div>

      {/* BUSCADOR + INFO */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80 p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por paciente, expediente o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <span className="text-xs text-gray-400 italic">
          {filtrados.length} paciente(s)
        </span>
      </div>

      {/* TABLA */}
      <div className="bg-gray-800/90 rounded-xl shadow-xl border border-gray-700/80">
        <div className="px-4 py-2.5 border-b border-gray-700/80 bg-gray-800/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Pacientes
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
            {CLASIF_META[filtro]?.label || 'Todos'}
          </span>
        </div>

        <div className="overflow-x-auto min-h-[380px] pb-4 rounded-b-xl">
          <table className="min-w-full divide-y divide-gray-700/80 text-xs">
            <thead className="bg-gray-900/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Paciente</th>
                <th className="px-3 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Expediente</th>
                <th className="px-3 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Especie / Raza</th>
                <th className="px-3 py-1.5 text-left font-bold text-gray-300 uppercase tracking-wider">Cliente</th>
                <th className="px-3 py-1.5 text-right font-bold text-gray-300 uppercase tracking-wider">Peso actual</th>
                <th className="px-3 py-1.5 text-right font-bold text-gray-300 uppercase tracking-wider">Rango ideal</th>
                <th className="px-3 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-3 py-1.5 text-center font-bold text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60 bg-gray-800/30">
              {loading ? (
                <tr><td colSpan="8" className="px-4 py-10 text-center"><LoadingSpinner /></td></tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-400">
                    <Scale className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                    <p className="text-xs font-medium">Sin resultados</p>
                  </td>
                </tr>
              ) : (
                  filtrados.map((p, index) => {
                    const meta = CLASIF_META[p.clasificacion] || CLASIF_META.sin_clasificar;
                    const badgeColor = {
                      emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                      amber:   'bg-amber-500/20 text-amber-300 border-amber-500/40',
                      rose:    'bg-rose-500/20 text-rose-300 border-rose-500/40',
                      gray:    'bg-gray-700/60 text-gray-300 border-gray-600',
                    }[meta.color];

                    // Solo abre hacia arriba si es de las últimas 2 filas Y hay más de 4 registros
                    const esUltimaFila = index >= filtrados.length - 2 && filtrados.length > 4;

                    return (
                      <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-1 text-white font-semibold whitespace-nowrap">{p.nombre} {p.apellidos || ''}</td>
                        <td className="px-3 py-1 text-gray-300 font-mono text-xs whitespace-nowrap">{p.codigo_expediente || '—'}</td>
                        <td className="px-3 py-1 text-gray-300 whitespace-nowrap">{p.especie || '—'} {p.raza ? `/ ${p.raza}` : ''}</td>
                        <td className="px-3 py-1 text-gray-300 whitespace-nowrap">{p.cliente_nombre || '—'}</td>
                        <td className="px-3 py-1 text-right text-white font-bold whitespace-nowrap">{p.ultimo_peso ?? '—'} kg</td>
                        <td className="px-3 py-1 text-right text-gray-400 text-xs whitespace-nowrap">
                          {p.peso_ideal_min != null ? `${p.peso_ideal_min}–${p.peso_ideal_max} kg` : 'No definido'}
                        </td>
                        <td className="px-3 py-1 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 border rounded-md text-xs font-bold ${badgeColor}`}>{meta.label}</span>
                        </td>
                        <td className="px-3 py-1 text-center whitespace-nowrap relative">
                          
                          {/* MENÚ ACCIONES FLOTANTE DINÁMICO */}
                          <div className="relative group inline-block text-left" onMouseLeave={() => setOpenDropdownId(null)}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === p.id ? null : p.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-700/60 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white transition-colors focus:outline-none"
                            >
                              Acciones
                              <ChevronDown 
                                size={14} 
                                className={`transition-transform duration-200 ${
                                  openDropdownId === p.id 
                                    ? esUltimaFila ? 'rotate-0' : 'rotate-180' 
                                    : esUltimaFila ? 'rotate-180 group-hover:rotate-0' : 'group-hover:rotate-180'
                                }`} 
                              />
                            </button>

                            <div 
                              className={`absolute right-0 w-48 origin-top-right transition-all duration-150 z-50 ${
                                esUltimaFila ? 'bottom-full mb-1 origin-bottom-right' : 'top-full -mt-1 origin-top-right'
                              } ${
                                openDropdownId === p.id ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                              }`}
                            >
                              <div className="bg-gray-800/95 border border-gray-600/80 rounded-xl shadow-2xl p-1.5 space-y-1.5 backdrop-blur-md">
                                <button
                                  onClick={() => { setPacienteGrafica(p); setOpenDropdownId(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-purple-300 bg-purple-500/10 hover:bg-purple-600 hover:text-white border border-purple-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                >
                                  <TrendingUp size={14} className="text-purple-400 group-hover/btn:text-white transition-colors" />
                                  <span>Ver gráfica de peso</span>
                                </button>

                                <button
                                  onClick={() => { setPacienteRegistro(p); setOpenDropdownId(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-emerald-300 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                >
                                  <Plus size={14} className="text-emerald-400 group-hover/btn:text-white transition-colors" />
                                  <span>Registrar peso</span>
                                </button>

                                <button
                                  onClick={() => { setPacienteIdeal(p); setOpenDropdownId(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-cyan-300 bg-cyan-500/10 hover:bg-cyan-600 hover:text-white border border-cyan-500/20 rounded-lg transition-all font-medium shadow-sm group/btn"
                                >
                                  <Settings2 size={14} className="text-cyan-400 group-hover/btn:text-white transition-colors" />
                                  <span>Definir rango ideal</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES */}
      {pacienteGrafica && (
        <ModalGraficaPeso paciente={pacienteGrafica} onClose={() => setPacienteGrafica(null)} />
      )}
      {pacienteRegistro && (
        <ModalRegistroRapido
          paciente={pacienteRegistro}
          onClose={(recargar) => {
            setPacienteRegistro(null);
            if (recargar) refrescar();
          }}
        />
      )}
      {pacienteIdeal && (
        <ModalPesoIdeal
          paciente={pacienteIdeal}
          onClose={(recargar) => {
            setPacienteIdeal(null);
            if (recargar) refrescar();
          }}
        />
      )}
    </div>
  );
};

export default ControlPeso;