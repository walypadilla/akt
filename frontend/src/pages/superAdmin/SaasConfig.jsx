import React, { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../../api/saasConfig';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const SaasConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConfig();
      setConfig(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateConfig(config);
      alert('Configuración actualizada correctamente');
    } catch (err) {
      alert('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchConfig} />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Configuración SaaS</h1>
      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-6 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                name="nombre_empresa"
                value={config.nombre_empresa || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre Comercial
              </label>
              <input
                type="text"
                name="nombre_comercial"
                value={config.nombre_comercial || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                NIT *
              </label>
              <input
                type="text"
                name="nit"
                value={config.nit || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                NRC
              </label>
              <input
                type="text"
                name="nrc"
                value={config.nrc || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Dirección
              </label>
              <input
                type="text"
                name="direccion"
                value={config.direccion || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                name="telefono"
                value={config.telefono || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Correo
              </label>
              <input
                type="email"
                name="correo"
                value={config.correo || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-6 bg-slate-600 hover:bg-slate-500 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SaasConfig;