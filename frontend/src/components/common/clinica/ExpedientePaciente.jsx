// frontend/src/components/common/clinica/ExpedientePaciente.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Printer, Calendar, User, File, AlertCircle, TrendingUp, Activity,
  Clock, Eye, Download, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  getConsultas,
  getCitas,
  getSolicitudesExamen,
  getOdontogramas,
  getHistorialVacunas
} from '../../../api/clinica';
import { getFacturas } from '../../../api/invoices';
import LoadingSpinner from '../LoadingSpinner';
import { toast } from 'react-toastify';

const ExpedientePaciente = ({ paciente, onClose }) => {
  const { user } = useAuth();
  const tipoOrg = user?.organizacion?.tipo_organizacion || 'Empresa Comercial';

  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState([]);
  const [citas, setCitas] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [odontogramas, setOdontogramas] = useState([]);
  const [vacunas, setVacunas] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [tabActiva, setTabActiva] = useState('timeline');
  const expedienteRef = useRef(null);

  const pacienteId = paciente?.id;

  useEffect(() => {
    const cargarDatos = async () => {
      if (!pacienteId) return;
      setLoading(true);
      try {
        const [
          consultasData,
          citasData,
          examenesData,
          facturasData
        ] = await Promise.all([
          getConsultas({ paciente_id: pacienteId }),
          getCitas({ paciente_id: pacienteId }),
          getSolicitudesExamen({ paciente_id: pacienteId }),
          getFacturas({ cliente_id: paciente.cliente_id, limit: 99999 }),
        ]);
        setConsultas(consultasData || []);
        setCitas(citasData || []);
        setExamenes(examenesData || []);
        setFacturas(facturasData?.facturas || []);

        // Cargar módulos específicos según tipo de clínica
        if (tipoOrg === 'Clínica Dental') {
          const odonto = await getOdontogramas(pacienteId);
          setOdontogramas(odonto || []);
        }
        if (tipoOrg === 'Clinica Veterinaria') {
          const vac = await getHistorialVacunas(pacienteId);
          setVacunas(vac || []);
        }
      } catch (error) {
        console.error('Error cargando expediente:', error);
        toast.error('Error al cargar expediente');
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [pacienteId, paciente.cliente_id, tipoOrg]);

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

  const tabs = [
    { id: 'timeline', label: '📋 Línea del Tiempo' },
  ];

  // Solo mostrar módulo si es Dental o Veterinaria
  if (tipoOrg === 'Clínica Dental' || tipoOrg === 'Clinica Veterinaria') {
    tabs.push({
      id: 'modulo',
      label: tipoOrg === 'Clínica Dental' ? '🦷 Odontograma' : '💉 Vacunas'
    });
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
                    {paciente.fecha_nacimiento ? (
                      `${new Date(paciente.fecha_nacimiento).toLocaleDateString('es-SV')} (${calcularEdad(paciente.fecha_nacimiento)} años)`
                    ) : 'Edad no registrada'}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={14} className="text-purple-400" />
                    {paciente.genero === 'M' ? 'Masculino' : paciente.genero === 'F' ? 'Femenino' : 'Otro'}
                  </span>
                  <span className="flex items-center gap-1">
                    <File size={14} className="text-purple-400" />
                    Cliente: {paciente.cliente_nombre || 'Sin asignar'}
                  </span>
                </div>
                {/* Alertas médicas */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {paciente.alergias && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/50 text-red-300 border border-red-700 rounded text-xs">
                      <AlertCircle size={12} /> Alergias: {paciente.alergias}
                    </span>
                  )}
                  {paciente.enfermedades_cronicas && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-900/50 text-orange-300 border border-orange-700 rounded text-xs">
                      <AlertTriangle size={12} /> Crónico: {paciente.enfermedades_cronicas}
                    </span>
                  )}
                  {paciente.peso && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/50 text-blue-300 border border-blue-700 rounded text-xs">
                      <TrendingUp size={12} /> Peso: {paciente.peso} kg
                    </span>
                  )}
                  {paciente.grupo_sanguineo && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-900/50 text-cyan-300 border border-cyan-700 rounded text-xs">
                      <Activity size={12} /> Sangre: {paciente.grupo_sanguineo}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={imprimirExpediente}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition"
            >
              <Printer size={18} />
              Imprimir Expediente
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
                          <button
                            onClick={() => toast.info('Función de impresión de receta en desarrollo')}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            Ver Receta
                          </button>
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
                            <div className="md:col-span-2">
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

              {/* Módulo específico */}
              {tabActiva === 'modulo' && (
                <div>
                  {tipoOrg === 'Clínica Dental' ? (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Odontograma</h3>
                      {odontogramas.length === 0 ? (
                        <p className="text-gray-400">No hay odontogramas registrados</p>
                      ) : (
                        <div className="space-y-4">
                          {odontogramas.map((odo) => (
                            <div key={odo.id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                              <p className="text-sm text-gray-400">
                                Registrado: {new Date(odo.fecha_registro).toLocaleString('es-SV')}
                              </p>
                              <p className="text-sm text-gray-300 mt-1">
                                Observaciones: {odo.observaciones || 'Sin observaciones'}
                              </p>
                              <p className="text-xs text-gray-400">Dientes: {Object.keys(odo.dientes || {}).length}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : tipoOrg === 'Clinica Veterinaria' ? (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Vacunas Aplicadas</h3>
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
                                  <td className="px-4 py-2 text-gray-300">{new Date(v.fecha_aplicacion).toLocaleDateString('es-SV')}</td>
                                  <td className="px-4 py-2 text-amber-400">{v.fecha_proxima ? new Date(v.fecha_proxima).toLocaleDateString('es-SV') : '-'}</td>
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
                              <td className="px-4 py-2 text-gray-300">{new Date(ex.fecha_solicitud).toLocaleDateString('es-SV')}</td>
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
                              {new Date(cita.fecha_hora).toLocaleString('es-SV')}
                              {' - '}
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                cita.estado === 'Confirmada' ? 'bg-green-900/50 text-green-400' :
                                cita.estado === 'Programada' ? 'bg-blue-900/50 text-blue-400' :
                                cita.estado === 'Atendida' ? 'bg-purple-900/50 text-purple-400' :
                                'bg-red-900/50 text-red-400'
                              }`}>
                                {cita.estado}
                              </span>
                            </p>
                          </div>
                          {cita.estado === 'Programada' && (
                            <span className="text-xs text-cyan-400">Recordatorio: {cita.recordatorio_enviado ? '✅' : '⏳'}</span>
                          )}
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
                            <th className="px-4 py-2 text-left text-gray-400">Condición</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {facturas.map((fact) => (
                            <tr key={fact.id}>
                              <td className="px-4 py-2 text-white">{fact.numero_correlativo}</td>
                              <td className="px-4 py-2 text-gray-300">{new Date(fact.creado_en).toLocaleDateString('es-SV')}</td>
                              <td className="px-4 py-2 text-emerald-400 font-bold">${parseFloat(fact.total_pagar).toFixed(2)}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  fact.estado === 'Pagada' ? 'bg-green-900/50 text-green-400' :
                                  fact.estado === 'Emitida' ? 'bg-yellow-900/50 text-yellow-400' :
                                  'bg-gray-700 text-gray-400'
                                }`}>
                                  {fact.estado}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-300">{fact.condicion_operacion || 'Contado'}</td>
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
    </div>
  );
};

export default ExpedientePaciente;