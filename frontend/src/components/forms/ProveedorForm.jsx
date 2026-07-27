// frontend/src/components/forms/ProveedorForm.jsx
import React, { useState, useEffect } from 'react';

const ProveedorForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading,
  departamentos = [],
  actividades = [],
}) => {
  const [formData, setFormData] = useState({
    razon_social: initialData.razon_social || '',
    nombre_comercial: initialData.nombre_comercial || '',
    tipo_documento: initialData.tipo_documento || 'NIT',
    numero_documento: initialData.numero_documento || '',
    nrc: initialData.nrc || '',
    id_departamento: initialData.id_departamento || '',
    id_municipio: initialData.id_municipio || '',
    direccion_linea: initialData.direccion_linea || '',
    telefono: initialData.telefono || '',
    email_dte: initialData.email_dte || '',
    codigo_giro: initialData.codigo_giro || '',
    tipo_contribuyente: initialData.tipo_contribuyente || 'Pequeño',
  });

  const [municipios, setMunicipios] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  // Cargar municipios cuando cambia departamento
  useEffect(() => {
    const loadMunicipios = async () => {
      if (formData.id_departamento) {
        setLoadingMunicipios(true);
        try {
          const { getMunicipios } = await import('../../api/catalogos');
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

  const validate = () => {
    const newErrors = {};
    if (!formData.razon_social.trim()) newErrors.razon_social = 'Requerido';
    if (!formData.numero_documento.trim()) newErrors.numero_documento = 'Requerido';

    // Validar formato según tipo
    const clean = formData.numero_documento.replace(/[^0-9]/g, '');
    if (formData.tipo_documento === 'DUI' && clean.length !== 9) {
      newErrors.numero_documento = 'El DUI debe tener 9 dígitos (formato 00000000-0)';
    } else if (formData.tipo_documento === 'NIT' && clean.length !== 14) {
      newErrors.numero_documento = 'El NIT debe tener 14 dígitos (formato XXXX-XXXXXX-XXX-X)';
    }

    if (formData.tipo_documento === 'NIT') {
      const cleanNrc = formData.nrc ? formData.nrc.replace(/[^0-9]/g, '') : '';
      if (!cleanNrc) {
        newErrors.nrc = 'El NRC es obligatorio para NIT';
      } else if (cleanNrc.length < 4 || cleanNrc.length > 8) {
        newErrors.nrc = 'El NRC debe tener entre 4 y 8 dígitos';
      }
    }

    if (formData.email_dte && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_dte)) {
      newErrors.email_dte = 'Correo inválido';
    }
    if (!formData.id_departamento) newErrors.id_departamento = 'Seleccione departamento';
    if (!formData.id_municipio) newErrors.id_municipio = 'Seleccione municipio';
    if (!formData.direccion_linea.trim()) newErrors.direccion_linea = 'Requerido';
    if (!formData.codigo_giro) newErrors.codigo_giro = 'Seleccione giro';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  // Formatear número según tipo (opcional, solo visual)
  const formatDocument = (value, tipo) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (tipo === 'DUI' && clean.length <= 9) {
      // 00000000-0
      if (clean.length > 8) {
        return clean.slice(0, 8) + '-' + clean.slice(8);
      }
      return clean;
    } else if (tipo === 'NIT' && clean.length <= 14) {
      // XXXX-XXXXXX-XXX-X
      if (clean.length > 4 && clean.length <= 10) {
        return clean.slice(0, 4) + '-' + clean.slice(4);
      } else if (clean.length > 10 && clean.length <= 13) {
        return clean.slice(0, 4) + '-' + clean.slice(4, 10) + '-' + clean.slice(10);
      } else if (clean.length > 13) {
        return clean.slice(0, 4) + '-' + clean.slice(4, 10) + '-' + clean.slice(10, 13) + '-' + clean.slice(13);
      }
      return clean;
    }
    return value;
  };

  const handleDocumentChange = (e) => {
    const raw = e.target.value;
    const clean = raw.replace(/[^0-9]/g, '');
    // No superar longitud máxima
    const maxLen = formData.tipo_documento === 'DUI' ? 9 : 14;
    const truncated = clean.slice(0, maxLen);
    const formatted = formatDocument(truncated, formData.tipo_documento);
    setFormData({ ...formData, numero_documento: formatted });
    if (errors.numero_documento) setErrors({ ...errors, numero_documento: '' });
  };

  const handleNrcChange = (e) => {
    const raw = e.target.value;
    const clean = raw.replace(/[^0-9]/g, '');
    const truncated = clean.slice(0, 8);
    // Formato 123456-7
    const formatted = truncated.length > 0 ? truncated.slice(0, -1) + '-' + truncated.slice(-1) : '';
    setFormData({ ...formData, nrc: formatted });
    if (errors.nrc) setErrors({ ...errors, nrc: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Limpiar antes de enviar
      const cleanData = {
        ...formData,
        numero_documento: formData.numero_documento.replace(/[^0-9]/g, ''),
        nrc: formData.nrc ? formData.nrc.replace(/[^0-9]/g, '') : '',
      };
      onSubmit(cleanData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Razón Social *</label>
          <input
            type="text"
            name="razon_social"
            value={formData.razon_social}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.razon_social ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.razon_social && <p className="text-red-400 text-xs mt-1">{errors.razon_social}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Comercial</label>
          <input
            type="text"
            name="nombre_comercial"
            value={formData.nombre_comercial}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Tipo de Documento */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Documento *</label>
          <select
            name="tipo_documento"
            value={formData.tipo_documento}
            onChange={(e) => {
              setFormData({ ...formData, tipo_documento: e.target.value, numero_documento: '', nrc: '' });
              setErrors({});
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="NIT">NIT (Persona Natural/Jurídica)</option>
            <option value="DUI">DUI (Persona Natural)</option>
          </select>
        </div>

        {/* Número de Documento */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {formData.tipo_documento === 'NIT' ? 'NIT *' : 'DUI *'}
          </label>
          <input
            type="text"
            name="numero_documento"
            value={formData.numero_documento}
            onChange={handleDocumentChange}
            placeholder={formData.tipo_documento === 'NIT' ? 'XXXX-XXXXXX-XXX-X' : '00000000-0'}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.numero_documento ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.numero_documento && <p className="text-red-400 text-xs mt-1">{errors.numero_documento}</p>}
        </div>

        {/* NRC (solo si es NIT) */}
        {formData.tipo_documento === 'NIT' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">NRC *</label>
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

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Contribuyente</label>
          <select
            name="tipo_contribuyente"
            value={formData.tipo_contribuyente}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Grande">Grande</option>
            <option value="Mediano">Mediano</option>
            <option value="Pequeño">Pequeño</option>
            <option value="Exento">Exento</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Giro *</label>
          <select
            name="codigo_giro"
            value={formData.codigo_giro}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.codigo_giro ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value="">Seleccionar</option>
            {actividades.map((act) => (
              <option key={act.codigo_giro} value={act.codigo_giro}>
                {act.codigo_giro} - {act.descripcion_giro}
              </option>
            ))}
          </select>
          {errors.codigo_giro && <p className="text-red-400 text-xs mt-1">{errors.codigo_giro}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder="Sin guiones, ej: 22222222"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email DTE</label>
          <input
            type="email"
            name="email_dte"
            value={formData.email_dte}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.email_dte ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.email_dte && <p className="text-red-400 text-xs mt-1">{errors.email_dte}</p>}
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Dirección (calle, avenida, número, colonia) *</label>
          <input
            type="text"
            name="direccion_linea"
            value={formData.direccion_linea}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.direccion_linea ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.direccion_linea && <p className="text-red-400 text-xs mt-1">{errors.direccion_linea}</p>}
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default ProveedorForm;