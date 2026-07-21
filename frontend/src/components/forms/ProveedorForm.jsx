// frontend/src/components/forms/ProveedorForm.jsx
import React, { useState, useEffect } from 'react';
import { getDepartamentos, getMunicipios, getActividades } from '../../api/catalogos';

const ProveedorForm = ({ initialData = {}, onSubmit, onCancel, loading }) => {
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
    tipo_contribuyente: initialData.tipo_contribuyente || 'Otros',
  });

  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [deptos, acts] = await Promise.all([
          getDepartamentos(),
          getActividades(),
        ]);
        setDepartamentos(deptos);
        setActividades(acts);
        if (formData.id_departamento) {
          const munis = await getMunicipios(formData.id_departamento);
          setMunicipios(munis);
        }
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    loadCatalogos();
  }, []);

  useEffect(() => {
    const loadMunicipios = async () => {
      if (formData.id_departamento) {
        try {
          const munis = await getMunicipios(formData.id_departamento);
          setMunicipios(munis);
        } catch (error) {
          console.error('Error cargando municipios:', error);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Documento</label>
          <select
            name="tipo_documento"
            value={formData.tipo_documento}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="NIT">NIT</option>
            <option value="DUI">DUI</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Número Documento *</label>
          <input
            type="text"
            name="numero_documento"
            value={formData.numero_documento}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.numero_documento ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.numero_documento && <p className="text-red-400 text-xs mt-1">{errors.numero_documento}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">NRC</label>
          <input
            type="text"
            name="nrc"
            value={formData.nrc}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Contribuyente</label>
          <select
            name="tipo_contribuyente"
            value={formData.tipo_contribuyente}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Otros">Otros</option>
            <option value="Grande">Grande</option>
            <option value="Mediano">Mediano</option>
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
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.id_municipio ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
            disabled={!formData.id_departamento}
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Dirección (calle, colonia, etc.) *</label>
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