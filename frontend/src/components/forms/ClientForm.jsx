// frontend/src/components/forms/ClientForm.jsx
import React, { useState, useEffect } from 'react';
import { getDepartamentos, getMunicipios, getActividades } from '../../api/catalogos';

const ClientForm = ({ initialData = {}, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    dui: initialData.dui || '',
    nit: initialData.nit || '',
    nrc: initialData.nrc || '',
    giro: initialData.giro || '',
    tipo_contribuyente: initialData.tipo_contribuyente || 'Pequeño',
    direccion: initialData.direccion || '',
    telefono: initialData.telefono || '',
    correo: initialData.correo || '',
    telefono_whatsapp: initialData.telefono_whatsapp || '',
    id_departamento: initialData.id_departamento || '',
    id_municipio: initialData.id_municipio || '',
    direccion_linea: initialData.direccion_linea || '',
  });

  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  useEffect(() => {
    const loadCatalogos = async () => {
      setLoadingCatalogos(true);
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
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.nit.trim()) newErrors.nit = 'El NIT es obligatorio';
    else if (!/^\d{4}-\d{6}-\d{3}-\d{1}$/.test(formData.nit)) {
      newErrors.nit = 'Formato NIT: 0000-000000-000-0';
    }
    if (formData.dui && !/^\d{8}-\d{1}$/.test(formData.dui)) {
      newErrors.dui = 'Formato DUI: 00000000-0';
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
          <label className="block text-sm font-medium text-gray-300 mb-1">NIT *</label>
          <input
            type="text"
            name="nit"
            value={formData.nit}
            onChange={handleChange}
            placeholder="0000-000000-000-0"
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.nit ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.nit && <p className="text-red-400 text-xs mt-1">{errors.nit}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">DUI</label>
          <input
            type="text"
            name="dui"
            value={formData.dui}
            onChange={handleChange}
            placeholder="00000000-0"
            className={`w-full px-3 py-2 bg-gray-700 border ${errors.dui ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          {errors.dui && <p className="text-red-400 text-xs mt-1">{errors.dui}</p>}
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Giro / Actividad</label>
          <select
            name="giro"
            value={formData.giro}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Seleccionar</option>
            {actividades.map((act) => (
              <option key={act.codigo_giro} value={act.codigo_giro}>
                {act.codigo_giro} - {act.descripcion_giro}
              </option>
            ))}
          </select>
        </div>
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
          <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp</label>
          <input
            type="text"
            name="telefono_whatsapp"
            value={formData.telefono_whatsapp}
            onChange={handleChange}
            placeholder="Para envío de facturas"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Correo</label>
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