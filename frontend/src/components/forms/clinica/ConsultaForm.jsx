// frontend/src/forms/clinica/ConsultaForm.jsx
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Calendar, Clock, User, Activity, Heart, Thermometer, Ruler, Weight } from 'lucide-react';

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
  const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };
  const tipoNorm = normalizarTexto(tipoOrganizacion);
  const isVeterinaria = tipoNorm === 'clinica veterinaria';
  const isDental = tipoNorm === 'clinica dental';
  const isGeneral = tipoNorm === 'clinica general';

  const [formData, setFormData] = useState({
    paciente_id: initialData.paciente_id || '',
    medico_id: initialData.medico_id || '',
    fecha_consulta: initialData.fecha_consulta || new Date().toISOString().slice(0, 16),
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
    // Campos específicos
    vacunas_aplicadas: initialData.vacunas_aplicadas || [],
    // Odontograma se maneja aparte
  });

  const [errors, setErrors] = useState({});
  const [imcCalculado, setImcCalculado] = useState(false);

  // Calcular IMC automáticamente
  useEffect(() => {
    if (formData.peso && formData.talla && formData.talla > 0) {
      const peso = parseFloat(formData.peso);
      const talla = parseFloat(formData.talla) / 100; // convertir a metros
      const imc = peso / (talla * talla);
      if (!isNaN(imc) && isFinite(imc)) {
        setFormData(prev => ({ ...prev, imc: imc.toFixed(1) }));
        setImcCalculado(true);
      }
    } else {
      if (formData.imc && !imcCalculado) {
        // No hacer nada, mantener el IMC existente
      }
    }
  }, [formData.peso, formData.talla]);

  // Opciones para selects
  const pacienteOptions = pacientes.map(p => ({
    value: p.id,
    label: `${p.nombre} ${p.apellidos || ''} - ${p.cliente_nombre || 'Sin dueño'}`,
  }));

  const medicoOptions = medicos.map(m => ({
    value: m.id,
    label: m.nombre || m.usuario_nombre || 'Médico',
  }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: val });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleSelectChange = (field, option) => {
    setFormData({ ...formData, [field]: option ? option.value : '' });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.paciente_id) newErrors.paciente_id = 'Seleccione un paciente';
    if (!formData.medico_id) newErrors.medico_id = 'Seleccione un médico';
    if (!formData.fecha_consulta) newErrors.fecha_consulta = 'Ingrese fecha y hora';
    if (!formData.subjetivo) newErrors.subjetivo = 'El motivo de consulta es obligatorio';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Paciente y Médico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Paciente *</label>
          <Select
            options={pacienteOptions}
            value={pacienteOptions.find(opt => opt.value === formData.paciente_id) || null}
            onChange={(opt) => handleSelectChange('paciente_id', opt)}
            placeholder="Buscar paciente..."
            isClearable
            isSearchable
            className="react-select-container"
            classNamePrefix="react-select"
            theme={(theme) => ({
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
            })}
          />
          {errors.paciente_id && <p className="text-red-400 text-xs mt-1">{errors.paciente_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Médico *</label>
          <Select
            options={medicoOptions}
            value={medicoOptions.find(opt => opt.value === formData.medico_id) || null}
            onChange={(opt) => handleSelectChange('medico_id', opt)}
            placeholder="Buscar médico..."
            isClearable
            isSearchable
            className="react-select-container"
            classNamePrefix="react-select"
            theme={(theme) => ({
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
            })}
          />
          {errors.medico_id && <p className="text-red-400 text-xs mt-1">{errors.medico_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Fecha y Hora *</label>
          <input
            type="datetime-local"
            name="fecha_consulta"
            value={formData.fecha_consulta}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.fecha_consulta ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.fecha_consulta && <p className="text-red-400 text-xs mt-1">{errors.fecha_consulta}</p>}
        </div>
      </div>

      {/* Signos Vitales */}
      <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          Signos Vitales
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-400">Presión Arterial</label>
            <input
              type="text"
              name="presion_arterial"
              value={formData.presion_arterial}
              onChange={handleChange}
              placeholder="120/80"
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">FC (lpm)</label>
            <input
              type="number"
              name="frecuencia_cardiaca"
              value={formData.frecuencia_cardiaca}
              onChange={handleChange}
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Temperatura (°C)</label>
            <input
              type="number"
              step="0.1"
              name="temperatura"
              value={formData.temperatura}
              onChange={handleChange}
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              name="peso"
              value={formData.peso}
              onChange={handleChange}
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Talla (cm)</label>
            <input
              type="number"
              step="0.1"
              name="talla"
              value={formData.talla}
              onChange={handleChange}
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        {formData.imc && (
          <div className="mt-2 text-sm">
            <span className="text-gray-400">IMC calculado: </span>
            <span className="text-purple-400 font-bold">{formData.imc}</span>
          </div>
        )}
      </div>

      {/* SOAP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            S (Subjetivo) <span className="text-red-400">*</span>
          </label>
          <textarea
            name="subjetivo"
            value={formData.subjetivo}
            onChange={handleChange}
            rows={3}
            placeholder="Motivo de consulta, síntomas del paciente..."
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.subjetivo ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.subjetivo && <p className="text-red-400 text-xs mt-1">{errors.subjetivo}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">O (Objetivo)</label>
          <textarea
            name="objetivo"
            value={formData.objetivo}
            onChange={handleChange}
            rows={3}
            placeholder="Hallazgos del examen físico..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">A (Análisis)</label>
          <textarea
            name="analisis"
            value={formData.analisis}
            onChange={handleChange}
            rows={3}
            placeholder="Diagnóstico o impresión clínica..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">P (Plan)</label>
          <textarea
            name="plan"
            value={formData.plan}
            onChange={handleChange}
            rows={3}
            placeholder="Tratamiento, indicaciones, exámenes solicitados..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Diagnóstico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Diagnóstico (Texto)</label>
          <input
            type="text"
            name="diagnostico_texto"
            value={formData.diagnostico_texto}
            onChange={handleChange}
            placeholder="Ej. Infección respiratoria aguda"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Código CIE-10</label>
          <input
            type="text"
            name="diagnostico_codigo"
            value={formData.diagnostico_codigo}
            onChange={handleChange}
            placeholder="Ej. J06.9"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Receta */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Receta / Indicaciones</label>
        <textarea
          name="receta"
          value={formData.receta}
          onChange={handleChange}
          rows={4}
          placeholder="Medicamentos, dosis, indicaciones para el paciente..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Campos específicos según tipo de clínica */}
      {isDental && (
        <div className="border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400 mb-2">
            🦷 Para registrar el odontograma, ve a la pestaña correspondiente en el expediente del paciente.
          </p>
        </div>
      )}

      {isVeterinaria && (
        <div className="border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400 mb-2">
            💉 Para registrar vacunas, ve a la pestaña de vacunas en el expediente del paciente.
          </p>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
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
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar Consulta'}
        </button>
      </div>
    </form>
  );
};

export default ConsultaForm;