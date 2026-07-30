// frontend/src/components/forms/ClientForm.jsx
import React, { useState, useEffect } from 'react';
import { getMunicipios } from '../../api/catalogos';

const ClientForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading,
  departamentos = [],
  actividades = [],
}) => {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    dui: initialData.dui || '',
    nit: initialData.nit || '',
    nrc: initialData.nrc || '',
    giro: initialData.giro || '',
    tipo_contribuyente: initialData.tipo_contribuyente || 'Pequeño',
    direccion: initialData.direccion || '',
    correo: initialData.correo || '',
    telefono: initialData.telefono ? initialData.telefono.replace(/^\+503/, '') : '',
    telefono_whatsapp: initialData.telefono_whatsapp ? initialData.telefono_whatsapp.replace(/^\+503/, '') : '',
    id_departamento: initialData.id_departamento || '',
    id_municipio: initialData.id_municipio || '',
    direccion_linea: initialData.direccion_linea || '',
    tipo_facturacion: initialData.tipo_facturacion || 'contribuyente',
  });

  const [municipios, setMunicipios] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  const esConsumidor = formData.tipo_facturacion === 'consumidor';

  useEffect(() => {
    const loadMunicipios = async () => {
      if (formData.id_departamento) {
        setLoadingMunicipios(true);
        try {
          const munis = await getMunicipios(formData.id_departamento);
          setMunicipios(munis || []);
        } catch (error) {
          console.error('Error cargando municipios:', error);
        } finally {
          setLoadingMunicipios(false);
        }
      } else {
        setMunicipios([]);
      }
    };
    loadMunicipios();
  }, [formData.id_departamento]);

  // Al cambiar tipo de facturación, limpiar campos que se ocultan
  useEffect(() => {
    if (esConsumidor) {
      setFormData(prev => ({
        ...prev,
        nrc: '',
        giro: '',
        tipo_contribuyente: 'Exento',
      }));
    }
  }, [formData.tipo_facturacion]);

  // ============================================================
  // FUNCIONES DE FORMATEO (idénticas a ProveedorForm)
  // ============================================================

  const formatDocument = (value, tipo) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (tipo === 'DUI') {
      if (clean.length <= 9) {
        if (clean.length > 8) {
          return clean.slice(0, 8) + '-' + clean.slice(8);
        }
        return clean;
      }
      return clean.slice(0, 9);
    } else if (tipo === 'NIT') {
      if (clean.length <= 14) {
        if (clean.length > 4 && clean.length <= 10) {
          return clean.slice(0, 4) + '-' + clean.slice(4);
        } else if (clean.length > 10 && clean.length <= 13) {
          return clean.slice(0, 4) + '-' + clean.slice(4, 10) + '-' + clean.slice(10);
        } else if (clean.length > 13) {
          return clean.slice(0, 4) + '-' + clean.slice(4, 10) + '-' + clean.slice(10, 13) + '-' + clean.slice(13);
        }
        return clean;
      }
      return clean.slice(0, 14);
    }
    return value;
  };

  const handleDocumentChange = (e, tipo) => {
    const raw = e.target.value;
    const clean = raw.replace(/[^0-9]/g, '');
    const maxLen = tipo === 'DUI' ? 9 : 14;
    const truncated = clean.slice(0, maxLen);
    const formatted = formatDocument(truncated, tipo);
    setFormData({ ...formData, [tipo === 'DUI' ? 'dui' : 'nit']: formatted });
    if (errors.dui || errors.nit) setErrors({ ...errors, dui: '', nit: '' });
  };

  const handleNrcChange = (e) => {
    const raw = e.target.value;
    const clean = raw.replace(/[^0-9]/g, '');
    const truncated = clean.slice(0, 8);
    const formatted = truncated.length > 0 ? truncated.slice(0, -1) + '-' + truncated.slice(-1) : '';
    setFormData({ ...formData, nrc: formatted });
    if (errors.nrc) setErrors({ ...errors, nrc: '' });
  };

  // ============================================================
  // VALIDACIONES
  // ============================================================

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';

    const duiClean = formData.dui.replace(/[^0-9]/g, '');
    const nitClean = formData.nit.replace(/[^0-9]/g, '');

    if (!duiClean && !nitClean) {
      newErrors.dui = 'Debe proporcionar al menos DUI o NIT';
    }

    if (formData.dui && duiClean.length !== 9) {
      newErrors.dui = 'El DUI debe tener 9 dígitos (formato 00000000-0)';
    }

    if (formData.nit && nitClean.length !== 9 && nitClean.length !== 14) {
      newErrors.nit = 'El NIT debe tener 9 dígitos (persona natural) o 14 dígitos (jurídica)';
    }

    // ✅ NRC solo obligatorio si NO es consumidor Y NIT tiene 14 dígitos
    if (!esConsumidor && nitClean.length === 14) {
      const nrcClean = formData.nrc.replace(/[^0-9]/g, '');
      if (!nrcClean) {
        newErrors.nrc = 'El NRC es obligatorio para personas jurídicas (NIT de 14 dígitos)';
      } else if (nrcClean.length < 4 || nrcClean.length > 8) {
        newErrors.nrc = 'El NRC debe tener entre 4 y 8 dígitos';
      }
    }

    if (!esConsumidor) {
      if (!formData.giro) newErrors.giro = 'Seleccione un giro para contribuyentes';
      if (!formData.tipo_contribuyente) newErrors.tipo_contribuyente = 'Seleccione tipo de contribuyente';
    }

    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = 'Correo inválido';
    }

    if (!formData.id_departamento) newErrors.id_departamento = 'Seleccione departamento';
    if (!formData.id_municipio) newErrors.id_municipio = 'Seleccione municipio';
    if (!formData.direccion_linea.trim()) newErrors.direccion_linea = 'La dirección es obligatoria';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: val });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleTelefonoChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('503')) val = val.substring(3);
    if (val.length > 8) val = val.substring(0, 8);
    setFormData({ ...formData, telefono: val });
  };

  const handleWhatsappChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('503')) val = val.substring(3);
    if (val.length > 8) val = val.substring(0, 8);
    setFormData({ ...formData, telefono_whatsapp: val });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const cleanData = {
        ...formData,
        dui: formData.dui ? formData.dui.replace(/[^0-9]/g, '') : '',
        nit: formData.nit ? formData.nit.replace(/[^0-9]/g, '') : '',
        nrc: formData.nrc ? formData.nrc.replace(/[^0-9]/g, '') : '',
        telefono: formData.telefono ? `+503${formData.telefono}` : '',
        telefono_whatsapp: formData.telefono_whatsapp ? `+503${formData.telefono_whatsapp}` : '',
      };
      onSubmit(cleanData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selector de tipo de facturación */}
      <div className="bg-gray-700/40 p-3 rounded-lg border border-gray-600">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tipo de Facturación Frecuente
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="tipo_facturacion"
              value="consumidor"
              checked={formData.tipo_facturacion === 'consumidor'}
              onChange={handleChange}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            Consumidor Final
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="tipo_facturacion"
              value="contribuyente"
              checked={formData.tipo_facturacion === 'contribuyente'}
              onChange={handleChange}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            Contribuyente (Crédito Fiscal)
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {esConsumidor
            ? 'Solo se requerirán datos básicos (nombre, DUI/NIT opcional).'
            : 'Se requerirán todos los datos para facturación con crédito fiscal (NIT, NRC, giro, dirección completa).'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.nombre ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">DUI</label>
          <input
            type="text"
            name="dui"
            value={formData.dui}
            onChange={(e) => handleDocumentChange(e, 'DUI')}
            placeholder="00000000-0"
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.dui ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.dui && <p className="text-red-400 text-xs mt-1">{errors.dui}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">NIT</label>
          <input
            type="text"
            name="nit"
            value={formData.nit}
            onChange={(e) => handleDocumentChange(e, 'NIT')}
            placeholder="0000-000000-000-0"
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.nit ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.nit && <p className="text-red-400 text-xs mt-1">{errors.nit}</p>}
        </div>

        {/* NRC - solo visible si no es consumidor */}
        {!esConsumidor && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">NRC (obligatorio para jurídica)</label>
            <input
              type="text"
              name="nrc"
              value={formData.nrc}
              onChange={handleNrcChange}
              placeholder="XXXXX-X"
              className={`w-full px-3 py-2 bg-gray-700 border ${errors.nrc ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
            {errors.nrc && <p className="text-red-400 text-xs mt-1">{errors.nrc}</p>}
          </div>
        )}

        {/* Campos de contribuyente - solo visibles si no es consumidor */}
        {!esConsumidor && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Giro / Actividad *</label>
              <select
                name="giro"
                value={formData.giro}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border ${errors.giro ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="">Seleccionar</option>
                {actividades.map((act) => (
                  <option key={act.codigo_giro} value={act.codigo_giro}>
                    {act.codigo_giro} - {act.descripcion_giro}
                  </option>
                ))}
              </select>
              {errors.giro && <p className="text-red-400 text-xs mt-1">{errors.giro}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Contribuyente *</label>
              <select
                name="tipo_contribuyente"
                value={formData.tipo_contribuyente}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border ${errors.tipo_contribuyente ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="Grande">Grande</option>
                <option value="Mediano">Mediano</option>
                <option value="Pequeño">Pequeño</option>
                <option value="Exento">Exento</option>
              </select>
              {errors.tipo_contribuyente && <p className="text-red-400 text-xs mt-1">{errors.tipo_contribuyente}</p>}
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono (8 dígitos)</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleTelefonoChange}
            placeholder="78984090"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">Se guardará con prefijo 503: 503{formData.telefono}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp (8 dígitos)</label>
          <input
            type="text"
            name="telefono_whatsapp"
            value={formData.telefono_whatsapp}
            onChange={handleWhatsappChange}
            placeholder="78984090"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">Se guardará con prefijo 503: 503{formData.telefono_whatsapp}</p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
          <input
            type="email"
            name="correo"
            value={formData.correo}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.correo ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.correo && <p className="text-red-400 text-xs mt-1">{errors.correo}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Departamento *</label>
          <select
            name="id_departamento"
            value={formData.id_departamento}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.id_departamento ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value="">Seleccionar</option>
            {departamentos.map((d) => (
              <option key={d.id_departamento} value={d.id_departamento}>
                {d.nombre_departamento}
              </option>
            ))}
          </select>
          {errors.id_departamento && <p className="text-red-400 text-xs mt-1">{errors.id_departamento}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Municipio *</label>
          <select
            name="id_municipio"
            value={formData.id_municipio}
            onChange={handleChange}
            disabled={!formData.id_departamento || loadingMunicipios}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.id_municipio ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value="">Seleccionar</option>
            {municipios.map((m) => (
              <option key={m.id_municipio} value={m.id_municipio}>
                {m.nombre_municipio}
              </option>
            ))}
          </select>
          {errors.id_municipio && <p className="text-red-400 text-xs mt-1">{errors.id_municipio}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Dirección (calle, colonia, número) *</label>
          <input
            type="text"
            name="direccion_linea"
            value={formData.direccion_linea}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.direccion_linea ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.direccion_linea && <p className="text-red-400 text-xs mt-1">{errors.direccion_linea}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Dirección (campo adicional opcional)</label>
          <input
            type="text"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
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
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default ClientForm;