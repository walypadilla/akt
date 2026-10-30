import React, { useEffect, useRef, useState } from 'react';
import { X, Download, FileText, Trash2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { getHistorialPesoPaciente, eliminarRegistroPeso, exportarHistorialPesoPaciente } from '../../../api/clinica';
import { toast } from 'react-toastify';
import { getTodayLocal } from '../../../utils/dateUtils';

const ModalGraficaPeso = ({ paciente, onClose }) => {
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getHistorialPesoPaciente(paciente.id);
      setHist(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [paciente.id]);

  const datos = hist.map((h) => ({
    fecha: new Date(h.fecha_registro).toLocaleDateString('es-SV', {
      day: '2-digit', month: 'short', year: '2-digit',
    }),
    peso: Number(h.peso),
  }));

  const exportarExcel = async () => {
    try {
      const blob = await exportarHistorialPesoPaciente(paciente.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peso_${paciente.nombre.replace(/\s+/g, '_')}_${getTodayLocal()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel descargado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  const exportarPDF = async () => {
    if (!chartRef.current) {
      toast.warning('Sin gráfica para exportar');
      return;
    }
    try {
      // Capturamos el div que contiene la gráfica
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#1f2937',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('landscape', 'mm', 'a4');

      pdf.setFontSize(15);
      pdf.text(`Evolucion de Peso - ${paciente.nombre} ${paciente.apellidos || ''}`, 14, 15);
      pdf.setFontSize(10);
      pdf.text(`Especie: ${paciente.especie || '-'}    Raza: ${paciente.raza || '-'}`, 14, 22);
      pdf.text(
        `Rango ideal: ${paciente.peso_ideal_min ?? '-'} - ${paciente.peso_ideal_max ?? '-'} kg`,
        14, 28
      );
      pdf.text(`Generado: ${new Date().toLocaleString('es-SV')}`, 14, 34);

      // Insertar imagen de la gráfica
      const imgWidth = 260;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 14, 42, imgWidth, imgHeight);

      // Tabla resumen
      let y = 42 + imgHeight + 8;
      pdf.setFontSize(11);
      pdf.text('Historial de registros', 14, y);
      y += 5;
      pdf.setFontSize(9);
      
      hist.forEach((h) => {
        pdf.text(
          `${new Date(h.fecha_registro).toLocaleDateString('es-SV')}  -  ${h.peso} kg  (${h.origen})`,
          16, y
        );
        y += 5;
        if (y > 195) { pdf.addPage(); y = 20; }
      });

      pdf.save(`reporte_peso_${paciente.nombre.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF descargado');
    } catch (err) {
      console.error('Error al generar PDF:', err);
      toast.error('Error al generar PDF: ' + (err.message || 'Intenta de nuevo'));
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este registro de peso?')) return;
    try {
      await eliminarRegistroPeso(id);
      toast.success('Registro eliminado');
      cargar();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-4 border-b border-gray-700 bg-gray-800/95 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-white">
              Evolución de Peso
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {paciente.nombre} {paciente.apellidos || ''} — {paciente.especie || ''} {paciente.raza || ''}
            </p>
          </div>
          <button
            onClick={() => onClose()}
            className="text-gray-400 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        {/* Gráfica */}
        <div className="p-4">
          {loading ? (
            <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
              Cargando...
            </div>
          ) : hist.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
              Sin registros de peso aún
            </div>
          ) : (
            <div ref={chartRef} style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={datos} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="fecha" stroke="#9ca3af" fontSize={11} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    domain={['dataMin - 1', 'dataMax + 1']}
                    label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                    labelStyle={{ color: '#a78bfa' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ fill: '#8b5cf6', r: 5 }}
                    activeDot={{ r: 7, fill: '#a78bfa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tabla de registros */}
        {hist.length > 0 && (
          <div className="px-4 pb-2">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
              Registros ({hist.length})
            </h4>
            <div className="max-h-48 overflow-y-auto bg-gray-900/40 rounded-lg border border-gray-700/60">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-900/80 sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-gray-400 font-semibold">Fecha</th>
                    <th className="px-3 py-1.5 text-right text-gray-400 font-semibold">Peso</th>
                    <th className="px-3 py-1.5 text-left text-gray-400 font-semibold">Origen</th>
                    <th className="px-3 py-1.5 text-left text-gray-400 font-semibold">Registró</th>
                    <th className="px-3 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {hist.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-800/40">
                      <td className="px-3 py-1.5 text-gray-300">
                        {new Date(h.fecha_registro).toLocaleString('es-SV')}
                      </td>
                      <td className="px-3 py-1.5 text-right text-white font-semibold">
                        {h.peso} kg
                      </td>
                      <td className="px-3 py-1.5 text-gray-400">{h.origen}</td>
                      <td className="px-3 py-1.5 text-gray-400">{h.usuario_nombre || '—'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => eliminar(h.id)}
                          className="text-rose-400 hover:text-rose-300"
                          title="Eliminar registro"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-700 bg-gray-800/95">
          <span className="text-xs text-gray-500">
            {hist.length} registro(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={exportarExcel}
              disabled={hist.length === 0}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download size={13} /> Excel
            </button>
            <button
              onClick={exportarPDF}
              disabled={hist.length === 0}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-900/30"
            >
              <FileText size={13} /> PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalGraficaPeso;