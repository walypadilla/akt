// frontend/src/components/forms/clinica/ConsultaForm.jsx
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import {
  Activity, AlertCircle, FileText, Stethoscope, User, Calendar,
  Pill, Heart, Thermometer, Ruler
} from 'lucide-react';

const formatearFechaLocal = (fechaISO) => {
  if (!fechaISO) {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset();
    const local = new Date(ahora.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }
  const d = new Date(fechaISO);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const normalizar = (texto) => {
  if (!texto) return '';
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

const ConsultaForm = ({
  initialData = {},
  tipoOrganizacion = 'Empresa Comercial',
  pacientes = [],
  medicos = [],
  onSubmit,
  onCancel,
  loading,
  isEditing = false,
}) => {
  const tipoNorm = normalizar(tipoOrganizacion);
  const isVeterinaria = tipoNorm === 'clinica veterinaria';
  const isDental = tipoNorm === 'clinica dental';
  const isGeneral = tipoNorm === 'clinica general';

  const [formData, setFormData] = useState({
    paciente_id: initialData.paciente_id || '',
    medico_id: initialData.medico_id || '',
    fecha_consulta: formatearFechaLocal(initialData.fecha_consulta),
    subjetivo: initialData.subjetivo || '',
    objetivo: initialData.objetivo || '',
    analisis: initialData.analisis || '',
    plan: initialData.plan || '',
    presion_arterial: initialData.presion_arterial || '',
    frecuencia_cardiaca: initialData.frecuencia_cardiaca || '',
    temperatura: initialData.temperatura || '',
    peso: initialData.peso || '',
    talla: initialData.talla || '',
    imc: initialData.imc || '',
    diagnostico_codigo: initialData.diagnostico_codigo || '',
    diagnostico_texto: initialData.diagnostico_texto || '',
    receta: initialData.receta || '',
    vacunas_aplicadas: initialData.vacunas_aplicadas || [],
  });

  const [errors, setErrors] = useState({});

  // 🔒 Detectar si la consulta ya tiene factura activa
  const tieneFacturaActiva =
    isEditing &&
    initialData.factura_id &&
    initialData.factura_estado !== 'Anulada';
  const soloRecetaEditable = tieneFacturaActiva;

  // Autocalcular IMC (solo Clínica General)
  useEffect(() => {
    if (isGeneral && formData.peso && formData.talla && parseFloat(formData.talla) > 0) {
      const peso = parseFloat(formData.peso);
      const tallaM = parseFloat(formData.talla) / 100;
      const imc = peso / (tallaM * tallaM);
      if (!isNaN(imc) && isFinite(imc)) {
        setFormData((prev) => ({ ...prev, imc: imc.toFixed(1) }));
      }
    }
  }, [formData.peso, formData.talla, isGeneral]);

  const pacienteOptions = pacientes.map((p) => ({
    value: p.id,
    label: `${p.nombre} ${p.apellidos || ''} - ${p.cliente_nombre || 'Sin dueño'}`,
  }));

  const medicoOptions = medicos.map((m) => ({
    value: m.id,
    label: m.nombre || m.usuario_nombre || 'Médico',
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleSelectChange = (field, option) => {
    if (soloRecetaEditable) return;
    setFormData({ ...formData, [field]: option ? option.value : '' });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!soloRecetaEditable) {
      if (!formData.paciente_id) newErrors.paciente_id = 'Seleccione un paciente';
      if (!formData.medico_id) newErrors.medico_id = 'Seleccione un médico';
      if (!formData.fecha_consulta) newErrors.fecha_consulta = 'Ingrese fecha y hora';
      if (!formData.subjetivo) newErrors.subjetivo = 'El motivo de consulta es obligatorio';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (soloRecetaEditable) {
      onSubmit({ receta: formData.receta });
      return;
    }

    const cleanData = { ...formData };

    if (isGeneral) {
      delete cleanData.vacunas_aplicadas;
    } else if (isDental) {
      delete cleanData.talla;
      delete cleanData.imc;
      delete cleanData.frecuencia_cardiaca;
      delete cleanData.vacunas_aplicadas;
    } else if (isVeterinaria) {
      delete cleanData.presion_arterial;
      delete cleanData.talla;
      delete cleanData.imc;
    }

    onSubmit(cleanData);
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 bg-gray-700 border ${
      errors[field] ? 'border-red-500' : 'border-gray-600'
    } rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`;

  const selectTheme = (theme) => ({
    ...theme,
    colors: {
      ...theme.colors,
      primary: '#8b5cf6',
      primary25: '#4c1d95',
      primary50: '#6d28d9',
      neutral0: '#1f2937',
      neutral5: '#374151',
      neutral10: '#4b5563',
      neutral20: '#6b7280',
      neutral30: '#9ca3af',
      neutral40: '#d1d5db',
      neutral50: '#e5e7eb',
      neutral60: '#f3f4f6',
      neutral70: '#f9fafb',
      neutral80: '#ffffff',
      neutral90: '#ffffff',
    },
  });

  const bloqueado = soloRecetaEditable ? 'opacity-50 pointer-events-none' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* AVISO DE FACTURA (bloqueo) */}
      {soloRecetaEditable && (
        <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-yellow-200 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Esta consulta tiene factura en estado <strong>{initialData.factura_estado}</strong>.
            Solo se permite <strong>agregar o modificar la receta</strong>.
          </span>
        </div>
      )}

      {/* AVISO SOBRE EXÁMENES (solo cuando es nueva o editable) */}
      {!soloRecetaEditable && (
        <div className="p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-amber-200 text-xs flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">
              📋 Recuerda para facturar exámenes de laboratorio
            </p>
            <p>
              Si el paciente requiere exámenes, solicítalos desde{' '}
              <strong>Exámenes → Solicitar Examen</strong> y asígnalos a{' '}
              <strong>esta consulta</strong>. De ese modo, el costo se cargará
              automáticamente al momento de facturar.
            </p>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${bloqueado}`}>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <User size={14} className="text-purple-400" />
            {isVeterinaria ? 'Mascota *' : 'Paciente *'}
          </label>
          <Select
            options={pacienteOptions}
            value={pacienteOptions.find((opt) => opt.value === formData.paciente_id) || null}
            onChange={(opt) => handleSelectChange('paciente_id', opt)}
            placeholder={isVeterinaria ? 'Buscar mascota...' : 'Buscar paciente...'}
            isClearable
            isSearchable
            isDisabled={soloRecetaEditable}
            theme={selectTheme}
          />
          {errors.paciente_id && (
            <p className="text-red-400 text-xs mt-1">{errors.paciente_id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <Stethoscope size={14} className="text-purple-400" />
            Médico *
          </label>
          <Select
            options={medicoOptions}
            value={medicoOptions.find((opt) => opt.value === formData.medico_id) || null}
            onChange={(opt) => handleSelectChange('medico_id', opt)}
            placeholder="Buscar médico tratante..."
            isClearable
            isSearchable
            isDisabled={soloRecetaEditable}
            theme={selectTheme}
          />
          {errors.medico_id && (
            <p className="text-red-400 text-xs mt-1">{errors.medico_id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <Calendar size={14} className="text-purple-400" />
            Fecha y Hora *
          </label>
          <input
            type="datetime-local"
            name="fecha_consulta"
            value={formData.fecha_consulta}
            onChange={handleChange}
            disabled={soloRecetaEditable}
            className={inputClass('fecha_consulta')}
          />
          {errors.fecha_consulta && (
            <p className="text-red-400 text-xs mt-1">{errors.fecha_consulta}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <Activity size={14} className="text-purple-400" />
            Peso (kg) {isVeterinaria ? '*' : ''}
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            name="peso"
            value={formData.peso}
            onChange={handleChange}
            disabled={soloRecetaEditable}
            placeholder={isVeterinaria ? 'Ej: 12.5 (para dosificación)' : 'Ej: 70.5'}
            className={inputClass('peso')}
          />
        </div>
      </div>

      {/* SIGNOS VITALES */}
      <div className={`bg-gray-700/30 p-4 rounded-lg border border-gray-600 ${bloqueado}`}>
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          Signos Vitales
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(isGeneral || isDental) && (
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Heart size={11} /> Presión Arterial
              </label>
              <input
                type="text"
                name="presion_arterial"
                value={formData.presion_arterial}
                onChange={handleChange}
                disabled={soloRecetaEditable}
                placeholder="120/80"
                className={inputClass('presion_arterial')}
              />
            </div>
          )}

          {(isGeneral || isVeterinaria) && (
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Heart size={11} /> FC (lpm)
              </label>
              <input
                type="number"
                name="frecuencia_cardiaca"
                value={formData.frecuencia_cardiaca}
                onChange={handleChange}
                disabled={soloRecetaEditable}
                placeholder={isVeterinaria ? 'Ej: 120' : 'Ej: 72'}
                className={inputClass('frecuencia_cardiaca')}
              />
            </div>
          )}

          {(isGeneral || isVeterinaria) && (
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Thermometer size={11} /> Temperatura (°C)
              </label>
              <input
                type="number"
                step="0.1"
                name="temperatura"
                value={formData.temperatura}
                onChange={handleChange}
                disabled={soloRecetaEditable}
                placeholder={isVeterinaria ? 'Ej: 38.5' : 'Ej: 36.8'}
                className={inputClass('temperatura')}
              />
            </div>
          )}

          {isGeneral && (
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Ruler size={11} /> Talla (cm)
              </label>
              <input
                type="number"
                step="0.1"
                name="talla"
                value={formData.talla}
                onChange={handleChange}
                disabled={soloRecetaEditable}
                placeholder="Ej: 175"
                className={inputClass('talla')}
              />
            </div>
          )}
        </div>

        {isGeneral && formData.imc && (
          <div className="mt-2 text-sm">
            <span className="text-gray-400">IMC calculado: </span>
            <span className="text-purple-400 font-bold">{formData.imc}</span>
          </div>
        )}
      </div>

      {/* SOAP */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${bloqueado}`}>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            S (Subjetivo) <span className="text-red-400">*</span>
          </label>
          <textarea
            name="subjetivo"
            value={formData.subjetivo}
            onChange={handleChange}
            rows={3}
            disabled={soloRecetaEditable}
            placeholder={
              isVeterinaria
                ? 'Anamnesis del dueño: cambios de conducta, apetito, vómito, diarrea...'
                : isDental
                ? 'Dolor (localización, intensidad), molestias al masticar, motivo estético...'
                : 'Motivo de consulta, síntomas referidos por el paciente...'
            }
            className={inputClass('subjetivo')}
          />
          {errors.subjetivo && (
            <p className="text-red-400 text-xs mt-1">{errors.subjetivo}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            O (Objetivo)
          </label>
          <textarea
            name="objetivo"
            value={formData.objetivo}
            onChange={handleChange}
            rows={3}
            disabled={soloRecetaEditable}
            placeholder={
              isVeterinaria
                ? 'Examen físico: mucosas, palpación abdominal, reflejos, pelaje...'
                : isDental
                ? 'Hallazgos intraorales: caries, estado de encías, sarro...'
                : 'Hallazgos del examen físico: auscultación, palpación...'
            }
            className={inputClass('objetivo')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            A (Análisis)
          </label>
          <textarea
            name="analisis"
            value={formData.analisis}
            onChange={handleChange}
            rows={3}
            disabled={soloRecetaEditable}
            placeholder={
              isDental
                ? 'Diagnóstico odontológico: Caries 3er grado, Gingivitis...'
                : isVeterinaria
                ? 'Diagnóstico o presunción diagnóstica veterinaria...'
                : 'Evaluación médica global, impresión diagnóstica...'
            }
            className={inputClass('analisis')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            P (Plan)
          </label>
          <textarea
            name="plan"
            value={formData.plan}
            onChange={handleChange}
            rows={3}
            disabled={soloRecetaEditable}
            placeholder={
              isDental
                ? 'Procedimiento: Limpieza, Calza, Endodoncia, Extracción...'
                : isVeterinaria
                ? 'Tratamiento, dosis, indicaciones preventivas, desparasitación...'
                : 'Tratamiento indicado, estudios solicitados, seguimiento...'
            }
            className={inputClass('plan')}
          />
        </div>
      </div>

      {/* DIAGNÓSTICO */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${bloqueado}`}>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Diagnóstico (Texto)
          </label>
          <input
            type="text"
            name="diagnostico_texto"
            value={formData.diagnostico_texto}
            onChange={handleChange}
            disabled={soloRecetaEditable}
            placeholder={
              isDental
                ? 'Ej: Infección en la muela del juicio'
                : isVeterinaria
                ? 'Ej: Gastroenteritis aguda'
                : 'Ej: Infección respiratoria aguda'
            }
            className={inputClass('diagnostico_texto')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Código CIE-10
          </label>
          <input
            type="text"
            name="diagnostico_codigo"
            value={formData.diagnostico_codigo}
            onChange={handleChange}
            disabled={soloRecetaEditable}
            placeholder={
              isDental
                ? 'Ej: K04.7 (Absceso periapical)'
                : isVeterinaria
                ? 'Ej: A09 (Diarrea)'
                : 'Ej: J06.9 (IRA)'
            }
            className={inputClass('diagnostico_codigo')}
          />
        </div>
      </div>

      {/* RECETA - SIEMPRE EDITABLE */}
      <div className={soloRecetaEditable ? 'border-t-2 border-purple-500/40 p-2' : ''}>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
          <Pill size={14} className="text-purple-400" />
          Receta / Indicaciones
          {soloRecetaEditable && (
            <span className="text-xs text-yellow-400 font-bold">(editable)</span>
          )}
        </label>
        <textarea
          name="receta"
          value={formData.receta}
          onChange={handleChange}
          rows={5}
          placeholder={
            isDental
              ? 'Ej:\n1. Amoxicilina 500mg — 1 cápsula cada 8h por 7 días\n2. Ibuprofeno 400mg — 1 tableta cada 6h si hay dolor\n3. Enjuague con clorhexidina 0.12% — 2 veces al día'
              : isVeterinaria
              ? 'Ej:\n1. Meloxicam 0.1mg/kg — vía oral cada 24h por 3 días\n2. Metronidazol 10mg/kg — cada 12h por 5 días\n3. Dieta blanda + hidratación'
              : 'Ej:\n1. Paracetamol 500mg — 1 tableta cada 8h si hay fiebre\n2. Reposo e hidratación abundante\n3. Control en 7 días'
          }
          className={`w-full px-3 py-2 bg-gray-700 border ${
            soloRecetaEditable ? 'border-purple-500/50' : 'border-gray-600'
          } rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`}
        />
      </div>

      {isVeterinaria && (
        <div className="border-t border-gray-700 p-2">
          <p className="text-sm text-gray-400 mb-2">
            💉 Para registrar vacunas, ve a la pestaña <strong>Vacunas</strong> en el
            expediente del paciente.
          </p>
        </div>
      )}

      {isDental && (
        <div className="border-t border-gray-700 p-2">
          <p className="text-sm text-gray-400 mb-2">
            🦷 Para registrar el odontograma, ve a la pestaña{' '}
            <strong>Odontograma</strong> en el expediente del paciente.
          </p>
        </div>
      )}

      {/* BOTONES */}
      <div className="flex justify-end gap-3 p-2 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 shadow-md shadow-purple-900/30"
        >
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar Consulta'}
        </button>
      </div>
    </form>
  );
};

export default ConsultaForm;