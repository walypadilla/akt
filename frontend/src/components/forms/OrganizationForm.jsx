// frontend/src/components/forms/OrganizationForm.jsx
import React, { useState, useEffect } from 'react';
import { getDepartamentos, getMunicipios } from '../../api/catalogos';
import { getPlanes } from '../../api/dashboard'; // Crear esta API si no existe

const OrganizationForm = ({ initialData = {}, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    nombre_empresa: initialData.nombre_empresa || '',
    nombre_comercial: initialData.nombre_comercial || '',
    nit: initialData.nit || '',
    nrc: initialData.nrc || '',
    direccion: initialData.direccion || '',
    telefono: initialData.telefono ? initialData.telefono.replace(/^\+503/, '') : '',
    telefono_whatsapp: initialData.telefono_whatsapp ? initialData.telefono_whatsapp.replace(/^\+503/, '') : '',
    correo_contacto: initialData.correo_contacto || '',
    tipo_contribuyente: initialData.tipo_contribuyente || 'Pequeño',
    tipo_organizacion: initialData.tipo_organizacion || 'Empresa Comercial',
    ambiente: initialData.ambiente || '00',
    token_mh: initialData.token_mh || '',
    llave_privada_p12: initialData.llave_privada_p12 || '',
    logo_url: initialData.logo_url || '',
    codigo_giro: initialData.codigo_giro || '62010',
    id_departamento: initialData.id_departamento || '',
    id_municipio: initialData.id_municipio || '',
    direccion_linea: initialData.direccion_linea || '',
    correo_admin: initialData.correo_admin || '',
    nombre_admin: initialData.nombre_admin || '',
    password_admin: initialData.password_admin || '',
    plan_id: initialData.plan_id || 1,
    whatsapp_activado: initialData.whatsapp_activado !== undefined 
      ? Boolean(Number(initialData.whatsapp_activado) || initialData.whatsapp_activado === true || initialData.whatsapp_activado === 'true')
      : true,
  });

  const [limites, setLimites] = useState({
    facturas: initialData.limite_facturas || 40,
    whatsapp: initialData.limite_whatsapp || 200,
  });

  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [planes, setPlanes] = useState([]);

  // Planes con rangos sugeridos
  const planesData = [
    { id: 1, nombre: 'Mínima', facturasMin: 20, facturasMax: 80, whatsappMin: 50, whatsappMax: 200 },
    { id: 2, nombre: 'Básica', facturasMin: 80, facturasMax: 150, whatsappMin: 200, whatsappMax: 400 },
    { id: 3, nombre: 'Moderna', facturasMin: 150, facturasMax: 300, whatsappMin: 400, whatsappMax: 600 },
    { id: 4, nombre: 'Premium', facturasMin: 300, facturasMax: 500, whatsappMin: 600, whatsappMax: 800 },
  ];

  // Cargar catálogos
  useEffect(() => {
    const loadCatalogos = async () => {
      setLoadingCatalogos(true);
      try {
        const deptos = await getDepartamentos();
        setDepartamentos(deptos);
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

  useEffect(() => {
    const loadMunicipios = async () => {
      if (formData.id_departamento) {
        try {
          const munis = await getMunicipios(formData.id_departamento);
          setMunicipios(munis);
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

  // Obtener planes del backend (si existe)
  useEffect(() => {
    const loadPlanes = async () => {
      try {
        // Si tienes API para planes, usarla; si no, usar datos locales
        // const data = await getPlanes();
        // setPlanes(data);
        setPlanes(planesData);
      } catch (error) {
        console.error('Error cargando planes:', error);
      }
    };
    loadPlanes();
  }, []);

  const handlePlanChange = (planId) => {
    const plan = planesData.find(p => p.id === parseInt(planId));
    if (plan) {
      setFormData(prev => ({ ...prev, plan_id: planId }));
      setLimites({
        facturas: plan.facturasMin,
        whatsapp: plan.whatsappMin,
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre_empresa.trim()) newErrors.nombre_empresa = 'Requerido';
    if (!formData.nit.trim()) newErrors.nit = 'Requerido';
    if (formData.nit && !/^\d{4}-\d{6}-\d{3}-\d{1}$/.test(formData.nit)) {
      newErrors.nit = 'Formato NIT: 0000-000000-000-0';
    }
    if (formData.correo_contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo_contacto)) {
      newErrors.correo_contacto = 'Correo inválido';
    }
    if (!initialData.id) {
      if (!formData.correo_admin.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo_admin)) {
        newErrors.correo_admin = 'Correo válido requerido';
      }
      if (!formData.password_admin || formData.password_admin.length < 6) {
        newErrors.password_admin = 'Mínimo 6 caracteres';
      }
      if (!formData.nombre_admin.trim()) newErrors.nombre_admin = 'Requerido';
    }
    if (!formData.id_departamento) newErrors.id_departamento = 'Seleccione departamento';
    if (!formData.id_municipio) newErrors.id_municipio = 'Seleccione municipio';
    if (!formData.direccion_linea.trim()) newErrors.direccion_linea = 'Requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: val });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const isWhatsappActivo = Boolean(formData.whatsapp_activado);
      const dataToSubmit = {
        ...formData,
        telefono: formData.telefono ? `+503${formData.telefono}` : '',
        telefono_whatsapp: formData.telefono_whatsapp ? `+503${formData.telefono_whatsapp}` : '',
        whatsapp_activado: isWhatsappActivo ? 1 : 0,
        limite_facturas: parseInt(limites.facturas, 10) || 0,
        limite_whatsapp: isWhatsappActivo ? (parseInt(limites.whatsapp, 10) || 0) : 0,
      };
      // Si hay archivo, enviar con FormData
      if (formData.logo_file) {
        const formDataObj = new FormData();
        Object.keys(dataToSubmit).forEach(key => {
          if (key !== 'logo_file' && key !== 'logo_preview') {
            formDataObj.append(key, dataToSubmit[key]);
          }
        });
        formDataObj.append('logo', formData.logo_file);
        onSubmit(formDataObj); // El onSubmit debe manejar FormData
      } else {
        onSubmit(dataToSubmit);
      }
    }
  };

  const isEditing = !!initialData.id;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre Empresa */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Empresa *</label>
          <input
            type="text"
            name="nombre_empresa"
            value={formData.nombre_empresa}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.nombre_empresa ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
          />
          {errors.nombre_empresa && <p className="text-red-400 text-xs mt-1">{errors.nombre_empresa}</p>}
        </div>

        {/* Nombre Comercial */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Comercial</label>
          <input
            type="text"
            name="nombre_comercial"
            value={formData.nombre_comercial}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* NIT */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">NIT *</label>
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

        {/* NRC */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">NRC</label>
          <input
            type="text"
            name="nrc"
            value={formData.nrc}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Teléfono WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono WhatsApp</label>
          <input
            type="text"
            name="telefono_whatsapp"
            value={formData.telefono_whatsapp}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Código de Giro */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Código de Giro (Actividad Económica)</label>
          <input
            type="text"
            name="codigo_giro"
            value={formData.codigo_giro}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Correo de Contacto */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Correo de Contacto</label>
          <input
            type="email"
            name="correo_contacto"
            value={formData.correo_contacto}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.correo_contacto ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
          />
          {errors.correo_contacto && <p className="text-red-400 text-xs mt-1">{errors.correo_contacto}</p>}
        </div>

        {/* Tipo Contribuyente */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Contribuyente</label>
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

        {/* Tipo Organización */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tipo de Organización *
          </label>
          <select
            name="tipo_organizacion"
            value={formData.tipo_organizacion}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          >
            <option value="Empresa Comercial">Empresa Comercial</option>
            <option value="Clinica General">Clínica General</option>
            <option value="Clinica Dental">Clínica Dental</option>
            <option value="Clinica Veterinaria">Clínica Veterinaria</option>
          </select>
        </div>

        {/* Ambiente */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Ambiente</label>
          <select
            name="ambiente"
            value={formData.ambiente}
            onChange={handleChange}
          >
            <option value="00">Pruebas</option>
            <option value="01">Producción</option>
          </select>
        </div>

        {/* Token MH */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Token MH</label>
          <input
            type="text"
            name="token_mh"
            value={formData.token_mh}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Llave Privada P12 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Llave Privada P12</label>
          <textarea
            name="llave_privada_p12"
            value={formData.llave_privada_p12}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono text-xs"
          />
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                // 1. Guardamos el archivo REAL inmediatamente en el estado
                setFormData(prev => ({ ...prev, logo_file: file }));

                // 2. Después generamos la vista previa
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setFormData(prev => ({ ...prev, logo_preview: ev.target.result }));
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {formData.logo_preview && (
            <img src={formData.logo_preview} alt="Logo preview" className="mt-2 h-16 w-auto object-contain" />
          )}
          {formData.logo_url && !formData.logo_preview && (
            <img src={formData.logo_url} alt="Logo actual" className="mt-2 h-16 w-auto object-contain" />
          )}
        </div>

        {/* Plan */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Plan / Suscripción</label>
          <select
            name="plan_id"
            value={formData.plan_id}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {planesData.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* Límite facturas */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Límite facturas mensuales
            <span className="text-xs text-gray-400 ml-2">
              (rango sugerido: {planesData.find(p => p.id === parseInt(formData.plan_id))?.facturasMin} - {planesData.find(p => p.id === parseInt(formData.plan_id))?.facturasMax})
            </span>
          </label>
          <input
            type="number"
            min="0"
            value={limites.facturas}
            onChange={(e) => setLimites({ ...limites, facturas: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* WhatsApp Activado */}
        <div className="flex items-center gap-3 bg-gray-700/50 p-3 rounded-lg border border-gray-600">
          <label className="text-sm font-medium text-gray-300">WhatsApp Activado</label>
          <input
            type="checkbox"
            name="whatsapp_activado"
            checked={formData.whatsapp_activado}
            onChange={handleChange}
            className="w-5 h-5 bg-gray-700 border-gray-600 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <span className="text-xs text-gray-400">
            {formData.whatsapp_activado ? '✅ Activado' : '❌ Desactivado'}
          </span>
        </div>

        {/* Límite WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Límite WhatsApp mensual
            <span className="text-xs text-gray-400 ml-2">
              (rango sugerido: {planesData.find(p => p.id === parseInt(formData.plan_id))?.whatsappMin} - {planesData.find(p => p.id === parseInt(formData.plan_id))?.whatsappMax})
            </span>
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={formData.whatsapp_activado ? limites.whatsapp : 0}
            onChange={(e) => setLimites({ ...limites, whatsapp: parseInt(e.target.value) || 0 })}
            disabled={!formData.whatsapp_activado}
            className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${!formData.whatsapp_activado ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {!formData.whatsapp_activado && (
            <p className="text-xs text-gray-400 mt-1">WhatsApp desactivado, el límite será 0</p>
          )}
        </div>

        {/* Dirección DTE */}
        <div className="md:col-span-2">
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
            <p className="text-sm font-semibold text-purple-400 mb-2">
              📍 Ubicación para DTE (requerido para facturación electrónica)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Departamento *</label>
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
                <label className="block text-sm font-medium text-gray-300 mb-1">Municipio *</label>
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
                <label className="block text-sm font-medium text-gray-300 mb-1">Dirección (calle, colonia, etc.) *</label>
                <input
                  type="text"
                  name="direccion_linea"
                  value={formData.direccion_linea}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-gray-700 border ${errors.direccion_linea ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
                />
                {errors.direccion_linea && <p className="text-red-400 text-xs mt-1">{errors.direccion_linea}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Dirección adicional */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Dirección (campo adicional opcional)</label>
          <input
            type="text"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Administrador Inicial */}
        {!isEditing && (
          <>
            <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-2">
              <h4 className="text-md font-semibold text-purple-400 mb-2">👤 Administrador Inicial</h4>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Admin *</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Correo Admin *</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña Admin *</label>
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
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition disabled:opacity-50 shadow-lg shadow-purple-600/20">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default OrganizationForm;