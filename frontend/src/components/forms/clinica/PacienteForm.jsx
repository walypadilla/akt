// frontend/src/components/forms/clinica/PacienteForm.jsx
import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const normalizar = (texto) => {
  if (!texto) return '';
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

const generarCodigoExpediente = (nombre, apellidos) => {
  const hoy = new Date();
  const fecha = hoy.getFullYear() +
    String(hoy.getMonth() + 1).padStart(2, '0') +
    String(hoy.getDate()).padStart(2, '0');
  const iniciales = (nombre?.charAt(0) || 'X') + (apellidos?.charAt(0) || 'X');
  const random = String(Math.floor(Math.random() * 900) + 100);
  return `EXP-${fecha}-${iniciales}-${random}`;
};

const PacienteForm = ({
  initialData = {},
  tipoOrganizacion = 'Empresa Comercial',
  clientes = [],
  onSubmit,
  onCancel,
  loading,
  isEditing = false,
}) => {
  const tipoNorm = normalizar(tipoOrganizacion);
  const isVeterinaria = tipoNorm === 'clinica veterinaria';
  const isDental = tipoNorm === 'clinica dental';
  const isGeneral = tipoNorm === 'clinica general';
  const isHumano = isGeneral || isDental;

  // tipo_paciente auto-asignado
  const tipoPacienteAuto = isVeterinaria ? 'Mascota' : 'Humano';

  const getInitialState = () => ({
    cliente_id: initialData.cliente_id || '',
    tipo_paciente: initialData.tipo_paciente || tipoPacienteAuto,
    codigo_expediente: initialData.codigo_expediente || '',
    // Comunes
    nombre: initialData.nombre || '',
    fecha_nacimiento: initialData.fecha_nacimiento || '',
    peso: initialData.peso || '',
    alergias: initialData.alergias || '',
    antecedentes: initialData.antecedentes || '',
    // Humanos
    apellidos: initialData.apellidos || '',
    genero: initialData.genero || 'M',
    dui: initialData.dui || '',
    telefono: initialData.telefono || '',
    correo: initialData.correo || '',
    ocupacion: initialData.ocupacion || '',
    grupo_sanguineo: initialData.grupo_sanguineo || '',
    enfermedades_cronicas: initialData.enfermedades_cronicas || '',
    contacto_emergencia: initialData.contacto_emergencia || '',
    // Dental
    tipo_denticion: initialData.tipo_denticion || '',
    habitos_bucales: initialData.habitos_bucales || '',
    ortodoncia_previa: initialData.ortodoncia_previa !== undefined ? initialData.ortodoncia_previa : undefined,
    ultima_visita_dentista: initialData.ultima_visita_dentista || '',
    sensibilidad_dental: initialData.sensibilidad_dental || '',
    // Veterinaria
    especie: initialData.especie || '',
    raza: initialData.raza || '',
    color: initialData.color || '',
    chip: initialData.chip || '',
    estado_reproductivo: initialData.estado_reproductivo || '',
    tipo_alimentacion: initialData.tipo_alimentacion || '',
    habitat: initialData.habitat || '',
    senas_particulares: initialData.senas_particulares || '',
  });

  const [formData, setFormData] = useState(getInitialState());
  const [errors, setErrors] = useState({});
  const [copiarCliente, setCopiarCliente] = useState(false);

  const clienteOptions = clientes.map((c) => ({
    value: c.id,
    label: `${c.nombre} ${c.apellidos || ''} - ${c.nit || c.dui || 'Sin documento'}`,
    ...c,
  }));

  const clienteSeleccionado = clientes.find((c) => c.id === formData.cliente_id);

  // Generar código de expediente automático
  useEffect(() => {
    if (!isEditing && !formData.codigo_expediente && formData.nombre) {
      setFormData((prev) => ({
        ...prev,
        codigo_expediente: generarCodigoExpediente(formData.nombre, formData.apellidos),
      }));
    }
  }, [formData.nombre, formData.apellidos, isEditing]);

  // Copiar datos del cliente (solo humanos)
  useEffect(() => {
    if (copiarCliente && clienteSeleccionado && isHumano) {
      setFormData((prev) => ({
        ...prev,
        nombre: clienteSeleccionado.nombre || '',
        apellidos: clienteSeleccionado.apellidos || '',
        dui: clienteSeleccionado.dui || '',
        telefono: clienteSeleccionado.telefono
          ? clienteSeleccionado.telefono.replace(/^\+503/, '')
          : '',
        correo: clienteSeleccionado.correo || '',
      }));
    }
  }, [copiarCliente, clienteSeleccionado, isHumano]);

  const handleClienteChange = (option) => {
    setFormData({ ...formData, cliente_id: option ? option.value : '' });
    if (copiarCliente) setCopiarCliente(false);
    if (errors.cliente_id) setErrors({ ...errors, cliente_id: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.cliente_id) newErrors.cliente_id = 'Seleccione un cliente';
    if (!formData.nombre) newErrors.nombre = 'El nombre es obligatorio';
    if (isHumano && !formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es obligatoria';
    }
    if (formData.fecha_nacimiento) {
      const fecha = new Date(formData.fecha_nacimiento);
      if (fecha > new Date()) newErrors.fecha_nacimiento = 'La fecha no puede ser futura';
    }
    if (formData.peso && parseFloat(formData.peso) <= 0) {
      newErrors.peso = 'El peso debe ser mayor a 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Limpiar campos no aplicables
    const cleanData = { ...formData, tipo_paciente: tipoPacienteAuto };

    if (isVeterinaria) {
      delete cleanData.apellidos;
      delete cleanData.dui;
      delete cleanData.telefono;
      delete cleanData.correo;
      delete cleanData.ocupacion;
      delete cleanData.grupo_sanguineo;
      delete cleanData.enfermedades_cronicas;
      delete cleanData.contacto_emergencia;
      delete cleanData.tipo_denticion;
      delete cleanData.habitos_bucales;
      delete cleanData.ortodoncia_previa;
      delete cleanData.ultima_visita_dentista;
      delete cleanData.sensibilidad_dental;
    } else if (isGeneral) {
      delete cleanData.especie;
      delete cleanData.raza;
      delete cleanData.color;
      delete cleanData.chip;
      delete cleanData.estado_reproductivo;
      delete cleanData.tipo_alimentacion;
      delete cleanData.habitat;
      delete cleanData.senas_particulares;
      delete cleanData.tipo_denticion;
      delete cleanData.habitos_bucales;
      delete cleanData.ortodoncia_previa;
      delete cleanData.ultima_visita_dentista;
      delete cleanData.sensibilidad_dental;
    } else if (isDental) {
      delete cleanData.especie;
      delete cleanData.raza;
      delete cleanData.color;
      delete cleanData.chip;
      delete cleanData.estado_reproductivo;
      delete cleanData.tipo_alimentacion;
      delete cleanData.habitat;
      delete cleanData.senas_particulares;
      delete cleanData.grupo_sanguineo;
    }

    onSubmit(cleanData);
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 bg-gray-700 border ${
      errors[field] ? 'border-red-500' : 'border-gray-600'
    } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`;

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ============ BLOQUE COMÚN ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {isVeterinaria ? 'Dueño / Tutor *' : 'Cliente / Responsable *'}
          </label>
          <Select
            options={clienteOptions}
            value={clienteOptions.find((opt) => opt.value === formData.cliente_id) || null}
            onChange={handleClienteChange}
            placeholder="Buscar cliente..."
            isClearable
            isSearchable
            theme={selectTheme}
            className="react-select-container"
            classNamePrefix="react-select"
          />
          {errors.cliente_id && <p className="text-red-400 text-xs mt-1">{errors.cliente_id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Código de Expediente</label>
          <input
            type="text"
            name="codigo_expediente"
            value={formData.codigo_expediente}
            onChange={handleChange}
            placeholder="EXP-YYYYMMDD-XX-NNN"
            className={inputClass('codigo_expediente')}
          />
          <p className="text-xs text-gray-400 mt-1">Se genera automáticamente</p>
        </div>

        {isHumano && (
          <div className="md:col-span-2 flex items-center gap-3 bg-gray-700/30 p-3 rounded-lg border border-gray-600">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={copiarCliente}
                onChange={(e) => setCopiarCliente(e.target.checked)}
                disabled={!formData.cliente_id}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
              />
              El paciente es el cliente (copiar datos)
            </label>
            {copiarCliente && formData.cliente_id && (
              <span className="text-xs text-emerald-400">✅ Datos copiados del cliente</span>
            )}
          </div>
        )}
      </div>

      {/* ============ BLOQUE HUMANO (General + Dental) ============ */}
      {isHumano && (
        <div className="border-t border-gray-700 p-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Datos del Paciente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={inputClass('nombre')}
              />
              {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Apellidos</label>
              <input
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                className={inputClass('apellidos')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">DUI / Pasaporte</label>
              <input
                type="text"
                name="dui"
                value={formData.dui}
                onChange={handleChange}
                placeholder="00000000-0"
                className={inputClass('dui')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de Nacimiento *</label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                className={inputClass('fecha_nacimiento')}
              />
              {errors.fecha_nacimiento && <p className="text-red-400 text-xs mt-1">{errors.fecha_nacimiento}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sexo</label>
              <select name="genero" value={formData.genero} onChange={handleChange} className={inputClass('genero')}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className={inputClass('telefono')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
              <input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                className={inputClass('correo')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ocupación</label>
              <input
                type="text"
                name="ocupacion"
                value={formData.ocupacion}
                onChange={handleChange}
                className={inputClass('ocupacion')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="peso"
                value={formData.peso}
                onChange={handleChange}
                className={inputClass('peso')}
              />
              {errors.peso && <p className="text-red-400 text-xs mt-1">{errors.peso}</p>}
            </div>
            {isGeneral && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Grupo Sanguíneo</label>
                <select
                  name="grupo_sanguineo"
                  value={formData.grupo_sanguineo}
                  onChange={handleChange}
                  className={inputClass('grupo_sanguineo')}
                >
                  <option value="">Seleccionar</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contacto de Emergencia (Nombre y Teléfono)
              </label>
              <input
                type="text"
                name="contacto_emergencia"
                value={formData.contacto_emergencia}
                onChange={handleChange}
                placeholder="Ej. María Pérez - 7890-1234"
                className={inputClass('contacto_emergencia')}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ BLOQUE DENTAL ============ */}
      {isDental && (
        <div className="border-t border-gray-700 p-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Datos Odontológicos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Dentición</label>
              <select
                name="tipo_denticion"
                value={formData.tipo_denticion}
                onChange={handleChange}
                className={inputClass('tipo_denticion')}
              >
                <option value="">Seleccionar</option>
                <option value="Adulto">Adulto</option>
                <option value="Decidua">Decidua (de leche)</option>
                <option value="Mixta">Mixta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Hábitos Bucales</label>
              <input
                type="text"
                name="habitos_bucales"
                value={formData.habitos_bucales}
                onChange={handleChange}
                placeholder="Bruxismo, Fumador, Morder objetos..."
                className={inputClass('habitos_bucales')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">¿Ortodoncia / Prótesis previa?</label>
              <select
                name="ortodoncia_previa"
                value={
                  formData.ortodoncia_previa !== undefined
                    ? formData.ortodoncia_previa
                      ? 'true'
                      : 'false'
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : e.target.value === 'true';
                  setFormData({ ...formData, ortodoncia_previa: val });
                }}
                className={inputClass('ortodoncia_previa')}
              >
                <option value="">No especificado</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Última Visita al Dentista</label>
              <input
                type="date"
                name="ultima_visita_dentista"
                value={formData.ultima_visita_dentista}
                onChange={handleChange}
                className={inputClass('ultima_visita_dentista')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sensibilidad Dental</label>
              <select
                name="sensibilidad_dental"
                value={formData.sensibilidad_dental}
                onChange={handleChange}
                className={inputClass('sensibilidad_dental')}
              >
                <option value="">Ninguna</option>
                <option value="Frío">Frío</option>
                <option value="Caliente">Caliente</option>
                <option value="Dulce">Dulce</option>
                <option value="Frío y Caliente">Frío y Caliente</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ============ BLOQUE VETERINARIA ============ */}
      {isVeterinaria && (
        <div className="border-t border-gray-700 p-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Datos de la Mascota</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={inputClass('nombre')}
              />
              {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Especie</label>
              <select name="especie" value={formData.especie} onChange={handleChange} className={inputClass('especie')}>
                <option value="">Seleccionar</option>
                <option value="Canino">Canino</option>
                <option value="Felino">Felino</option>
                <option value="Ave">Ave</option>
                <option value="Roedor">Roedor</option>
                <option value="Reptil">Reptil</option>
                <option value="Equino">Equino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Raza</label>
              <input type="text" name="raza" value={formData.raza} onChange={handleChange} className={inputClass('raza')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sexo</label>
              <select name="genero" value={formData.genero} onChange={handleChange} className={inputClass('genero')}>
                <option value="M">Macho</option>
                <option value="F">Hembra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de Nacimiento</label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                className={inputClass('fecha_nacimiento')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Estado Reproductivo</label>
              <select
                name="estado_reproductivo"
                value={formData.estado_reproductivo}
                onChange={handleChange}
                className={inputClass('estado_reproductivo')}
              >
                <option value="">Seleccionar</option>
                <option value="Castrado">Castrado</option>
                <option value="Entero">Entero</option>
                <option value="Gestante">Gestante</option>
                <option value="Lactante">Lactante</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Color / Pelaje</label>
              <input type="text" name="color" value={formData.color} onChange={handleChange} className={inputClass('color')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Chip / Tatuaje</label>
              <input type="text" name="chip" value={formData.chip} onChange={handleChange} className={inputClass('chip')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Peso (kg) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="peso"
                value={formData.peso}
                onChange={handleChange}
                className={inputClass('peso')}
              />
              {errors.peso && <p className="text-red-400 text-xs mt-1">{errors.peso}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Alimentación</label>
              <select
                name="tipo_alimentacion"
                value={formData.tipo_alimentacion}
                onChange={handleChange}
                className={inputClass('tipo_alimentacion')}
              >
                <option value="">Seleccionar</option>
                <option value="Concentrado/Croquetas">Concentrado/Croquetas</option>
                <option value="Barf/Natural">Barf/Natural</option>
                <option value="Mixta">Mixta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Hábitat / Estilo de Vida</label>
              <select name="habitat" value={formData.habitat} onChange={handleChange} className={inputClass('habitat')}>
                <option value="">Seleccionar</option>
                <option value="Interior/Casa">Interior/Casa</option>
                <option value="Exterior/Patio">Exterior/Patio</option>
                <option value="Finca">Finca</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Señas Particulares</label>
              <textarea
                name="senas_particulares"
                value={formData.senas_particulares}
                onChange={handleChange}
                rows={2}
                className={inputClass('senas_particulares')}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ CAMPOS COMUNES FINALES (Alergias, Antecedentes) ============ */}
      <div className="border-t border-gray-700 p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Alergias Conocidas</label>
            <textarea
              name="alergias"
              value={formData.alergias}
              onChange={handleChange}
              rows={3}
              placeholder={
                isVeterinaria
                  ? 'Alergias alimentarias, medicamentos...'
                  : isDental
                  ? 'Alergias a anestésicos, penicilina, látex...'
                  : 'Medicamentos, alimentos, látex...'
              }
              className={inputClass('alergias')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Antecedentes / Observaciones</label>
            <textarea
              name="antecedentes"
              value={formData.antecedentes}
              onChange={handleChange}
              rows={3}
              placeholder="Antecedentes relevantes..."
              className={inputClass('antecedentes')}
            />
          </div>
        </div>
      </div>

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
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default PacienteForm;