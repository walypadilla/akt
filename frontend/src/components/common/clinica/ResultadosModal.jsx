// frontend/src/components/common/clinica/ResultadosModal.jsx
import React, { useState, useEffect } from 'react';
import { X, FileText, User, Calendar, Save, Paperclip, Trash2, Image as ImageIcon, FileType } from 'lucide-react';
import { subirArchivoResultado, buildFileUrl } from '../../../api/clinica';
import { toast } from 'react-toastify';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const ResultadosModal = ({ solicitud, examenPlantilla, onSave, onClose, loading = false }) => {
  const [resultado, setResultado] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [archivoExistente, setArchivoExistente] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (solicitud) {
      const textoInicial = solicitud.resultado_texto || examenPlantilla || '';
      setResultado(textoInicial);
      setArchivoExistente(solicitud.resultado_archivo_url || null);
      setArchivo(null);
    }
  }, [solicitud, examenPlantilla]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 🔒 Validación frontend de tamaño
    if (file.size > MAX_SIZE) {
      toast.error(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 2MB.`);
      e.target.value = '';
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Solo se permiten archivos JPG, PNG o PDF');
      e.target.value = '';
      return;
    }

    setArchivo(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resultado.trim()) {
      setErrors({ resultado: 'Debe ingresar los resultados del examen' });
      return;
    }

    if (archivo) {
      try {
        setSubiendo(true);
        await subirArchivoResultado(solicitud.id, archivo);
        toast.success('Archivo adjuntado');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error al subir el archivo');
        setSubiendo(false);
        return;
      }
      setSubiendo(false);
    }

    onSave({ resultado_texto: resultado.trim() });
  };

  if (!solicitud) return null;

  const fechaSolicitud = solicitud.fecha_solicitud
    ? new Date(solicitud.fecha_solicitud).toLocaleString('es-SV')
    : '-';

  const esImagen = archivo?.type.startsWith('image/');
  const esPDF = archivo?.type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[95vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText size={22} className="text-purple-400" />
            Ingresar Resultados del Examen
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Info read-only */}
        <div className="bg-gray-700/30 rounded-lg border border-gray-600 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <User size={14} className="text-purple-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Paciente</p>
                <p className="text-white font-medium">
                  {solicitud.paciente_nombre} {solicitud.paciente_apellidos || ''}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-purple-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Examen</p>
                <p className="text-white font-medium">{solicitud.examen_nombre}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-purple-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Fecha</p>
                <p className="text-white">{fechaSolicitud}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
              <FileText size={14} className="text-purple-400" />
              Resultados / Hallazgos *
            </label>
            <textarea
              value={resultado}
              onChange={(e) => {
                setResultado(e.target.value);
                if (errors.resultado) setErrors({});
              }}
              rows={10}
              placeholder={'Ingrese los resultados...\n\nEjemplo:\nGlucosa: 115 mg/dL\nTriglicéridos: 200 mg/dL'}
              className={`w-full px-3 py-2 bg-gray-700 border ${
                errors.resultado ? 'border-red-500' : 'border-gray-600'
              } rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono`}
            />
            {errors.resultado && <p className="text-red-400 text-xs mt-1">{errors.resultado}</p>}
          </div>

          {/* Archivo adjunto */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
              <Paperclip size={14} className="text-purple-400" />
              Archivo adjunto (opcional, máx. 2MB · JPG, PNG o PDF)
            </label>

            {archivoExistente && !archivo && (
              <div className="flex items-center gap-2 p-2 bg-cyan-900/20 border border-cyan-700/40 rounded-lg mb-2 text-sm">
                <Paperclip size={14} className="text-cyan-400" />
                <span className="text-cyan-300 flex-1 truncate">Archivo adjunto actual</span>
                <a
                    href={buildFileUrl(archivoExistente)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                >
                    Ver
                </a>
                <button
                  type="button"
                  onClick={() => setArchivoExistente(null)}
                  title="Quitar"
                  className="text-rose-400 hover:text-rose-300"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {archivo && (
              <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg mb-2 p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  {esImagen ? (
                    <ImageIcon size={14} className="text-emerald-400" />
                  ) : (
                    <FileType size={14} className="text-emerald-400" />
                  )}
                  <span className="text-emerald-300 flex-1 truncate">{archivo.name}</span>
                  <span className="text-xs text-emerald-400">
                    {(archivo.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => setArchivo(null)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Preview en vivo */}
                {esImagen && (
                  <img
                    src={URL.createObjectURL(archivo)}
                    alt="Preview"
                    className="max-h-48 rounded-lg border border-emerald-700/50 mx-auto"
                  />
                )}
                {esPDF && (
                  <div className="text-xs text-emerald-300 flex items-center gap-2">
                    <FileType size={12} /> Archivo PDF listo para subir
                  </div>
                )}
              </div>
            )}

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="block w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/30 file:cursor-pointer cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || subiendo}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-emerald-900/30"
            >
              <Save size={16} />
              {subiendo ? 'Subiendo archivo...' : loading ? 'Guardando...' : 'Guardar y Completar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResultadosModal;