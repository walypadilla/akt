// frontend/src/components/common/clinica/ExpedientePaciente.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Printer, Calendar, User, File, AlertCircle, TrendingUp, Activity,
  Clock, Eye, Download, CheckCircle, XCircle, AlertTriangle, Dog, Syringe, Scale, Plus
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  getConsultas,
  getCitas,
  getSolicitudesExamen,
  getOdontogramas,
  getHistorialVacunas,
  getHistorialPesoPaciente
} from '../../../api/clinica';
import { getFacturas } from '../../../api/invoices';
import LoadingSpinner from '../LoadingSpinner';
import { toast } from 'react-toastify';
import CartillaModal from './CartillaModal';
import ModalGraficaPeso from './ModalGraficaPeso';
import ModalRegistroRapido from './ModalRegistroRapido';
import OdontogramaViewer from './OdontogramaViewer'; // <--- IMPORTANTE: Asegúrate de tener este archivo

const normalizar = (texto) => {
  if (!texto) return '';
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

const ExpedientePaciente = ({ paciente, onClose }) => {
  const { user } = useAuth();
  const tipoOrg = user?.organizacion?.tipo_organizacion || 'Empresa Comercial';
  const tipoNorm = normalizar(tipoOrg);

  const isVeterinaria = tipoNorm === 'clinica veterinaria';
  const isDental = tipoNorm === 'clinica dental';
  // Eliminamos isGeneral porque no se estaba utilizando y causaba warning

  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState([]);
  const [citas, setCitas] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [odontogramas, setOdontogramas] = useState([]);
  const [vacunas, setVacunas] = useState([]);
  const [pesos, setPesos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  
  const [tabActiva, setTabActiva] = useState('timeline');
  const [cartillaModal, setCartillaModal] = useState({ isOpen: false, paciente: null });
  
  // Estados para modales de peso y odontograma
  const [showGraficaPeso, setShowGraficaPeso] = useState(false);
  const [showRegistroPeso, setShowRegistroPeso] = useState(false);
  const [selectedOdontograma, setSelectedOdontograma] = useState(null);

  const expedienteRef = useRef(null);
  const pacienteId = paciente?.id;

  const cargarDatos = async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const [consultasData, citasData, examenesData, facturasData] = await Promise.all([
        getConsultas({ paciente_id: pacienteId }),
        getCitas({ paciente_id: pacienteId }),
        getSolicitudesExamen({ paciente_id: pacienteId }),
        getFacturas({ cliente_id: paciente.cliente_id, limit: 99999 }),
      ]);
      setConsultas(consultasData || []);
      setCitas(citasData || []);
      setExamenes(examenesData || []);
      setFacturas(facturasData?.facturas || []);

      if (isDental) {
        const odonto = await getOdontogramas(pacienteId);
        setOdontogramas(odonto || []);
      }
      
      if (isVeterinaria) {
        const [vac, pes] = await Promise.all([
          getHistorialVacunas(pacienteId),
          getHistorialPesoPaciente(pacienteId)
        ]);
        setVacunas(vac || []);
        setPesos(pes || []);
      }
    } catch (error) {
      console.error('Error cargando expediente:', error);
      toast.error('Error al cargar expediente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [pacienteId, paciente?.cliente_id, isDental, isVeterinaria]);

  const imprimirExpediente = () => {
    if (expedienteRef.current) {
      window.print();
    }
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const tabs = [{ id: 'timeline', label: '📋 Línea del Tiempo' }];

  if (isDental || isVeterinaria) {
    tabs.push({
      id: 'modulo',
      label: isDental ? '🦷 Odontograma' : '💉 Vacunas',
    });
  }

  if (isVeterinaria) {
    tabs.push({ id: 'peso', label: '⚖️ Control de Peso' });
  }

  tabs.push(
    { id: 'examenes', label: '🔬 Exámenes' },
    { id: 'citas', label: '📅 Citas' },
    { id: 'facturacion', label: '💰 Historial de Pagos' }
  );

  if (!paciente) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Encabezado fijo */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/90 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-600/30 flex items-center justify-center text-3xl font-bold text-purple-400">
                {paciente.nombre?.charAt(0) || 'P'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {paciente.nombre} {paciente.apellidos || ''}
                  <span className="text-sm font-normal text-gray-400 ml-3">
                    {paciente.codigo_expediente || `EXP-${String(paciente.id).padStart(4, '0')}`}
                  </span>
                </h2>

                <div className="flex flex-wrap gap-4 text-sm text-gray-300 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} className="text-purple-400" />
                    {paciente.fecha_nacimiento
                      ? `${new Date(paciente.fecha_nacimiento).toLocaleDateString('es-SV')} (${calcularEdad(paciente.fecha_nacimiento)} años)`
                      : 'Edad no registrada'}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={14} className="text-purple-400" />
                    {paciente.genero === 'M' ? 'Masculino' : paciente.genero === 'F' ? 'Femenino' : 'Otro'}
                  </span>
                  <span className="flex items-center gap-1">
                    <File size={14} className="text-purple-400" />
                    {isVeterinaria ? 'Dueño' : 'Cliente'}: {paciente.cliente_nombre || 'Sin asignar'}
                  </span>
                </div>

                {/* Alertas médicas y datos según tipo de clínica */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {paciente.alergias && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/50 text-red-300 border border-red-700 rounded text-xs">
                      <AlertCircle size={12} /> Alergias: {paciente.alergias}
                    </span>
                  )}

                  {isVeterinaria && (
                    <>
                      {paciente.especie && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-900/50 text-emerald-300 border border-emerald-700 rounded text-xs">
                          <Dog size={12} /> {paciente.especie}
                        </span>
                      )}
                      {paciente.raza && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/50 text-blue-300 border border-blue-700 rounded text-xs">
                          Raza: {paciente.raza}
                        </span>
                      )}
                      {paciente.peso && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-900/50 text-cyan-300 border border-cyan-700 rounded text-xs">
                          <TrendingUp size={12} /> Peso actual: {paciente.peso} kg
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={imprimirExpediente}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition"
            >
              <Printer size={18} /> Imprimir Expediente
            </button>
          </div>

          {/* Pestañas */}
          <div className="flex gap-1 mt-4 border-b border-gray-700 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition rounded-t-lg whitespace-nowrap ${
                  tabActiva === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido scrollable */}
        <div ref={expedienteRef} className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Línea del Tiempo */}
              {tabActiva === 'timeline' && (
                <div className="space-y-4">
                  {consultas.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No hay consultas registradas</p>
                  ) : (
                    consultas.map((consulta) => (
                      <div key={consulta.id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-gray-400">
                            <Clock size={14} className="inline mr-1" />
                            {new Date(consulta.fecha_consulta).toLocaleString('es-SV')}
                            {' - '}
                            <span className="text-white font-medium">{consulta.medico_nombre}</span>
                          </p>
                          {consulta.receta && (
                            <span className="text-xs text-cyan-400 flex items-center gap-1">
                              <File size={12} /> Receta
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          <div>
                            <p className="text-xs text-gray-400">S (Subjetivo):</p>
                            <p className="text-sm text-gray-300">{consulta.subjetivo || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">O (Objetivo):</p>
                            <p className="text-sm text-gray-300">{consulta.objetivo || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">A (Análisis):</p>
                            <p className="text-sm text-gray-300">{consulta.analisis || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">P (Plan):</p>
                            <p className="text-sm text-gray-300">{consulta.plan || '-'}</p>
                          </div>
                          {consulta.receta && (
                            <div className="md:col-span-2 mt-2 bg-gray-800/50 p-2 rounded">
                              <p className="text-xs text-gray-400">Receta:</p>
                              <p className="text-sm text-gray-300 whitespace-pre-wrap">{consulta.receta}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Pestaña: CONTROL DE PESO */}
              {tabActiva === 'peso' && isVeterinaria && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Scale className="text-purple-400" /> Evolución de Peso
                      </h3>
                      <p className="text-sm text-gray-400">Historial de registros de peso.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRegistroPeso(true)}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-sm font-bold flex items-center gap-1.5 transition"
                      >
                        <Plus size={16} /> Registrar Peso
                      </button>
                      <button
                        onClick={() => setShowGraficaPeso(true)}
                        className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 rounded-lg text-sm font-bold flex items-center gap-1.5 transition"
                      >
                        <TrendingUp size={16} /> Ver Gráfica
                      </button>
                    </div>
                  </div>

                  {pesos.length === 0 ? (
                    <div className="text-center py-10 bg-gray-800/30 rounded-lg border border-gray-700">
                      <Scale className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No hay registros de peso aún.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-gray-800/30 rounded-lg border border-gray-700">
                      <table className="min-w-full divide-y divide-gray-700 text-sm">
                        <thead className="bg-gray-900/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-400 font-semibold">Fecha</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-semibold">Peso</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-semibold">Origen</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-semibold">Registrado por</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-semibold">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {pesos.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-800/50">
                              <td className="px-4 py-3 text-gray-300">
                                {new Date(p.fecha_registro).toLocaleString('es-SV')}
                              </td>
                              <td className="px-4 py-3 text-white font-bold text-lg">
                                {p.peso} kg
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  p.origen === 'Consulta' ? 'bg-blue-900/50 text-blue-300' :
                                  p.origen === 'Manual' ? 'bg-amber-900/50 text-amber-300' :
                                  'bg-gray-700 text-gray-300'
                                }`}>
                                  {p.origen}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400">{p.usuario_nombre || '-'}</td>
                              <td className="px-4 py-3 text-gray-400">{p.observaciones || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Módulo específico (Odontograma o Vacunas) */}
              {tabActiva === 'modulo' && (
                <div>
                  {isDental ? (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Historial de Odontogramas</h3>
                      {odontogramas.length === 0 ? (
                        <p className="text-gray-400">No hay odontogramas registrados</p>
                      ) : (
                        <div className="space-y-3">
                          {odontogramas.map((odo, idx) => {
                            const isInicial = idx === odontogramas.length - 1;
                            return (
                              <div key={odo.id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 flex justify-between items-center">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-bold text-white">
                                      {new Date(odo.fecha_registro).toLocaleString('es-SV')}
                                    </p>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isInicial ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                                      {isInicial ? 'INICIAL' : 'EVOLUCIÓN'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    Atendido por: Dr(a). {odo.medico_nombre || 'N/A'}
                                  </p>
                                  <p className="text-sm text-gray-300 mt-2 bg-gray-800/50 p-2 rounded">
                                    {odo.observaciones || 'Sin observaciones'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => setSelectedOdontograma(odo)}
                                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                                >
                                  <Eye size={14} /> Ver
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : isVeterinaria ? (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Syringe size={18} className="text-purple-400" />
                          Vacunas Aplicadas
                        </h3>
                        <button
                          onClick={() => setCartillaModal({ isOpen: true, paciente })}
                          className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Syringe size={14} /> Ver Cartilla Completa
                        </button>
                      </div>
                      {vacunas.length === 0 ? (
                        <p className="text-gray-400">No hay vacunas registradas</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-700 text-sm">
                            <thead className="bg-gray-900/50">
                              <tr>
                                <th className="px-4 py-2 text-left text-gray-400">Vacuna</th>
                                <th className="px-4 py-2 text-left text-gray-400">Aplicación</th>
                                <th className="px-4 py-2 text-left text-gray-400">Próxima Dosis</th>
                                <th className="px-4 py-2 text-left text-gray-400">Lote</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                              {vacunas.map((v) => (
                                <tr key={v.id}>
                                  <td className="px-4 py-2 text-white">{v.vacuna_nombre}</td>
                                  <td className="px-4 py-2 text-gray-300">
                                    {new Date(v.fecha_aplicacion).toLocaleDateString('es-SV')}
                                  </td>
                                  <td className="px-4 py-2 text-amber-400">
                                    {v.fecha_proxima ? new Date(v.fecha_proxima).toLocaleDateString('es-SV') : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-gray-300">{v.lote || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">Módulo específico no disponible para este tipo de clínica.</p>
                  )}
                </div>
              )}

              {/* Exámenes */}
              {tabActiva === 'examenes' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Exámenes Solicitados</h3>
                  {examenes.length === 0 ? (
                    <p className="text-gray-400">No hay exámenes solicitados</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-700 text-sm">
                        <thead className="bg-gray-900/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-400">Examen</th>
                            <th className="px-4 py-2 text-left text-gray-400">Solicitado</th>
                            <th className="px-4 py-2 text-left text-gray-400">Estado</th>
                            <th className="px-4 py-2 text-left text-gray-400">Resultado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {examenes.map((ex) => (
                            <tr key={ex.id}>
                              <td className="px-4 py-2 text-white">{ex.examen_nombre}</td>
                              <td className="px-4 py-2 text-gray-300">
                                {new Date(ex.fecha_solicitud).toLocaleDateString('es-SV')}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  ex.estado === 'Completado' ? 'bg-green-900/50 text-green-400' :
                                  ex.estado === 'Pendiente' ? 'bg-yellow-900/50 text-yellow-400' :
                                  'bg-red-900/50 text-red-400'
                                }`}>
                                  {ex.estado}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-300">
                                {ex.resultado_texto || (ex.resultado_archivo_url ? 'Ver archivo' : '-')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Citas */}
              {tabActiva === 'citas' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Citas del Paciente</h3>
                  {citas.length === 0 ? (
                    <p className="text-gray-400">No hay citas registradas</p>
                  ) : (
                    <div className="space-y-3">
                      {citas.map((cita) => (
                        <div key={cita.id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{cita.medico_nombre}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(cita.fecha_hora).toLocaleString('es-SV')} - 
                              <span className={`ml-1 px-2 py-0.5 text-xs rounded ${
                                cita.estado === 'Confirmada' ? 'bg-green-900/50 text-green-400' :
                                cita.estado === 'Programada' ? 'bg-blue-900/50 text-blue-400' :
                                cita.estado === 'Atendida' ? 'bg-purple-900/50 text-purple-400' :
                                'bg-red-900/50 text-red-400'
                              }`}>
                                {cita.estado}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Facturación */}
              {tabActiva === 'facturacion' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Historial de Facturación</h3>
                  {facturas.length === 0 ? (
                    <p className="text-gray-400">No hay facturas asociadas</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-700 text-sm">
                        <thead className="bg-gray-900/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-400">N° Factura</th>
                            <th className="px-4 py-2 text-left text-gray-400">Fecha</th>
                            <th className="px-4 py-2 text-left text-gray-400">Total</th>
                            <th className="px-4 py-2 text-left text-gray-400">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {facturas.map((fact) => (
                            <tr key={fact.id}>
                              <td className="px-4 py-2 text-white">{fact.numero_correlativo}</td>
                              <td className="px-4 py-2 text-gray-300">
                                {new Date(fact.creado_en).toLocaleDateString('es-SV')}
                              </td>
                              <td className="px-4 py-2 text-emerald-400 font-bold">
                                ${parseFloat(fact.total_pagar).toFixed(2)}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  fact.estado === 'Pagada' ? 'bg-green-900/50 text-green-400' :
                                  fact.estado === 'Emitida' ? 'bg-yellow-900/50 text-yellow-400' :
                                  'bg-gray-700 text-gray-400'
                                }`}>
                                  {fact.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-3 border-t border-gray-700 bg-gray-800/80 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modales de Peso */}
      {showGraficaPeso && (
        <ModalGraficaPeso
          paciente={paciente}
          onClose={() => setShowGraficaPeso(false)}
        />
      )}

      {showRegistroPeso && (
        <ModalRegistroRapido
          paciente={paciente}
          onClose={(recargar) => {
            setShowRegistroPeso(false);
            if (recargar) cargarDatos();
          }}
        />
      )}

      {/* Modal Visor de Odontograma */}
      {selectedOdontograma && (
        <OdontogramaViewer
          snapshot={selectedOdontograma}
          paciente={paciente}
          onClose={() => setSelectedOdontograma(null)}
        />
      )}

      {cartillaModal.isOpen && (
        <CartillaModal
          paciente={cartillaModal.paciente}
          onClose={() => setCartillaModal({ isOpen: false, paciente: null })}
        />
      )}
    </div>
  );
};

export default ExpedientePaciente;