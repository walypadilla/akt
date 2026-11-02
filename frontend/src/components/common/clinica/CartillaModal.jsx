// frontend/src/components/common/clinica/CartillaModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Syringe, Printer, Link as LinkIcon, Check, Copy,
  Download, Calendar, User, Package, FileText, Trash2, ChevronDown, ChevronUp, Edit2, Save
} from 'lucide-react';
import { getCartillaPaciente, generarPDFCartilla, generarTokenCartilla, editarAplicacionVacuna, eliminarAplicacionVacuna } from '../../../api/clinica';
import { useAuth } from '../../../hooks/useAuth';
import { buildFileUrl } from '../../../api/clinica';
import LoadingSpinner from '../../common/LoadingSpinner';
import { toast } from 'react-toastify';

const CartillaModal = ({ paciente, onClose }) => {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [token, setToken] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [expandedVacuna, setExpandedVacuna] = useState(null);

  // Estados para edición inline de una aplicación
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ fecha_aplicacion: '', fecha_proxima: '', lote: '', observaciones: '' });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, historial: null });
  const [deleting, setDeleting] = useState(false);


  const logoUrl = buildFileUrl(user?.organizacion?.logo_url || user?.logo_url);

  useEffect(() => {
    if (paciente?.id) {
      cargarCartilla();
    } else {
      setLoading(false);
      toast.error('No se pudo identificar al paciente');
    }
  }, [paciente?.id]);

  const cargarCartilla = async () => {
    setLoading(true);
    try {
      const data = await getCartillaPaciente(paciente.id);
      setHistorial(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar cartilla');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async () => {
    try {
      setGenerando(true);
      const blob = await generarPDFCartilla(paciente.id);
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) toast.error('Permite las ventanas emergentes (pop-ups) para imprimir.');
    } catch (err) {
      toast.error('Error al generar el documento');
    } finally {
      setGenerando(false);
    }
  };

  const handleGenerarToken = async () => {
    try {
      const data = await generarTokenCartilla(paciente.id);
      setToken(data);
      toast.success('Link generado. Válido 7 días.');
    } catch {
      toast.error('Error al generar link');
    }
  };

  const handleCopiarLink = async () => {
    if (!token?.link) return;
    try {
      await navigator.clipboard.writeText(token.link);
      setCopiado(true);
      toast.success('Link copiado');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleStartEdit = (h) => {
    if (h.factura_estado === 'Pagada') {
      toast.warning('No se puede editar esta aplicación porque la factura asociada ya está pagada.');
      return;
    }
    setEditingId(h.id);
    setEditForm({
      fecha_aplicacion: h.fecha_aplicacion ? h.fecha_aplicacion.split('T')[0] : '',
      fecha_proxima: h.fecha_proxima ? h.fecha_proxima.split('T')[0] : '',
      lote: h.lote || '',
      observaciones: h.observaciones || ''
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await editarAplicacionVacuna(id, editForm);
      toast.success('Aplicación actualizada exitosamente');
      setEditingId(null);
      cargarCartilla();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar aplicación');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.historial) return;
    setDeleting(true);
    try {
      await eliminarAplicacionVacuna(confirmDelete.historial.id);
      toast.success('Aplicación eliminada');
      setConfirmDelete({ open: false, historial: null });
      cargarCartilla();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const vacunasAgrupadas = useMemo(() => {
    const map = {};
    historial.forEach(h => {
      if (!map[h.vacuna_id]) {
        map[h.vacuna_id] = {
          vacuna_id: h.vacuna_id,
          vacuna_nombre: h.vacuna_nombre,
          historial: [],
          ultima: null,
          semaforo: 'gris',
          mensaje: 'Sin datos'
        };
      }
      map[h.vacuna_id].historial.push(h);
    });

    Object.values(map).forEach(grupo => {
      grupo.historial.sort((a, b) => new Date(b.fecha_aplicacion) - new Date(a.fecha_aplicacion));
      
      // Buscamos la última que NO esté cancelada para calcular el semáforo
      const ultimoActivo = grupo.historial.find(h => h.estado !== 'Cancelada');
      
      grupo.ultima = ultimoActivo || grupo.historial[0];
      grupo.semaforo = grupo.ultima.semaforo;
      grupo.mensaje = grupo.ultima.mensaje_semaforo;
    });

    return Object.values(map);
  }, [historial]);

  const getSemaforoColor = (semaforo) => {
    const colores = {
      verde: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
      amarillo: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
      rojo: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
      gris: 'bg-gray-700/60 text-gray-400 border-gray-600',
    };
    return colores[semaforo] || colores.gris;
  };

  const getSemaforoEmoji = (semaforo) => {
    if (semaforo === 'verde') return '🟢';
    if (semaforo === 'amarillo') return '🟡';
    if (semaforo === 'rojo') return '🔴';
    return '⚪';
  };

  const toggleExpand = (id) => {
    setExpandedVacuna(prev => prev === id ? null : id);
  };

  if (!paciente) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Header con Logo */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center">
              <Syringe size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cartilla de Vacunación</h2>
              <p className="text-xs text-gray-400">{paciente.nombre} {paciente.apellidos || ''} · {paciente.especie || 'Paciente'}</p>
            </div>
          </div>
          
          {logoUrl && (
            <div className="flex-1 flex justify-end pr-6">
              <img src={logoUrl} alt="Logo Clínica" className="h-10 object-contain" />
            </div>
          )}

          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <LoadingSpinner />
          ) : vacunasAgrupadas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Syringe size={48} className="mx-auto mb-3 text-gray-600" />
              <p>No hay vacunas registradas para este paciente</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {vacunasAgrupadas.map((grupo) => {
                  const isExpanded = expandedVacuna === grupo.vacuna_id;
                  const aplicaciones = grupo.historial.length;

                  return (
                    <div key={grupo.vacuna_id} className="bg-gray-700/30 border border-gray-600 rounded-lg overflow-hidden transition-all">
                      <div onClick={() => toggleExpand(grupo.vacuna_id)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-700/50 select-none">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Syringe size={14} className="text-purple-400" />
                            <h4 className="font-semibold text-white">{grupo.vacuna_nombre}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSemaforoColor(grupo.semaforo)}`}>
                              {getSemaforoEmoji(grupo.semaforo)} {grupo.mensaje}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Se aplicó {aplicaciones} {aplicaciones === 1 ? 'vez' : 'veces'} · 
                            Última: {new Date(grupo.ultima.fecha_aplicacion).toLocaleDateString('es-SV')}
                            {grupo.ultima.fecha_proxima && ` · Próxima: ${new Date(grupo.ultima.fecha_proxima).toLocaleDateString('es-SV')}`}
                          </p>
                        </div>
                        <button className="text-gray-400 hover:text-white p-1">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 border-t border-gray-600/50 bg-gray-800/40 overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="text-[10px] text-gray-500 uppercase">
                              <tr>
                                <th className="pb-2">Fecha Aplicación</th>
                                <th className="pb-2">Próxima</th>
                                <th className="pb-2">Lote</th>
                                <th className="pb-2">Médico</th>
                                <th className="pb-2">Factura</th>
                                <th className="pb-2">Notas</th>
                                <th className="pb-2 text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                              {grupo.historial.map((h) => {
                                const isEditing = editingId === h.id;

                                return (
                                  <tr key={h.id} className={`text-gray-300 ${h.estado === 'Cancelada' ? 'opacity-50' : ''}`}>
                                    {isEditing ? (
                                      <>
                                        <td className="py-2">
                                          <input 
                                            type="date" 
                                            value={editForm.fecha_aplicacion} 
                                            onChange={(e) => setEditForm({...editForm, fecha_aplicacion: e.target.value})}
                                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs w-28" 
                                          />
                                        </td>
                                        <td className="py-2">
                                          <input 
                                            type="date" 
                                            value={editForm.fecha_proxima} 
                                            onChange={(e) => setEditForm({...editForm, fecha_proxima: e.target.value})}
                                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs w-28" 
                                          />
                                        </td>
                                        <td className="py-2">
                                          <input 
                                            type="text" 
                                            value={editForm.lote} 
                                            onChange={(e) => setEditForm({...editForm, lote: e.target.value})}
                                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs w-20" 
                                          />
                                        </td>
                                        <td className="py-2">{h.medico_nombre || '-'}</td>
                                        <td className="py-2 text-cyan-400">{h.factura_numero || '-'}</td>
                                        <td className="py-2">
                                          <input 
                                            type="text" 
                                            value={editForm.observaciones} 
                                            onChange={(e) => setEditForm({...editForm, observaciones: e.target.value})}
                                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs w-full" 
                                          />
                                        </td>
                                        <td className="py-2 text-center whitespace-nowrap">
                                          <button onClick={() => handleSaveEdit(h.id)} className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 mr-1" title="Guardar">
                                            <Save size={14} />
                                          </button>
                                          <button onClick={() => setEditingId(null)} className="p-1 bg-gray-600 text-white rounded hover:bg-gray-500" title="Cancelar">
                                            <X size={14} />
                                          </button>
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="py-2 whitespace-nowrap">
                                          {new Date(h.fecha_aplicacion).toLocaleDateString('es-SV')}
                                          {h.estado === 'Cancelada' && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-rose-900/50 text-rose-300 border border-rose-700/50 rounded text-[9px] font-bold">
                                              CANCELADA
                                            </span>
                                          )}
                                          {h.dias_retraso > 0 && h.estado !== 'Cancelada' && (
                                            <span className="ml-2 text-[10px] text-amber-400 font-bold" title="Aplicada después del vencimiento">
                                              (+{h.dias_retraso}d tarde)
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 whitespace-nowrap">{h.fecha_proxima ? new Date(h.fecha_proxima).toLocaleDateString('es-SV') : '-'}</td>
                                        <td className="py-2 font-mono">{h.lote || '-'}</td>
                                        <td className="py-2">{h.medico_nombre || '-'}</td>
                                        <td className="py-2 text-cyan-400">{h.factura_numero || '-'}</td>
                                        <td className="py-2 italic text-gray-400 max-w-[150px] truncate" title={h.observaciones}>{h.observaciones || '-'}</td>
                                        <td className="py-2 text-center whitespace-nowrap">
                                          <button
                                            onClick={() => handleStartEdit(h)}
                                            className="p-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded hover:bg-yellow-500 hover:text-white transition mr-1"
                                            title="Editar aplicación"
                                          >
                                            <Edit2 size={13} />
                                          </button>
                                          <button
                                            onClick={() => setConfirmDelete({ open: true, historial: h })}
                                            disabled={h.factura_estado === 'Pagada' || (h.factura_id && h.factura_estado !== 'Anulada')}
                                            title={
                                              h.factura_estado === 'Pagada'
                                                ? 'Factura pagada: no se puede eliminar'
                                                : h.factura_id && h.factura_estado !== 'Anulada'
                                                ? 'Vinculada a factura activa: anule primero la factura'
                                                : 'Eliminar aplicación'
                                            }
                                            className={`p-1 rounded transition border ${
                                              h.factura_id && h.factura_estado && h.factura_estado !== 'Anulada'
                                                ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
                                                : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500 hover:text-white'
                                            }`}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mt-6">
                <h4 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2"><LinkIcon size={14} className="text-purple-400" /> Compartir con el dueño</h4>
                {!token ? (
                  <button onClick={handleGenerarToken} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition">
                    <LinkIcon size={12} /> Generar link temporal (7 días)
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-600 rounded-lg p-2">
                      <input type="text" value={token.link} readOnly className="flex-1 bg-transparent text-xs text-gray-300 outline-none font-mono" />
                      <button onClick={handleCopiarLink} className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 rounded text-xs font-semibold transition flex items-center gap-1">
                        {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">⚠️ El link expira el {new Date(token.expira_en).toLocaleDateString('es-SV')} a las {new Date(token.expira_en).toLocaleTimeString('es-SV')}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 flex justify-end gap-2 bg-gray-800/80 flex-shrink-0">
          <button onClick={handleImprimir} disabled={generando || historial.length === 0} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition flex items-center gap-2 shadow-md shadow-cyan-900/30">
            <Printer size={14} /> {generando ? 'Generando...' : 'Imprimir Cartilla'}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">Cerrar</button>
        </div>
      </div>

      {confirmDelete.open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-sm w-full p-6">
            <div className="w-14 h-14 rounded-full bg-rose-600/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 text-center">Eliminar aplicación</h3>
            <p className="text-sm text-gray-300 mb-6 text-center">
              ¿Eliminar la aplicación de <strong className="text-white">{confirmDelete.historial?.vacuna_nombre}</strong>{' '}
              del {confirmDelete.historial?.fecha_aplicacion
                ? new Date(confirmDelete.historial.fecha_aplicacion).toLocaleDateString('es-SV')
                : ''}?<br />
              <span className="text-xs text-amber-400">Se devolverá 1 unidad al stock del producto.</span>
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmDelete({ open: false, historial: null })}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg transition font-bold"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
};



export default CartillaModal;