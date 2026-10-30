// frontend/src/pages/organization/Citas.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Calendar, Clock, CheckCircle, XCircle, Plus, ChevronLeft, ChevronRight, 
  Filter, Edit2, MessageCircle, Eye, ClipboardList, User
} from 'lucide-react';
import { 
  getCitas, 
  createCita, 
  updateCita, 
  updateCitaStatus, 
  enviarWhatsAppCita, 
  getPacientes, 
  getMedicos 
} from '../../api/clinica';
import { getClients } from '../../api/clients'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';

const ESTADO_CONFIG = {
  'Programada': {
    postit: 'bg-cyan-600 text-white font-bold shadow-sm hover:bg-cyan-500',
    badge: 'bg-cyan-500 text-white',
  },
  'Confirmada': {
    postit: 'bg-emerald-600 text-white font-bold shadow-sm hover:bg-emerald-500',
    badge: 'bg-emerald-500 text-white',
  },
  'En Espera': {
    postit: 'bg-amber-500 text-slate-950 font-black shadow-sm hover:bg-amber-400',
    badge: 'bg-amber-500 text-slate-950',
  },
  'Atendida': {
    postit: 'bg-purple-600 text-white font-bold shadow-sm hover:bg-purple-500',
    badge: 'bg-purple-500 text-white',
  },
  'Cancelada': {
    postit: 'bg-rose-600 text-white font-bold shadow-sm opacity-80 hover:opacity-100 line-through',
    badge: 'bg-rose-500 text-white',
  },
};

const DEFAULT_CONFIG = {
  postit: 'bg-slate-700 text-white font-bold shadow-sm',
  badge: 'bg-slate-600 text-white',
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const Citas = () => {
  const { user } = useAuth();
  const tipoOrg = user?.organizacion?.tipo_organizacion || 'Empresa Comercial';
  const isClinica = tipoOrg.includes('Clinica');

  const tieneWhatsAppActivado = 
    user?.organizacion?.whatsapp_activado === 1 || 
    user?.organizacion?.whatsapp_activado === true || 
    user?.organizacion?.whatsapp_activado === '1';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMedico, setFiltroMedico] = useState('');

  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCita, setEditingCita] = useState(null);
  
  // NUEVO ESTADO: Para ver el detalle de una cita
  const [citaDetalle, setCitaDetalle] = useState(null);

  const [formData, setFormData] = useState({
    paciente_id: '', cliente_id: '', medico_id: '', fecha_hora: '', 
    duracion_minutos: 30, observaciones: '', titulo: ''
  });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const loadData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const fechaInicio = `${year}-${String(month + 1).padStart(2, '0')}-01 00:00:00`;
      const fechaFin = `${year}-${String(month + 1).padStart(2, '0')}-${getDaysInMonth(year, month)} 23:59:59`;

      const promises = [getCitas({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })];
      
      if (isClinica) {
        promises.push(getPacientes({ limit: 99999 }));
        promises.push(getMedicos());
      } else {
        promises.push(getClients({ limit: 99999 }));
      }

      const results = await Promise.all(promises);
      
      setCitas(results[0] || []);
      if (isClinica) {
        setPacientes(results[1]?.pacientes || results[1] || []);
        setMedicos(results[2] || []);
      } else {
        setClientes(results[1]?.clientes || results[1] || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentDate, isClinica]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const kpis = useMemo(() => {
    let filtered = citas;
    if (isClinica && filtroMedico) {
      filtered = filtered.filter(c => c.medico_id === Number(filtroMedico));
    }
    return {
      total: filtered.length,
      confirmadas: filtered.filter(c => c.estado === 'Confirmada').length,
      atendidas: filtered.filter(c => c.estado === 'Atendida').length,
      canceladas: filtered.filter(c => c.estado === 'Cancelada').length,
    };
  }, [citas, filtroMedico, isClinica]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: new Date(year, month, i - firstDay + 1), isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    return days;
  }, [currentDate]);

  const citasPorDia = useMemo(() => {
    const map = {};
    citas.forEach(c => {
      if (filtroEstado && c.estado !== filtroEstado) return;
      if (isClinica && filtroMedico && c.medico_id !== Number(filtroMedico)) return;

      const dateObj = new Date(c.fecha_hora);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(c);
    });
    Object.keys(map).forEach(key => map[key].sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)));
    return map;
  }, [citas, filtroEstado, filtroMedico, isClinica]);

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const citasHoy = citasPorDia[todayKey] || [];

  const handleOpenForm = (cita = null, dateStr = null) => {
    if (cita) {
      setEditingCita(cita);
      const d = new Date(cita.fecha_hora);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60 * 1000);
      setFormData({
        paciente_id: cita.paciente_id || '', 
        cliente_id: cita.cliente_id || '', 
        medico_id: cita.medico_id || '',
        fecha_hora: local.toISOString().slice(0, 16),
        duracion_minutos: cita.duracion_minutos, 
        observaciones: cita.observaciones || '',
        titulo: cita.titulo || ''
      });
    } else {
      setEditingCita(null);
      setFormData({
        paciente_id: '', cliente_id: '', medico_id: '', 
        fecha_hora: dateStr ? `${dateStr}T09:00` : '', 
        duracion_minutos: 30, observaciones: '', titulo: ''
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (new Date(formData.fecha_hora) < new Date()) {
      return toast.warning('No puedes agendar una cita en una fecha y hora pasada.');
    }

    if (!isClinica && !editingCita) {
      const citasMismaHora = citas.filter(c => 
        c.fecha_hora === formData.fecha_hora && c.estado !== 'Cancelada'
      );
      if (citasMismaHora.length > 0) {
        const confirmar = window.confirm('Ya hay una cita agendada para esta misma hora. ¿Deseas agregar otra de todas formas?');
        if (!confirmar) return;
      }
    }

    try {
      const payload = { ...formData };
      if (isClinica) {
        delete payload.cliente_id;
        delete payload.titulo;
      } else {
        delete payload.paciente_id;
        delete payload.medico_id;
      }

      if (editingCita) {
        await updateCita(editingCita.id, payload);
        toast.success('Cita actualizada');
      } else {
        await createCita(payload);
        toast.success('Cita creada');
      }
      setShowForm(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar cita');
    }
  };

  const handleCambiarEstado = async (id, estado) => {
    setConfirmModal({
      isOpen: true, title: 'Cambiar Estado', message: `¿Cambiar estado a "${estado}"?`,
      onConfirm: async () => {
        try {
          await updateCitaStatus(id, estado);
          toast.success('Estado actualizado');
          loadData();
          if (citaDetalle && citaDetalle.id === id) {
            setCitaDetalle({ ...citaDetalle, estado });
          }
        } catch (error) { toast.error('Error al cambiar estado'); }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  };

  const handleEnviarWhatsApp = async (id) => {
    const toastId = toast.loading('Enviando recordatorio...');
    try {
      const res = await enviarWhatsAppCita(id);
      toast.update(toastId, { render: res.message, type: 'success', isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.update(toastId, { 
        render: error.response?.data?.message || 'Error al enviar WhatsApp', 
        type: 'error', 
        isLoading: false, 
        autoClose: 3000 
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-5">
      {/* HEADER PRINCIPAL */}
      <div className="bg-[#0f172a]/90 p-6 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-400" /> Calendario de Citas
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-medium">Gestión visual de citas por mes</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={goToToday} className="text-xs px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold transition">
            Hoy
          </button>
          
          <div className="flex items-center bg-slate-900/90 rounded-lg border border-slate-700/80 p-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition">
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-black text-white px-3 min-w-[110px] text-center uppercase tracking-wider">
              {MESES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition">
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={() => handleOpenForm()}
            className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-purple-900/40"
          >
            <Plus size={16} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* KPIS Y WIDGET DE CITA DE HOY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        
        {/* CARD 1: CITAS DE HOY */}
        <button 
          onClick={() => setSelectedDay(todayKey)} 
          className="text-left p-3 rounded-2xl border bg-slate-900/80 border-cyan-500/50 hover:bg-slate-800/80 transition-all flex flex-col justify-between shadow-lg shadow-cyan-950/30 hover:border-cyan-400 group relative overflow-hidden h-[120px]"
        >
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              CITAS DE HOY ({new Date().getDate()} {MESES[new Date().getMonth()].slice(0,3)})
            </span>
            <span className="text-[10px] font-black text-white bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-full">
              {citasHoy.length}
            </span>
          </div>

          <div className="flex flex-col gap-[2px] w-full my-auto">
            {citasHoy.length > 0 ? (
              citasHoy.slice(0, 3).map(cita => {
                const cfg = ESTADO_CONFIG[cita.estado] || DEFAULT_CONFIG;
                const hora = new Date(cita.fecha_hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false });
                const nombreDisplay = isClinica ? cita.paciente_nombre : cita.cliente_nombre;
                return (
                  <div key={cita.id} className={`flex items-center gap-1.5 px-2 py-[2px] rounded transition-transform group-hover:scale-[1.01] ${cfg.postit}`}>
                    <span className="text-[8.5px] font-black shrink-0 text-white leading-none">{hora}</span>
                    <span className="text-[8.5px] font-bold truncate text-white leading-none">{nombreDisplay}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] font-semibold text-slate-500 text-center italic my-1">
                Sin citas programadas para hoy
              </p>
            )}
            {citasHoy.length > 3 && (
              <div className="text-[7.5px] font-black text-cyan-300 text-center py-[1px] bg-cyan-950/60 rounded border border-cyan-500/30 leading-none">
                +{citasHoy.length - 3} citas más
              </div>
            )}
          </div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block text-right group-hover:text-cyan-300 transition-colors">
            Haz clic para ver listado completo →
          </span>
        </button>

        {/* CARD 2: TOTAL CITAS DEL MES */}
        <button onClick={() => setFiltroEstado('')} className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between h-[120px] ${filtroEstado === '' ? 'bg-slate-800/90 border-purple-500 shadow-lg' : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL CITAS DEL MES</p>
          <p className="text-3xl font-extrabold text-white">{kpis.total}</p>
        </button>

        {/* CARD 3: ATENDIDAS */}
        <button onClick={() => setFiltroEstado('Atendida')} className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between h-[120px] ${filtroEstado === 'Atendida' ? 'bg-purple-950/30 border-purple-500 shadow-lg' : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'}`}>
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">ATENDIDAS</p>
          <p className="text-3xl font-extrabold text-purple-400">{kpis.atendidas}</p>
        </button>

        {/* CARD 4: CANCELADAS */}
        <button onClick={() => setFiltroEstado('Cancelada')} className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between h-[120px] ${filtroEstado === 'Cancelada' ? 'bg-rose-950/30 border-rose-500 shadow-lg' : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'}`}>
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">CANCELADAS</p>
          <p className="text-3xl font-extrabold text-rose-400">{kpis.canceladas}</p>
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="flex items-center gap-3 bg-[#0f172a]/90 px-4 py-3 rounded-2xl border border-slate-800/80">
        <Filter size={16} className="text-purple-400" />
        <span className="text-xs font-black text-slate-300 uppercase tracking-wider">FILTRAR:</span>
        
        {isClinica && (
          <select value={filtroMedico} onChange={(e) => setFiltroMedico(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium">
            <option value="">Todos los médicos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        )}

        {(filtroEstado || filtroMedico) && (
          <button onClick={() => { setFiltroEstado(''); setFiltroMedico(''); }} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition font-bold ml-auto">
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* CALENDARIO */}
      <div className="bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-6 py-2.5 flex items-center justify-between border-b border-cyan-500/30">
          <h2 className="text-sm font-black text-white uppercase tracking-widest drop-shadow">
            {MESES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <span className="text-[9px] font-extrabold text-cyan-200 uppercase tracking-wider bg-black/20 px-2.5 py-0.5 rounded-full">
            Vista Mensual
          </span>
        </div>

        <div className="grid grid-cols-7 bg-[#1e293b]/90 border-b border-slate-800">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="py-2 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {dia}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((dayObj, idx) => {
            const dateKey = `${dayObj.date.getFullYear()}-${String(dayObj.date.getMonth() + 1).padStart(2, '0')}-${String(dayObj.date.getDate()).padStart(2, '0')}`;
            const citasDia = citasPorDia[dateKey] || [];
            const isToday = dateKey === todayKey;
            const isSelected = selectedDay === dateKey;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(dateKey)}
                className={`min-h-[80px] p-1.5 border-b border-r border-slate-800/80 cursor-pointer transition-all duration-200 flex flex-col group relative
                  ${!dayObj.isCurrentMonth ? 'bg-[#0b0f19]/80 opacity-40' : 'bg-[#0f172a]/40'}
                  ${isToday ? 'bg-cyan-950/30' : ''}
                  hover:bg-slate-800/60 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.2)] hover:border-cyan-500/40 z-0 hover:z-10
                  ${isSelected ? 'ring-2 ring-purple-500 bg-slate-800/80 z-10' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-1 pointer-events-none">
                  <span className={`text-[10px] font-black flex items-center justify-center w-5 h-5 rounded-full transition-all ${isToday ? 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/30' : 'text-slate-400 group-hover:text-cyan-300'}`}>
                    {dayObj.date.getDate()}
                  </span>
                  {citasDia.length > 0 && <span className="text-[9px] font-black text-slate-300">{citasDia.length} c.</span>}
                </div>
                
                <div className="flex flex-col gap-[3px] overflow-hidden pointer-events-none">
                  {citasDia.slice(0, 3).map(cita => {
                    const cfg = ESTADO_CONFIG[cita.estado] || DEFAULT_CONFIG;
                    const horaFormateada = new Date(cita.fecha_hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const nombreDisplay = isClinica ? (cita.paciente_nombre || 'Paciente') : (cita.cliente_nombre || 'Cliente');

                    return (
                      <div
                        key={cita.id}
                        className={`flex items-center gap-1.5 px-1.5 py-[3px] rounded transition-transform group-hover:scale-[1.01] ${cfg.postit}`}
                      >
                        <span className="text-[9px] font-black shrink-0 text-white leading-none">{horaFormateada}</span>
                        <span className="text-[9px] font-bold truncate text-white leading-none">{nombreDisplay}</span>
                      </div>
                    );
                  })}
                  
                  {citasDia.length > 3 && (
                    <div className="text-[8px] font-black text-cyan-400 text-center py-[2px] bg-cyan-950/40 rounded border border-cyan-500/30 leading-none mt-[1px]">
                      +{citasDia.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE DÍA */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          {/* Se agregó overflow-hidden y max-w-3xl para acomodar mejor los botones con texto */}
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-black text-white uppercase tracking-wider capitalize">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-white transition-colors"><XCircle size={24} /></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {citasPorDia[selectedDay]?.length > 0 ? (
                citasPorDia[selectedDay].map(cita => {
                  const cfg = ESTADO_CONFIG[cita.estado] || DEFAULT_CONFIG;
                  return (
                    // Cambiado a flex-col con un diseño de tarjeta más estructurado
                    <div key={cita.id} className="bg-slate-800/40 border border-slate-700/70 rounded-2xl p-4 flex flex-col gap-3 hover:bg-slate-800/60 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <Clock size={16} className="text-purple-400" />
                            <span className="text-sm font-black text-white">
                              {new Date(cita.fecha_hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md shadow-sm ${cfg.badge}`}>
                              {cita.estado}
                            </span>
                          </div>
                          <p className="text-base text-slate-100 font-bold mt-1">
                            {isClinica ? cita.paciente_nombre : cita.cliente_nombre}
                          </p>
                          
                          {isClinica ? (
                            <p className="text-xs text-slate-400 font-medium">Dr. {cita.medico_nombre}</p>
                          ) : (
                            <p className="text-xs text-slate-400 font-medium">{cita.titulo || 'Sin motivo especificado'}</p>
                          )}
                        </div>
                      </div>

                      {/* Separador sutil */}
                      <div className="w-full h-px bg-slate-700/50 my-1"></div>
                      
                      {/* Botones de Acción con Texto */}
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button onClick={() => setCitaDetalle(cita)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider" title="Ver Detalles">
                          <Eye size={14} /> Detalle
                        </button>

                        {tieneWhatsAppActivado && (
                          <button
                            onClick={() => handleEnviarWhatsApp(cita.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider"
                            title="Enviar Recordatorio WhatsApp"
                          >
                            <MessageCircle size={14} /> Recordatorio
                          </button>
                        )}
                        <button onClick={() => handleOpenForm(cita)} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider" title="Editar">
                          <Edit2 size={14} /> Editar
                        </button>
                        {cita.estado !== 'Atendida' && cita.estado !== 'Cancelada' && (
                          <>
                            <button onClick={() => handleCambiarEstado(cita.id, 'Atendida')} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider" title="Atender">
                              <CheckCircle size={14} /> Atender
                            </button>
                            <button onClick={() => handleCambiarEstado(cita.id, 'Cancelada')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider" title="Cancelar">
                              <XCircle size={14} /> Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Calendar size={32} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-semibold">No hay citas agendadas para este día.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/80 rounded-b-2xl">
              <button onClick={() => handleOpenForm(null, selectedDay)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-purple-900/40">
                <Plus size={15} /> Agendar en este día
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==== NUEVO MODAL: DETALLE DE LA CITA ==== */}
      {citaDetalle && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ClipboardList size={20} className="text-purple-400" /> Detalles de la Cita
              </h2>
              <button onClick={() => setCitaDetalle(null)} className="text-slate-400 hover:text-white">
                <XCircle size={22} />
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-cyan-400" />
                  <span className="font-bold text-white">
                    {isClinica ? citaDetalle.paciente_nombre : citaDetalle.cliente_nombre}
                  </span>
                </div>
                {isClinica && (
                  <p className="text-xs text-slate-400 pl-6">Dr. {citaDetalle.medico_nombre}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Fecha</p>
                  <p className="text-white">{new Date(citaDetalle.fecha_hora).toLocaleDateString('es-SV')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Hora</p>
                  <p className="text-white">{new Date(citaDetalle.fecha_hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Duración</p>
                  <p className="text-white">{citaDetalle.duracion_minutos} minutos</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Estado</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase rounded ${ESTADO_CONFIG[citaDetalle.estado]?.badge || DEFAULT_CONFIG.badge}`}>
                    {citaDetalle.estado}
                  </span>
                </div>
              </div>

              {!isClinica && citaDetalle.titulo && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Motivo / Título</p>
                  <p className="text-white bg-slate-800/50 p-2 rounded border border-slate-700/50">{citaDetalle.titulo}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Observaciones</p>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 min-h-[60px]">
                  {citaDetalle.observaciones ? (
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{citaDetalle.observaciones}</p>
                  ) : (
                    <p className="text-slate-500 text-xs italic">Sin observaciones registradas.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 p-2 border-t border-slate-800">
              <button onClick={() => setCitaDetalle(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition text-xs font-bold">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREACIÓN / EDICIÓN */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-black text-white uppercase tracking-wider">{editingCita ? 'Editar Cita' : 'Nueva Cita'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><XCircle size={22} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {isClinica ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paciente *</label>
                    <select name="paciente_id" value={formData.paciente_id} onChange={(e) => setFormData({ ...formData, paciente_id: e.target.value })} required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="">Seleccionar paciente</option>
                      {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos || ''}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Médico *</label>
                    <select name="medico_id" value={formData.medico_id} onChange={(e) => setFormData({ ...formData, medico_id: e.target.value })} required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="">Seleccionar médico</option>
                      {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente *</label>
                    <select name="cliente_id" value={formData.cliente_id} onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })} required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="">Seleccionar cliente</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motivo / Título de la Cita *</label>
                    <input 
                      type="text" 
                      name="titulo" 
                      value={formData.titulo} 
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} 
                      placeholder="Ej: Reunión de ventas" 
                      required 
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha y Hora *</label>
                <input 
                  type="datetime-local" 
                  name="fecha_hora" 
                  value={formData.fecha_hora} 
                  onChange={(e) => setFormData({ ...formData, fecha_hora: e.target.value })} 
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  required 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duración (minutos)</label>
                <input type="number" name="duracion_minutos" value={formData.duracion_minutos} onChange={(e) => setFormData({ ...formData, duracion_minutos: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observaciones</label>
                <textarea name="observaciones" value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} rows={3} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>

              <div className="flex justify-end gap-3 p-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition text-xs font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-900/40">{editingCita ? 'Guardar Cambios' : 'Crear Cita'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })} />
    </div>
  );
};

export default Citas;