// frontend/src/components/forms/OrganizationForm.jsx
import React, { useState, useEffect } from 'react';
import { getDepartamentos, getMunicipios } from '../../api/catalogos';

const OrganizationForm = ({ initialData = {}, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    nombre_empresa: initialData.nombre_empresa || '',
    nombre_comercial: initialData.nombre_comercial || '',
    nit: initialData.nit || '',
    nrc: initialData.nrc || '',
    direccion: initialData.direccion || '',
    telefono: initialData.telefono || '',
    telefono_whatsapp: initialData.telefono_whatsapp || '',
    correo_contacto: initialData.correo_contacto || '',
    tipo_contribuyente: initialData.tipo_contribuyente || 'Pequeño',
    tipo_organizacion: initialData.tipo_organizacion || 'Empresa Comercial',
    ambiente: initialData.ambiente || 'Pruebas',
    token_mh: initialData.token_mh || '',
    llave_privada_p12: initialData.llave_privada_p12 || '',
    logo_url: initialData.logo_url || '',
    // Nuevos campos para dirección DTE
    id_departamento: initialData.id_departamento || '',
    id_municipio: initialData.id_municipio || '',
    direccion_linea: initialData.direccion_linea || '',
    // Campos de administrador inicial (solo para creación)
    correo_admin: initialData.correo_admin || '',
    nombre_admin: initialData.nombre_admin || '',
    password_admin: initialData.password_admin || '',
  });

  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  // Cargar departamentos y municipios al montar el componente
  useEffect(() => {
    const loadCatalogos = async () => {
      setLoadingCatalogos(true);
      try {
        const deptos = await getDepartamentos();
        setDepartamentos(deptos);
        // Si ya hay un departamento seleccionado, cargar sus municipios
        if (formData.id_departamento) {
          const munis = await getMunicipios(formData.id_departamento);
          setMunicipios(munis);
        }
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      } finally {
        setLoadingCatalogos(false);
      }
    };
    loadCatalogos();
  }, []);

  // Cuando cambia el departamento, actualizar la lista de municipios
  useEffect(() => {
    const loadMunicipios = async () => {
      if (formData.id_departamento) {
        try {
          const munis = await getMunicipios(formData.id_departamento);
          setMunicipios(munis);
          // Si el municipio seleccionado no pertenece al nuevo departamento, limpiarlo
          if (formData.id_municipio && !munis.some(m => m.id_municipio === formData.id_municipio)) {
            setFormData(prev => ({ ...prev, id_municipio: '' }));
          }
        } catch (error) {
          console.error('Error cargando municipios:', error);
        }
      } else {
        setMunicipios([]);
        setFormData(prev => ({ ...prev, id_municipio: '' }));
      }
    };
    loadMunicipios();
  }, [formData.id_departamento]);

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre_empresa.trim()) newErrors.nombre_empresa = 'Requerido';
    if (!formData.nit.trim()) newErrors.nit = 'Requerido';
    // Validar formato NIT (opcional, pero recomendado)
    if (formData.nit && !/^\d{4}-\d{6}-\d{3}-\d{1}$/.test(formData.nit)) {
      newErrors.nit = 'Formato NIT: 0000-000000-000-0';
    }
    // Validar correo de contacto si se proporciona
    if (formData.correo_contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo_contacto)) {
      newErrors.correo_contacto = 'Correo inválido';
    }
    // Si es creación, validar datos del administrador
    if (!initialData.id) {
      if (!formData.correo_admin.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo_admin)) {
        newErrors.correo_admin = 'Correo válido requerido';
      }
      if (!formData.password_admin || formData.password_admin.length < 6) {
        newErrors.password_admin = 'Mínimo 6 caracteres';
      }
      if (!formData.nombre_admin.trim()) newErrors.nombre_admin = 'Requerido';
    }
    // Validar campos de dirección (opcional, pero recomendado)
    if (!formData.id_departamento) newErrors.id_departamento = 'Seleccione departamento';
    if (!formData.id_municipio) newErrors.id_municipio = 'Seleccione municipio';
    if (!formData.direccion_linea.trim()) newErrors.direccion_linea = 'Requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  // Extraer campos de administrador para mostrarlos solo en creación
  const isEditing = !!initialData.id;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Datos de la empresa */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nombre Empresa *
          </label>
          <input
            type="text"
            name="nombre_empresa"
            value={formData.nombre_empresa}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.nombre_empresa ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
          />
          {errors.nombre_empresa && <p className="text-red-400 text-xs mt-1">{errors.nombre_empresa}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nombre Comercial
          </label>
          <input
            type="text"
            name="nombre_comercial"
            value={formData.nombre_comercial}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            NIT *
          </label>
          <input
            type="text"
            name="nit"
            value={formData.nit}
            onChange={handleChange}
            placeholder="0000-000000-000-0"
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.nit ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
          />
          {errors.nit && <p className="text-red-400 text-xs mt-1">{errors.nit}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            NRC
          </label>
          <input
            type="text"
            name="nrc"
            value={formData.nrc}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Teléfono
          </label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Teléfono WhatsApp
          </label>
          <input
            type="text"
            name="telefono_whatsapp"
            value={formData.telefono_whatsapp}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Correo de Contacto
          </label>
          <input
            type="email"
            name="correo_contacto"
            value={formData.correo_contacto}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.correo_contacto ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
          />
          {errors.correo_contacto && <p className="text-red-400 text-xs mt-1">{errors.correo_contacto}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tipo Contribuyente
          </label>
          <select
            name="tipo_contribuyente"
            value={formData.tipo_contribuyente}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          >
            <option value="Pequeño">Pequeño</option>
            <option value="Mediano">Mediano</option>
            <option value="Grande">Grande</option>
            <option value="Exento">Exento</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tipo Organización
          </label>
          <select
            name="tipo_organizacion"
            value={formData.tipo_organizacion}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          >
            <option value="Empresa Comercial">Empresa Comercial</option>
            <option value="Clínica General">Clínica General</option>
            <option value="Clínica Dental">Clínica Dental</option>
            <option value="Clinica Veterinaria">Clinica Veterinaria</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Ambiente
          </label>
          <select
            name="ambiente"
            value={formData.ambiente}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          >
            <option value="Pruebas">Pruebas</option>
            <option value="Producción">Producción</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Token MH
          </label>
          <input
            type="text"
            name="token_mh"
            value={formData.token_mh}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Llave Privada P12
          </label>
          <textarea
            name="llave_privada_p12"
            value={formData.llave_privada_p12}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Logo URL
          </label>
          <input
            type="text"
            name="logo_url"
            value={formData.logo_url}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Dirección DTE (departamento, municipio, dirección línea) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Departamento *
          </label>
          <select
            name="id_departamento"
            value={formData.id_departamento}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.id_departamento ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
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
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Municipio *
          </label>
          <select
            name="id_municipio"
            value={formData.id_municipio}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.id_municipio ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
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
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Dirección (calle, colonia, etc.) *
          </label>
          <input
            type="text"
            name="direccion_linea"
            value={formData.direccion_linea}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.direccion_linea ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
          />
          {errors.direccion_linea && <p className="text-red-400 text-xs mt-1">{errors.direccion_linea}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Dirección (campo adicional opcional)
          </label>
          <input
            type="text"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Administrador Inicial (solo en creación) */}
        {!isEditing && (
          <>
            <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-2">
              <h4 className="text-md font-semibold text-purple-400 mb-2">👤 Administrador Inicial</h4>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre Admin *
              </label>
              <input
                type="text"
                name="nombre_admin"
                value={formData.nombre_admin}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border ${errors.nombre_admin ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
              />
              {errors.nombre_admin && <p className="text-red-400 text-xs mt-1">{errors.nombre_admin}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Correo Admin *
              </label>
              <input
                type="email"
                name="correo_admin"
                value={formData.correo_admin}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border ${errors.correo_admin ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
              />
              {errors.correo_admin && <p className="text-red-400 text-xs mt-1">{errors.correo_admin}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contraseña Admin *
              </label>
              <input
                type="password"
                name="password_admin"
                value={formData.password_admin}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border ${errors.password_admin ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
              />
              {errors.password_admin && <p className="text-red-400 text-xs mt-1">{errors.password_admin}</p>}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-700 mt-6 pb-2">
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
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition disabled:opacity-50 shadow-lg shadow-purple-600/20"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default OrganizationForm;