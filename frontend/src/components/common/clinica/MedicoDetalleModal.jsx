// frontend/src/components/common/clinica/MedicoDetalleModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X, Printer, Download, User, Stethoscope, FileText, Dog, Cat,
  DollarSign, Calendar, Award, TrendingUp, CheckCircle, AlertCircle, Heart, Syringe
} from 'lucide-react';
import { getMedicoDetalle, exportarConsultasMedico } from '../../../api/clinica';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'react-toastify';
import LoadingSpinner from '../LoadingSpinner';

const mesesNombres = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const normalizar = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const MedicoDetalleModal = ({ medicoId, onClose }) => {
  const { user } = useAuth();
  const tipoOrg = user?.organizacion?.tipo_organizacion || 'Empresa Comercial';
  const tipoNorm = normalizar(tipoOrg);
  const isVeterinaria = tipoNorm === 'clinica veterinaria';
  const isDental = tipoNorm === 'clinica dental';
  const isGeneral = tipoNorm === 'clinica general';

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

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  };

  const cargarDetalle = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMedicoDetalle(medicoId, anioSeleccionado, mesSeleccionado);
      setMedico(data.medico);
      setConsultas(data.consultas || []);
      setResumen(data.resumen);

      if (!anioSeleccionado && data.resumen.aniosDisponibles?.length > 0) {
        setAnioSeleccionado(data.resumen.aniosDisponibles[0]);
      }
    } catch (err) {
      console.error('Error al cargar detalle:', err);
      setError('No se pudo cargar la información del médico.');
      toast.error('Error al cargar detalle del médico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (medicoId) cargarDetalle();
  }, [medicoId, anioSeleccionado, mesSeleccionado]);

  // ============ EXPORTAR ============
  const handleExportar = async () => {
    try {
      const blob = await exportarConsultasMedico(medicoId, {
        anio: anioSeleccionado,
        mes: mesSeleccionado,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `consultas_${medico?.nombre?.replace(/\s+/g, '_') || 'medico'}_${anioSeleccionado || 'todos'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte exportado correctamente');
    } catch (err) {
      console.error('Error al exportar:', err);
      toast.error('Error al exportar el archivo');
    }
  };

  // ============ IMPRIMIR ============
  const handleImprimir = () => {
    if (!medico) return;

    const filas = consultas.map((c) => {
      const edad = calcularEdad(c.paciente_fecha_nacimiento);
      let pacienteDetalle = '';
      if (isVeterinaria) {
        pacienteDetalle = `${c.paciente_especie || ''} ${c.paciente_raza ? '- ' + c.paciente_raza : ''}`;
      } else {
        pacienteDetalle = edad !== null ? `${edad} años` : '';
      }
      return `
        <tr>
          <td>${c.fecha_consulta ? new Date(c.fecha_consulta).toLocaleDateString('es-SV') : '-'}</td>
          <td>${c.paciente_nombre || 'N/R'} ${c.paciente_apellidos || ''}<br><small>${pacienteDetalle}</small></td>
          <td>${c.diagnostico || '-'}</td>
          <td>${c.diagnostico_codigo || '-'}</td>
          <td>${c.factura_numero || 'Sin factura'}</td>
          <td>${c.factura_estado || '-'}</td>
          <td style="text-align:right">${c.factura_total ? '$' + Number(c.factura_total).toFixed(2) : '—'}</td>
        </tr>
      `;
    }).join('');

    const ventana = window.open('', '_blank', 'width=900,height=700');
    if (!ventana) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte - ${medico.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #1a1a2e; }
          h1 { color: #8b5cf6; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .kpis { display: flex; gap: 20px; margin: 20px 0; }
          .kpi { flex: 1; background: #f5f5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6; }
          .kpi .label { font-size: 12px; color: #666; text-transform: uppercase; }
          .kpi .value { font-size: 22px; font-weight: bold; color: #1a1a2e; margin-top: 5px; }
          .kpi .value.green { color: #059669; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background: #1a1a2e; color: #fff; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
          tr:nth-child(even) { background: #fafafa; }
          .footer { text-align: center; font-size: 11px; color: #888; margin-top: 30px; }
        </style>
      </head>
      <body>
        <h1>Reporte del Médico</h1>
        <div class="subtitle">
          <strong>${medico.nombre}</strong> — ${medico.especialidad || 'Sin especialidad'} 
          | Licencia: ${medico.numero_licencia || 'N/A'}
          ${medico.correo ? ' | ' + medico.correo : ''}
        </div>
        <div style="color: #666; font-size: 12px; margin-bottom: 15px;">
          Período: ${anioSeleccionado || 'Todos los años'} ${mesSeleccionado ? '- ' + mesesNombres[parseInt(mesSeleccionado) - 1] : ''}
        </div>
        <div class="kpis">
          <div class="kpi"><div class="label">Total Consultas</div><div class="value">${resumen.totalConsultas}</div></div>
          <div class="kpi"><div class="label">Facturadas</div><div class="value">${resumen.consultasConFactura}</div></div>
          <div class="kpi"><div class="label">Total Facturado (Pagado)</div><div class="value green">$${Number(resumen.totalFacturado || 0).toFixed(2)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Paciente</th><th>Diagnóstico</th>
              <th>CIE-10</th><th>N° Factura</th><th>Estado</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${filas || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">Sin consultas</td></tr>'}</tbody>
        </table>
        <div class="footer">Generado el ${new Date().toLocaleString('es-SV')}</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    ventana.document.close();
  };

  // ============ RENDER: CELDA DEL PACIENTE ============
  const renderPaciente = (c) => {
    const edad = calcularEdad(c.paciente_fecha_nacimiento);
    return (
      <div>
        <div className="text-white font-medium">
          {c.paciente_nombre || 'No registrado'} {c.paciente_apellidos || ''}
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-400 mt-0.5">
          {/* Veterinaria */}
          {isVeterinaria && (
            <>
              {c.paciente_especie && (
                <span className="inline-flex items-center gap-0.5">
                  <Dog size={10} /> {c.paciente_especie}
                </span>
              )}
              {c.paciente_raza && <span>• {c.paciente_raza}</span>}
              {c.paciente_color && <span>• {c.paciente_color}</span>}
              {c.paciente_peso && <span>• {c.paciente_peso} kg</span>}
            </>
          )}

          {/* Clínica General */}
          {isGeneral && (
            <>
              {edad !== null && <span>• {edad} años</span>}
              {c.paciente_genero && (
                <span>• {c.paciente_genero === 'M' ? 'Masc.' : c.paciente_genero === 'F' ? 'Fem.' : 'Otro'}</span>
              )}
              {c.paciente_grupo_sanguineo && (
                <span className="inline-flex items-center gap-0.5">
                  <Heart size={10} /> {c.paciente_grupo_sanguineo}
                </span>
              )}
            </>
          )}

          {/* Dental */}
          {isDental && (
            <>
              {edad !== null && <span>• {edad} años</span>}
              {c.paciente_genero && (
                <span>• {c.paciente_genero === 'M' ? 'Masc.' : c.paciente_genero === 'F' ? 'Fem.' : 'Otro'}</span>
              )}
              {c.paciente_tipo_denticion && <span>• {c.paciente_tipo_denticion}</span>}
            </>
          )}

          {/* Alertas para todos */}
          {c.paciente_alergias && (
            <span className="inline-flex items-center gap-0.5 text-red-400" title={`Alergias: ${c.paciente_alergias}`}>
              <AlertCircle size={10} /> Alergias
            </span>
          )}
        </div>
      </div>
    );
  };

  if (!medicoId) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* ENCABEZADO */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/90 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-600/30 flex items-center justify-center text-3xl font-bold text-purple-400">
                {medico?.nombre?.charAt(0)?.toUpperCase() || 'M'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Stethoscope size={20} className="text-purple-400" />
                  {medico?.nombre || 'Cargando...'}
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-300 mt-1">
                  <span className="flex items-center gap-1">
                    <Award size={14} className="text-purple-400" />
                    {medico?.especialidad || 'Sin especialidad'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={14} className="text-purple-400" />
                    Licencia: {medico?.numero_licencia || 'N/A'}
                  </span>
                  {medico?.correo && (
                    <span className="flex items-center gap-1">
                      <User size={14} className="text-purple-400" />
                      {medico.correo}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    medico?.activo
                      ? 'bg-green-900/40 text-green-300 border border-green-700'
                      : 'bg-red-900/40 text-red-300 border border-red-700'
                  }`}>
                    {medico?.activo ? '● Activo' : '● Inactivo'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-900/40 text-purple-300 border border-purple-700">
                    {isVeterinaria ? '🐾 Veterinaria' : isDental ? '🦷 Dental' : '🏥 Clínica General'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleImprimir}
                disabled={!medico || consultas.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition"
              >
                <Printer size={16} /> Imprimir
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1">
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && !medico ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="p-4 bg-red-900/40 text-red-200 rounded-lg border border-red-700">
              <AlertCircle className="inline mr-2" size={18} />
              {error}
            </div>
          ) : (
            <>
              {/* FILTROS */}
              <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    <Calendar size={12} className="inline mr-1" /> Año
                  </label>
                  <select
                    value={anioSeleccionado}
                    onChange={(e) => { setAnioSeleccionado(e.target.value); setMesSeleccionado(''); }}
                    className="bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todos los años</option>
                    {(resumen.aniosDisponibles || []).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    <Calendar size={12} className="inline mr-1" /> Mes
                  </label>
                  <select
                    value={mesSeleccionado}
                    onChange={(e) => setMesSeleccionado(e.target.value)}
                    disabled={!anioSeleccionado || resumen.mesesDisponibles.length === 0}
                    className="bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    <option value="">Todos los meses</option>
                    {(resumen.mesesDisponibles || []).map((m) => (
                      <option key={m} value={m}>{mesesNombres[parseInt(m) - 1]}</option>
                    ))}
                  </select>
                </div>

                <div className="ml-auto flex gap-2">
                  <button
                    onClick={handleExportar}
                    disabled={consultas.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white text-xs font-semibold rounded-lg transition"
                  >
                    <Download size={14} /> Exportar CSV
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                  <p className="text-xs text-gray-400 uppercase flex items-center gap-1">
                    <FileText size={12} /> Total Consultas
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">{resumen.totalConsultas}</p>
                </div>
                <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                  <p className="text-xs text-gray-400 uppercase flex items-center gap-1">
                    <CheckCircle size={12} /> Consultas Facturadas
                  </p>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">{resumen.consultasConFactura}</p>
                </div>
                <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                  <p className="text-xs text-gray-400 uppercase flex items-center gap-1">
                    <DollarSign size={12} /> Total Facturado (Pagado)
                  </p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    ${Number(resumen.totalFacturado || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* TABLA */}
              <div className="bg-gray-900/40 rounded-lg border border-gray-700 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-700 bg-gray-800/40">
                  <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={14} className="text-purple-400" />
                    Historial de Consultas y Facturación
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-900/90 sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="px-3 py-2 text-gray-300 font-bold uppercase">Fecha</th>
                        <th className="px-3 py-2 text-gray-300 font-bold uppercase">
                          {isVeterinaria ? 'Mascota' : 'Paciente'}
                        </th>
                        <th className="px-3 py-2 text-gray-300 font-bold uppercase">Diagnóstico</th>
                        <th className="px-3 py-2 text-gray-300 font-bold uppercase">CIE-10</th>
                        <th className="px-3 py-2 text-gray-300 font-bold uppercase">N° Factura</th>
                        <th className="px-3 py-2 text-gray-300 font-bold uppercase">Estado</th>
                        <th className="px-3 py-2 text-gray-300 font-bold uppercase text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/60">
                      {consultas.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-10 text-center text-gray-400">
                            <FileText className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                            <p>No se encontraron consultas para los filtros seleccionados.</p>
                          </td>
                        </tr>
                      ) : (
                        consultas.map((c) => (
                          <tr key={c.consulta_id} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                              {c.fecha_consulta ? new Date(c.fecha_consulta).toLocaleDateString('es-SV') : '-'}
                            </td>
                            <td className="px-3 py-2">{renderPaciente(c)}</td>
                            <td className="px-3 py-2 text-gray-300 max-w-xs truncate" title={c.diagnostico || ''}>
                              {c.diagnostico || '-'}
                            </td>
                            <td className="px-3 py-2 text-gray-400">{c.diagnostico_codigo || '-'}</td>
                            <td className="px-3 py-2">
                              {c.factura_numero ? (
                                <span className="font-semibold text-cyan-300">{c.factura_numero}</span>
                              ) : (
                                <span className="text-gray-500 italic">Sin factura</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {c.factura_estado ? (
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  c.factura_estado === 'Pagada'
                                    ? 'bg-green-900/40 text-green-300'
                                    : 'bg-yellow-900/40 text-yellow-300'
                                }`}>
                                  {c.factura_estado}
                                </span>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-400">
                              {c.factura_total ? `$${Number(c.factura_total).toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end p-3 border-t border-gray-700 bg-gray-800/80 rounded-b-xl gap-2">
          <button
            onClick={handleExportar}
            disabled={consultas.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition flex items-center gap-2"
          >
            <Download size={14} /> Exportar
          </button>
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

export default MedicoDetalleModal;