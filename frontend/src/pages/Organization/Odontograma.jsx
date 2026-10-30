// frontend/src/pages/organization/Odontograma.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, Save, History, X, Eraser, Stethoscope, 
  Search, Download, Eye, Lock, ArrowLeft, User, AlertCircle
} from 'lucide-react';
import Select from 'react-select';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { getOdontogramas, guardarOdontograma, getPacientes } from '../../api/clinica';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const DIENTES_ADULTOS_SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const DIENTES_ADULTOS_INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const DIENTES_INFANTILES_SUP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const DIENTES_INFANTILES_INF = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const getTipoDiente = (num) => {
  const str = num.toString();
  const pos = parseInt(str[1]); 
  if ([1, 2].includes(pos)) return 'incisivo';
  if (pos === 3) return 'canino';
  if ([4, 5].includes(pos)) return 'premolar';
  if ([6, 7, 8].includes(pos)) return 'molar';
  if ([5].includes(pos)) return 'molar_infantil';
  return 'molar';
};

const HERRAMIENTAS = {
  Caries: { color: '#ef4444', stroke: '#b91c1c', label: 'Caries (Rojo)' },
  Resina: { color: '#3b82f6', stroke: '#1d4ed8', label: 'Resina/Amalgama (Azul)' },
  Corona: { color: '#f59e0b', stroke: '#b45309', label: 'Corona Realizada (Amarillo)' },
  CoronaIndicada: { color: 'transparent', stroke: '#f59e0b', label: 'Prótesis Indicada (Punteado)' },
  Endodoncia: { color: '#8b5cf6', stroke: '#5b21b6', label: 'Endodoncia Realizada (Morado)' },
  EndodonciaIndicada: { color: 'transparent', stroke: '#8b5cf6', label: 'Endodoncia Indicada (Punteado)' },
  Brackets: { color: '#94a3b8', stroke: '#475569', label: 'Ortodoncia / Brackets' },
  Extraccion: { color: '#1f2937', stroke: '#ef4444', label: 'Extracción / Ausente' },
  Sano: { color: '#ffffff', stroke: '#94a3b8', label: 'Sano / Limpiar' },
  CambiarTipo: { color: '#94a3b8', stroke: '#475569', label: 'Alternar Adulto/Infantil' }
};

const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return 'N/A';
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

const Odontograma = () => {
  const { user } = useAuth();
  
  const [viewMode, setViewMode] = useState('list'); 
  const [searchTerm, setSearchTerm] = useState('');

  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [dientes, setDientes] = useState({});
  const [herramienta, setHerramienta] = useState('Caries');
  const [tipoDenticion, setTipoDenticion] = useState('Adulto'); 
  const [observaciones, setObservaciones] = useState('');
  
  const [historial, setHistorial] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [viewingSnapshot, setViewingSnapshot] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const odontogramRef = useRef(null);
  const pacienteActual = pacientes.find(p => p.id === parseInt(pacienteId));

  const initDientes = (tipo) => {
    const inicial = {};
    const listaSup = tipo === 'Adulto' ? DIENTES_ADULTOS_SUP : DIENTES_INFANTILES_SUP;
    const listaInf = tipo === 'Adulto' ? DIENTES_ADULTOS_INF : DIENTES_INFANTILES_INF;
    
    [...listaSup, ...listaInf].forEach(num => {
      inicial[num] = {
        estado_general: 'presente',
        caras: { Vestibular: 'Sano', Lingual: 'Sano', Mesial: 'Sano', Distal: 'Sano', Oclusal: 'Sano' },
        raiz: { endodoncia: false, endodoncia_indicada: false },
        corona_indicada: false,
        bracket: false,
        tipoVisual: tipo === 'Adulto' ? 'adulto' : 'infantil'
      };
    });
    return inicial;
  };

  useEffect(() => {
    const loadPacientes = async () => {
      try {
        const data = await getPacientes({ limit: 99999 });
        const listado = Array.isArray(data) ? data : (data.pacientes || data.data || []);
        setPacientes(listado);
      } catch (error) {
        toast.error('Error al cargar pacientes');
      }
    };
    loadPacientes();
  }, []);

  const cargarHistorial = async (id, tipoDenticionForzado) => {
    setLoading(true);
    try {
      const data = await getOdontogramas(id);
      setHistorial(data || []);
      
      const draftKey = `odonto_draft_${id}`;
      const draftStr = localStorage.getItem(draftKey);
      
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        setDientes(draft.dientes);
        setObservaciones(draft.observaciones);
        setIsReadOnly(false);
        setViewingSnapshot(null);
        setHasUnsavedChanges(true);
        toast.info('Se ha restaurado un borrador sin guardar de este paciente.', { autoClose: 5000 });
      } else if (data && data.length > 0) {
        const base = initDientes(tipoDenticionForzado);
        const ultimo = data[0];
        Object.keys(base).forEach(num => {
          if (ultimo.dientes && ultimo.dientes[num]) {
            base[num] = { ...base[num], ...ultimo.dientes[num] };
          }
        });
        setDientes(base);
        setObservaciones(ultimo.observaciones || '');
        setIsReadOnly(true);
        setViewingSnapshot(ultimo);
        setHasUnsavedChanges(false);
      } else {
        setDientes(initDientes(tipoDenticionForzado));
        setObservaciones('');
        setIsReadOnly(false);
        setViewingSnapshot(null);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarPaciente = (id) => {
    const pac = pacientes.find(p => p.id === parseInt(id));
    if (!pac) return;

    let tipo = 'Adulto';
    if (pac.fecha_nacimiento) {
      const edad = calcularEdad(pac.fecha_nacimiento);
      tipo = edad <= 12 ? 'Infantil' : 'Adulto';
    }

    setPacienteId(id);
    setTipoDenticion(tipo);
    setViewMode('detail');
    cargarHistorial(id, tipo);
  };

  const volverALista = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Seguro que deseas salir? (El borrador se mantendrá en tu navegador)')) {
        return;
      }
    }
    setViewMode('list');
    setPacienteId('');
    setDientes({});
    setHistorial([]);
    setHasUnsavedChanges(false);
  };

  const cargarSnapshot = (snapshot, readOnlyMode = true) => {
    const base = initDientes(tipoDenticion);
    Object.keys(base).forEach(num => {
      if (snapshot.dientes && snapshot.dientes[num]) {
        base[num] = { ...base[num], ...snapshot.dientes[num] };
      }
    });
    setDientes(base);
    setObservaciones(snapshot.observaciones || '');
    setIsReadOnly(readOnlyMode);
    setViewingSnapshot(snapshot);
    setHasUnsavedChanges(false);
    if (mostrarHistorial) setMostrarHistorial(false);
  };

  const nuevaEvolucion = () => {
    setIsReadOnly(false);
    setViewingSnapshot(null);
    setHasUnsavedChanges(true);
    toast.info('Modo edición activado.');
  };

  const aplicarHerramienta = (numDiente, zona, cara = null) => {
    if (isReadOnly) return toast.warning('Haz clic en "Nueva Evolución" para editar.');
    
    setDientes(prev => {
      const diente = JSON.parse(JSON.stringify(prev[numDiente]));
      if (!diente) return prev;

      let huboCambio = false;

      // ENDODONCIA (Realizada o Indicada)
      if (herramienta === 'Endodoncia' || herramienta === 'EndodonciaIndicada') {
        if (zona === 'raiz' || zona === 'general' || (zona === 'cara' && cara === 'Oclusal')) {
          if (herramienta === 'Endodoncia') {
            diente.raiz.endodoncia = !diente.raiz.endodoncia;
            if (diente.raiz.endodoncia) diente.raiz.endodoncia_indicada = false; // Mutuamente excluyentes
          } else {
            diente.raiz.endodoncia_indicada = !diente.raiz.endodoncia_indicada;
            if (diente.raiz.endodoncia_indicada) diente.raiz.endodoncia = false;
          }
          huboCambio = true;
        }
        if (huboCambio) return { ...prev, [numDiente]: diente };
        return prev;
      }

      // ORTODONCIA (Brackets)
      if (herramienta === 'Brackets') {
        if (zona === 'general' || (zona === 'cara' && cara === 'Oclusal')) {
          diente.bracket = !diente.bracket;
          huboCambio = true;
        }
        if (huboCambio) return { ...prev, [numDiente]: diente };
        return prev;
      }

      // PRÓTESIS INDICADA
      if (herramienta === 'CoronaIndicada') {
        if (zona === 'general' || (zona === 'cara' && cara === 'Oclusal')) {
          diente.corona_indicada = !diente.corona_indicada;
          huboCambio = true;
        }
        if (huboCambio) return { ...prev, [numDiente]: diente };
        return prev;
      }

      // SANO / LIMPIAR
      if (herramienta === 'Sano') {
        if (zona === 'raiz' || zona === 'general' || (zona === 'cara' && cara === 'Oclusal')) {
          diente.raiz.endodoncia = false;
          diente.raiz.endodoncia_indicada = false;
          diente.corona_indicada = false;
          diente.bracket = false;
          huboCambio = true;
        }
        
        if (zona === 'general') {
          diente.estado_general = 'presente';
          Object.keys(diente.caras).forEach(c => diente.caras[c] = 'Sano');
          huboCambio = true;
        } else if (zona === 'cara') {
          if (diente.caras[cara] !== 'Sano') {
            diente.caras[cara] = 'Sano';
            huboCambio = true;
          }
        }
        if (huboCambio) return { ...prev, [numDiente]: diente };
        return prev;
      }

      // LÓGICA GENERAL (Extracción, Corona realizada, Cambiar tipo)
      if (zona === 'general') {
        if (herramienta === 'Extraccion') {
          diente.estado_general = diente.estado_general === 'ausente' ? 'presente' : 'ausente';
          huboCambio = true;
        } else if (herramienta === 'Corona') {
          Object.keys(diente.caras).forEach(c => diente.caras[c] = 'Corona');
          diente.corona_indicada = false; // Si se realiza, ya no está indicada
          huboCambio = true;
        } else if (herramienta === 'CambiarTipo') {
          diente.tipoVisual = diente.tipoVisual === 'adulto' ? 'infantil' : 'adulto';
          huboCambio = true;
        }
      } 
      // CARAS (Caries, Resina)
      else if (zona === 'cara') {
        if (herramienta !== 'Extraccion' && herramienta !== 'CambiarTipo') {
          if (diente.caras[cara] !== herramienta) {
            diente.caras[cara] = herramienta;
            huboCambio = true;
          }
        }
      }

      if (!huboCambio) return prev;
      return { ...prev, [numDiente]: diente };
    });
    
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    if (pacienteId && !isReadOnly && Object.keys(dientes).length > 0) {
      const draftKey = `odonto_draft_${pacienteId}`;
      localStorage.setItem(draftKey, JSON.stringify({ dientes, observaciones }));
    }
  }, [dientes, observaciones, pacienteId, isReadOnly]);

  const guardarOdontogramaActual = async () => {
    if (!pacienteId) return toast.warning('Seleccione un paciente');
    setGuardando(true);
    try {
      await guardarOdontograma({
        paciente_id: pacienteId,
        dientes: dientes,
        observaciones,
      });
      localStorage.removeItem(`odonto_draft_${pacienteId}`);
      setHasUnsavedChanges(false);
      toast.success('Odontograma guardado en el expediente');
      cargarHistorial(pacienteId, tipoDenticion);
    } catch (error) {
      toast.error('Error al guardar odontograma');
    } finally {
      setGuardando(false);
    }
  };

  const exportarPDF = async () => {
    if (!odontogramRef.current) return;
    try {
      const canvas = await html2canvas(odontogramRef.current, {
        backgroundColor: '#e5e7eb',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const edad = calcularEdad(pacienteActual?.fecha_nacimiento);
      const doctorName = viewingSnapshot?.medico_nombre || user?.nombre || 'Doctor';

      pdf.setFontSize(16);
      pdf.text(`Odontograma Clínico`, 14, 15);
      
      pdf.setFontSize(10);
      pdf.text(`Paciente: ${pacienteActual?.nombre} ${pacienteActual?.apellidos || ''} (${edad} años)`, 14, 22);
      pdf.text(`Atendido por: Dr(a). ${doctorName}`, 14, 27);
      pdf.text(`Fecha del registro: ${viewingSnapshot ? new Date(viewingSnapshot.fecha_registro).toLocaleString() : new Date().toLocaleString()}`, 14, 32);
      
      const imgWidth = pdfWidth - 28;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 14, 40, imgWidth, imgHeight);
      
      const kpiY = 40 + imgHeight + 10;
      pdf.setFontSize(11);
      pdf.text("Resumen de Hallazgos:", 14, kpiY);
      pdf.setFontSize(10);
      pdf.text(`Caries: ${resumen.caries} | Restauraciones: ${resumen.restauraciones} | Coronas: ${resumen.coronas} | Prótesis Ind: ${resumen.protesisIndicadas}`, 14, kpiY + 6);
      pdf.text(`Endodoncias: ${resumen.endodoncias} | Endodoncias Ind: ${resumen.endodonciasIndicadas} | Ortodoncia: ${resumen.ortodoncia ? 'Sí' : 'No'} | Ausentes: ${resumen.ausentes}`, 14, kpiY + 12);
      
      if (observaciones) {
        pdf.setFontSize(11);
        pdf.text("Notas / Plan de Tratamiento:", 14, kpiY + 22);
        pdf.setFontSize(9);
        pdf.text(observaciones, 14, kpiY + 28, { maxWidth: imgWidth });
      }
      
      pdf.save(`Odontograma_${pacienteActual?.nombre || 'Paciente'}_${new Date().getTime()}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar PDF');
    }
  };

  const resumen = useMemo(() => {
    let caries = 0, restauraciones = 0, coronas = 0, protesisIndicadas = 0;
    let endodoncias = 0, endodonciasIndicadas = 0, ausentes = 0;
    let ortodoncia = false;
    
    Object.values(dientes).forEach(d => {
      if (d.estado_general === 'ausente') {
        ausentes++;
        return;
      }
      
      if (d.raiz?.endodoncia) endodoncias++;
      if (d.raiz?.endodoncia_indicada) endodonciasIndicadas++;
      if (d.corona_indicada) protesisIndicadas++;
      if (d.bracket) ortodoncia = true;

      const caras = Object.values(d.caras || {});
      if (caras.includes('Caries')) caries++;
      if (caras.includes('Resina')) restauraciones++;
      if (caras.includes('Corona')) coronas++;
    });
    
    return { caries, restauraciones, coronas, protesisIndicadas, endodoncias, endodonciasIndicadas, ausentes, ortodoncia };
  }, [dientes]);

  const pacientesFiltrados = pacientes.filter(p => 
    `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo_expediente && p.codigo_expediente.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (viewMode === 'list') {
    return (
      <div className="p-6 space-y-6">
        {/* ... (Directorio igual) ... */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-7 h-7 text-purple-400" /> Directorio de Odontogramas
            </h1>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar paciente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900">
                <tr>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4">Expediente</th>
                  <th className="px-6 py-4">Edad</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {pacientesFiltrados.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No se encontraron pacientes.</td></tr>
                ) : (
                  pacientesFiltrados.map(p => {
                    const edad = calcularEdad(p.fecha_nacimiento);
                    return (
                      <tr key={p.id} className="hover:bg-gray-700/40 transition">
                        <td className="px-6 py-3 font-semibold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300"><User size={16} /></div>
                          {p.nombre} {p.apellidos || ''}
                        </td>
                        <td className="px-6 py-3">{p.codigo_expediente || 'S/N'}</td>
                        <td className="px-6 py-3">{edad} años</td>
                        <td className="px-6 py-3 text-center">
                          <button onClick={() => seleccionarPaciente(p.id)} className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-2 border border-purple-500/30">
                            <Stethoscope size={14} /> Ver Odontograma
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER igual */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/60 p-4 rounded-xl border border-gray-700/70 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={volverALista} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition" title="Volver a la lista"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">{pacienteActual?.nombre} {pacienteActual?.apellidos || ''}</h1>
            <p className="text-xs text-gray-400 mt-1">Expediente: {pacienteActual?.codigo_expediente || 'S/N'} | Edad: {calcularEdad(pacienteActual?.fecha_nacimiento)} años</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button onClick={() => setMostrarHistorial(true)} className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition border border-cyan-500/40"><History size={16} /> Historial</button>
          <button onClick={exportarPDF} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"><Download size={16} /> PDF</button>
          <button onClick={guardarOdontogramaActual} disabled={guardando || isReadOnly} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-md ${hasUnsavedChanges ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40 animate-pulse' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'}`}>
            <Save size={16} /> {guardando ? 'Guardando...' : hasUnsavedChanges ? 'Guardar Cambios *' : 'Guardar Evolución'}
          </button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-3 flex items-center gap-3 text-amber-200 text-sm">
          <AlertCircle size={20} className="text-amber-400 shrink-0" />
          <p>Tienes cambios en este odontograma que no se han guardado en el expediente.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {isReadOnly ? (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2"><Lock size={14} /> Modo Lectura (Snapshot)</span>
              ) : (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2"><Activity size={14} /> Modo Edición</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button onClick={() => { setTipoDenticion('Adulto'); setHasUnsavedChanges(true); }} className={`px-3 py-1 rounded-md text-xs font-bold transition ${tipoDenticion === 'Adulto' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Adulto</button>
                <button onClick={() => { setTipoDenticion('Infantil'); setHasUnsavedChanges(true); }} className={`px-3 py-1 rounded-md text-xs font-bold transition ${tipoDenticion === 'Infantil' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Infantil</button>
              </div>
              {isReadOnly && (
                <button onClick={nuevaEvolucion} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition ml-2">Nueva Evolución</button>
              )}
            </div>
          </div>

          <div ref={odontogramRef} className="bg-gray-200 rounded-2xl shadow-inner border-4 border-gray-300 p-4 overflow-x-auto">
            <div className="min-w-[900px] flex flex-col items-center bg-gray-200">
              <div className="mb-6 w-full">
                <div className="text-center text-gray-500 font-bold text-[10px] mb-1 uppercase tracking-widest">Maxilar Superior</div>
                <RenderFilaDientes lista={tipoDenticion === 'Adulto' ? DIENTES_ADULTOS_SUP : DIENTES_INFANTILES_SUP} dientes={dientes} onClick={aplicarHerramienta} />
              </div>
              <div className="w-full">
                <RenderFilaDientes lista={tipoDenticion === 'Adulto' ? DIENTES_ADULTOS_INF : DIENTES_INFANTILES_INF} dientes={dientes} onClick={aplicarHerramienta} invertido={true} />
                <div className="text-center text-gray-500 font-bold text-[10px] mt-1 uppercase tracking-widest">Maxilar Inferior</div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-4">
          <div className={`bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-4 ${isReadOnly ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-3">Herramientas</h3>
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(HERRAMIENTAS).map(([key, cfg]) => (
                <button key={key} onClick={() => setHerramienta(key)} className={`flex items-center gap-2 p-2 rounded-lg border transition text-left ${herramienta === key ? 'ring-2 ring-purple-500 bg-gray-700' : 'border-gray-600 hover:bg-gray-700/50'}`}>
                  <div className="w-5 h-5 rounded shadow-sm shrink-0 flex items-center justify-center" style={{ backgroundColor: cfg.color === 'transparent' ? '#1f2937' : cfg.color, borderColor: cfg.stroke, borderWidth: 2, borderStyle: cfg.color === 'transparent' ? 'dashed' : 'solid' }}>
                    {key === 'Extraccion' && <X size={14} color="#ef4444" strokeWidth={3} />}
                    {key === 'Sano' && <Eraser size={12} color="#475569" />}
                  </div>
                  <span className="text-xs font-semibold text-gray-200">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-4">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-3">Resumen de Hallazgos</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-rose-900/30 border border-rose-700/50 rounded-lg p-2 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-rose-300">Caries</span>
                <span className="text-xl font-black text-rose-400">{resumen.caries}</span>
              </div>
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-2 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-blue-300">Restauraciones</span>
                <span className="text-xl font-black text-blue-400">{resumen.restauraciones}</span>
              </div>
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-2 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-amber-300">Coronas (Real)</span>
                <span className="text-xl font-black text-amber-400">{resumen.coronas}</span>
              </div>
              <div className="bg-amber-900/20 border border-amber-700/30 border-dashed rounded-lg p-2 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-amber-300">Prót. Indicada</span>
                <span className="text-xl font-black text-amber-400">{resumen.protesisIndicadas}</span>
              </div>
              <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-2 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-purple-300">Endodoncias</span>
                <span className="text-xl font-black text-purple-400">{resumen.endodoncias}</span>
              </div>
              <div className="bg-purple-900/20 border border-purple-700/30 border-dashed rounded-lg p-2 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-purple-300">End. Indicada</span>
                <span className="text-xl font-black text-purple-400">{resumen.endodonciasIndicadas}</span>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-2 flex flex-col justify-center col-span-2">
                <span className="text-[10px] font-bold text-gray-300">Ortodoncia</span>
                <span className="text-lg font-black text-white">{resumen.ortodoncia ? 'Sí (Brackets)' : 'No'}</span>
              </div>
              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 flex flex-col justify-center col-span-2">
                <span className="text-[10px] font-bold text-gray-300">Piezas Ausentes</span>
                <span className="text-xl font-black text-white">{resumen.ausentes}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-4">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-2">Notas / Plan</h3>
            <textarea value={observaciones} onChange={(e) => { setObservaciones(e.target.value); setHasUnsavedChanges(true); }} disabled={isReadOnly} rows={4} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50" placeholder="Anotaciones médicas..." />
          </div>
        </div>
      </div>

      {/* Historial Modal igual */}
      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><History className="text-cyan-400" /> Historial de Evoluciones</h2>
              <button onClick={() => setMostrarHistorial(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {historial.length === 0 ? <p className="text-gray-400 text-center py-8">No hay registros previos.</p> : (
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-900">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Médico</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((item, idx) => {
                      const isInicial = idx === historial.length - 1;
                      return (
                        <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="px-4 py-3 font-medium text-white">{new Date(item.fecha_registro).toLocaleString('es-SV')}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${isInicial ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'}`}>{isInicial ? 'INICIAL' : 'EVOLUCIÓN'}</span></td>
                          <td className="px-4 py-3">{item.medico_nombre || 'N/A'}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => cargarSnapshot(item, true)} className="text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto" title="Visualizar este snapshot"><Eye size={16} /> Ver</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RenderFilaDientes = ({ lista, dientes, onClick, invertido = false }) => (
  <div className="flex flex-nowrap justify-center gap-[2px] w-full">
    {lista.map((num, idx) => {
      const isMidline = idx === 7;
      return (
        <React.Fragment key={num}>
          <DienteSVG num={num} estado={dientes[num] || {}} onClick={onClick} invertido={invertido} />
          {isMidline && <div className="w-[2px] bg-gray-400 mx-1"></div>}
        </React.Fragment>
      );
    })}
  </div>
);

const DienteSVG = ({ num, estado, onClick, invertido }) => {
  const isAusente = estado.estado_general === 'ausente';
  const tipo = estado.tipoVisual === 'infantil' ? 'infantil' : getTipoDiente(num);
  const esDerecha = (num >= 11 && num <= 18) || (num >= 41 && num <= 48) || (num >= 51 && num <= 55) || (num >= 81 && num <= 85);
  
  const getColor = (zona) => {
    if (isAusente) return 'transparent';
    if (zona === 'raiz') return '#fef3c7'; 
    return HERRAMIENTAS[estado.caras?.[zona] || 'Sano']?.color || '#ffffff';
  };

  const getStroke = (zona) => {
    if (isAusente) return '#ef4444'; 
    if (zona === 'raiz') return '#d97706';
    return HERRAMIENTAS[estado.caras?.[zona] || 'Sano']?.stroke || '#94a3b8';
  };

  const renderCorona = () => {
    let pathTop = "20,20 80,20 60,50 40,50";
    let pathBottom = "40,70 60,70 80,100 20,100";
    let pathLeft = esDerecha ? "20,20 40,50 40,70 20,100" : "80,20 60,50 60,70 80,100";
    let pathRight = esDerecha ? "80,20 60,50 60,70 80,100" : "20,20 40,50 40,70 20,100";
    let pathCenter = "40,50 60,50 60,70 40,70";

    if (tipo === 'incisivo') {
      pathTop = "25,15 75,15 65,50 35,50";
      pathBottom = "35,70 65,70 75,105 25,105";
    } else if (tipo === 'canino') {
      pathTop = "35,10 65,10 60,50 40,50";
    } else if (tipo === 'premolar' || tipo === 'molar_infantil') {
      pathTop = "25,20 75,20 65,50 35,50";
    }

    return (
      <g>
        <polygon points={pathTop} fill={getColor('Vestibular')} stroke={getStroke('Vestibular')} strokeWidth="1.5" onClick={(e) => { e.stopPropagation(); onClick(num, 'cara', 'Vestibular'); }} className="hover:opacity-80 transition" />
        <polygon points={pathBottom} fill={getColor('Lingual')} stroke={getStroke('Lingual')} strokeWidth="1.5" onClick={(e) => { e.stopPropagation(); onClick(num, 'cara', 'Lingual'); }} className="hover:opacity-80 transition" />
        <polygon points={pathLeft} fill={getColor('Mesial')} stroke={getStroke('Mesial')} strokeWidth="1.5" onClick={(e) => { e.stopPropagation(); onClick(num, 'cara', 'Mesial'); }} className="hover:opacity-80 transition" />
        <polygon points={pathRight} fill={getColor('Distal')} stroke={getStroke('Distal')} strokeWidth="1.5" onClick={(e) => { e.stopPropagation(); onClick(num, 'cara', 'Distal'); }} className="hover:opacity-80 transition" />
        <polygon points={pathCenter} fill={getColor('Oclusal')} stroke={getStroke('Oclusal')} strokeWidth="1.5" onClick={(e) => { e.stopPropagation(); onClick(num, 'cara', 'Oclusal'); }} className="hover:opacity-80 transition" />
        
        {/* PRÓTESIS INDICADA (Corona punteada) */}
        {estado.corona_indicada && (
          <polygon 
            points={`${pathTop} ${pathBottom} ${pathLeft} ${pathRight} ${pathCenter}`} 
            fill="transparent" 
            stroke="#f59e0b" 
            strokeWidth="3" 
            strokeDasharray="5,3"
            className="pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 3px rgba(245,158,11,0.5))' }}
          />
        )}

        {/* BRACKETS (Ortodoncia) */}
        {estado.bracket && (
          <g onClick={(e) => { e.stopPropagation(); onClick(num, 'general'); }} className="cursor-pointer">
            {/* Alambre de ortodoncia (línea horizontal) */}
            <line x1="0" y1="60" x2="100" y2="60" stroke="#94a3b8" strokeWidth="3" />
            {/* Bracket metálico */}
            <rect x="42" y="52" width="16" height="16" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" rx="2" />
            <line x1="46" y1="60" x2="54" y2="60" stroke="#475569" strokeWidth="1.5" />
          </g>
        )}
      </g>
    );
  };

  const renderRaices = () => {
    const endodonciaRealizada = estado.raiz?.endodoncia;
    const endodonciaIndicada = estado.raiz?.endodoncia_indicada;
    const colorEndo = HERRAMIENTAS.Endodoncia.color;

    const renderLineasEndo = (x1, y1, x2, y2, indicada = false) => (
      <line 
        x1={x1} y1={y1} x2={x2} y2={y2} 
        stroke={indicada ? '#8b5cf6' : colorEndo} 
        strokeWidth={indicada ? "2" : "3"} 
        strokeDasharray={indicada ? "4,2" : "none"}
        strokeLinecap="round" 
        className={indicada ? "opacity-80" : ""}
      />
    );

    if (tipo === 'molar') {
      return (
        <>
          <path d="M 30,70 Q 20,120 35,130 Q 45,110 50,70 Z" fill={getColor('raiz')} stroke={getStroke('raiz')} strokeWidth="2" onClick={(e) => { e.stopPropagation(); onClick(num, 'raiz'); }} className="hover:opacity-80 transition" />
          <path d="M 70,70 Q 80,120 65,130 Q 55,110 50,70 Z" fill={getColor('raiz')} stroke={getStroke('raiz')} strokeWidth="2" onClick={(e) => { e.stopPropagation(); onClick(num, 'raiz'); }} className="hover:opacity-80 transition" />
          
          {endodonciaRealizada && (
            <>
              {renderLineasEndo(38, 75, 38, 115, false)}
              {renderLineasEndo(62, 75, 62, 115, false)}
            </>
          )}
          {endodonciaIndicada && (
            <>
              {renderLineasEndo(38, 75, 38, 115, true)}
              {renderLineasEndo(62, 75, 62, 115, true)}
            </>
          )}
        </>
      );
    } else if (tipo === 'premolar' || tipo === 'molar_infantil') {
      return (
        <>
          <path d="M 30,70 Q 20,120 50,125 Q 80,120 70,70 Z" fill={getColor('raiz')} stroke={getStroke('raiz')} strokeWidth="2" onClick={(e) => { e.stopPropagation(); onClick(num, 'raiz'); }} className="hover:opacity-80 transition" />
          {endodonciaRealizada && renderLineasEndo(50, 75, 50, 115, false)}
          {endodonciaIndicada && renderLineasEndo(50, 75, 50, 115, true)}
        </>
      );
    } else {
      return (
        <>
          <path d="M 35,70 Q 30,120 50,130 Q 70,120 65,70 Z" fill={getColor('raiz')} stroke={getStroke('raiz')} strokeWidth="2" onClick={(e) => { e.stopPropagation(); onClick(num, 'raiz'); }} className="hover:opacity-80 transition" />
          {endodonciaRealizada && renderLineasEndo(50, 75, 50, 120, false)}
          {endodonciaIndicada && renderLineasEndo(50, 75, 50, 120, true)}
        </>
      );
    }
  };

  return (
    <div className={`relative flex flex-col items-center group cursor-pointer ${invertido ? 'flex-col-reverse' : ''}`}>
      <svg viewBox="0 0 100 140" className={`w-12 h-16 sm:w-14 sm:h-20 transition-transform group-hover:scale-110 ${invertido ? 'rotate-180' : ''}`}>
        {renderRaices()}
        {renderCorona()}
        {isAusente && (
          <g onClick={(e) => { e.stopPropagation(); onClick(num, 'general'); }}>
            <rect x="0" y="0" width="100" height="140" fill="rgba(0,0,0,0.3)" />
            <line x1="20" y1="20" x2="80" y2="120" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
            <line x1="80" y1="20" x2="20" y2="120" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
          </g>
        )}
      </svg>
      <button onClick={(e) => { e.stopPropagation(); onClick(num, 'general'); }} className={`mt-1 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm transition ${isAusente ? 'bg-rose-600 text-white line-through' : 'bg-gray-800 text-gray-300 hover:bg-gray-600 hover:text-white'}`}>
        {num}
      </button>
    </div>
  );
};

export default Odontograma;