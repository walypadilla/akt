// frontend/src/components/common/clinica/OdontogramaViewer.jsx
import React, { useRef } from 'react';
import { Download, X } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'react-toastify';

// --- CONFIGURACIÓN DE DIENTES (FDI) ---
const DIENTES_ADULTOS_SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const DIENTES_ADULTOS_INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const DIENTES_INFANTILES_SUP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const DIENTES_INFANTILES_INF = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const getTipoDiente = (num) => {
  const str = num.toString();
  const pos = parseInt(str[1]); 
  if ([1, 2].includes(pos)) return 'incisivo';
  if (pos === 3) return 'canino';
  if ([4, 5].includes(pos)) return 'premolar';
  if ([6, 7, 8].includes(pos)) return 'molar';
  if ([5].includes(pos)) return 'molar_infantil';
  return 'molar';
};

const HERRAMIENTAS = {
  Caries: { color: '#ef4444', stroke: '#b91c1c' },
  Resina: { color: '#3b82f6', stroke: '#1d4ed8' },
  Corona: { color: '#f59e0b', stroke: '#b45309' },
  Endodoncia: { color: '#8b5cf6', stroke: '#5b21b6' },
  Extraccion: { color: '#1f2937', stroke: '#ef4444' },
  Sano: { color: '#ffffff', stroke: '#94a3b8' }
};

const OdontogramaViewer = ({ snapshot, paciente, onClose }) => {
  const odontogramRef = useRef(null);

  const keys = Object.keys(snapshot.dientes || {});
  const isInfantil = keys.length > 0 && parseInt(keys[0]) >= 50;
  
  const listaSup = isInfantil ? DIENTES_INFANTILES_SUP : DIENTES_ADULTOS_SUP;
  const listaInf = isInfantil ? DIENTES_INFANTILES_INF : DIENTES_ADULTOS_INF;

  const exportarPDF = async () => {
    if (!odontogramRef.current) return;
    try {
      const canvas = await html2canvas(odontogramRef.current, {
        backgroundColor: '#e5e7eb',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      pdf.setFontSize(16);
      pdf.text(`Odontograma Clínico (Snapshot)`, 14, 15);
      pdf.setFontSize(10);
      pdf.text(`Paciente: ${paciente?.nombre} ${paciente?.apellidos || ''}`, 14, 22);
      pdf.text(`Atendido por: Dr(a). ${snapshot.medico_nombre || 'N/A'}`, 14, 27);
      pdf.text(`Fecha del registro: ${new Date(snapshot.fecha_registro).toLocaleString()}`, 14, 32);
      
      const imgWidth = pdfWidth - 28;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 14, 40, imgWidth, imgHeight);
      
      if (snapshot.observaciones) {
        pdf.setFontSize(11);
        pdf.text("Notas / Plan de Tratamiento:", 14, 40 + imgHeight + 10);
        pdf.setFontSize(9);
        pdf.text(snapshot.observaciones, 14, 45 + imgHeight + 10, { maxWidth: imgWidth });
      }
      
      pdf.save(`Odontograma_${paciente?.nombre}_${new Date(snapshot.fecha_registro).getTime()}.pdf`);
      toast.success('PDF generado');
    } catch (err) {
      toast.error('Error al generar PDF');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-5xl w-full max-h-[95vh] flex flex-col">
        
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">Odontograma Histórico</h2>
            <p className="text-xs text-gray-400">
              {new Date(snapshot.fecha_registro).toLocaleString('es-SV')} | Dr(a). {snapshot.medico_nombre}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarPDF}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"
            >
              <Download size={16} /> PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div 
            ref={odontogramRef}
            className="bg-gray-200 rounded-2xl shadow-inner border-4 border-gray-300 p-4 overflow-x-auto"
          >
            <div className="min-w-[900px] flex flex-col items-center bg-gray-200">
              <div className="mb-6 w-full">
                <div className="text-center text-gray-500 font-bold text-[10px] mb-1 uppercase tracking-widest">Maxilar Superior</div>
                <RenderFilaDientes lista={listaSup} dientes={snapshot.dientes || {}} />
              </div>
              <div className="w-full">
                <RenderFilaDientes lista={listaInf} dientes={snapshot.dientes || {}} invertido={true} />
                <div className="text-center text-gray-500 font-bold text-[10px] mt-1 uppercase tracking-widest">Maxilar Inferior</div>
              </div>
            </div>
          </div>
          
          {snapshot.observaciones && (
            <div className="mt-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm font-bold text-gray-300 mb-1">Notas / Plan:</h3>
              <p className="text-sm text-gray-400 whitespace-pre-wrap">{snapshot.observaciones}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RenderFilaDientes = ({ lista, dientes, invertido = false }) => (
  <div className="flex flex-nowrap justify-center gap-[2px] w-full">
    {lista.map((num, idx) => {
      const isMidline = idx === 7;
      return (
        <React.Fragment key={num}>
          <DienteSVG num={num} estado={dientes[num] || {}} invertido={invertido} />
          {isMidline && <div className="w-[2px] bg-gray-400 mx-1"></div>}
        </React.Fragment>
      );
    })}
  </div>
);

const DienteSVG = ({ num, estado, invertido }) => {
  const isAusente = estado.estado_general === 'ausente';
  const tipo = estado.tipoVisual === 'infantil' ? 'infantil' : getTipoDiente(num);
  const esDerecha = (num >= 11 && num <= 18) || (num >= 41 && num <= 48) || (num >= 51 && num <= 55) || (num >= 81 && num <= 85);
  
  const getColor = (zona) => {
    if (isAusente) return 'transparent';
    if (zona === 'raiz') return '#fef3c7'; 
    return HERRAMIENTAS[estado.caras?.[zona] || 'Sano']?.color || '#ffffff';
  };

  const getStroke = (zona) => {
    if (isAusente) return '#ef4444'; 
    if (zona === 'raiz') return '#d97706';
    return HERRAMIENTAS[estado.caras?.[zona] || 'Sano']?.stroke || '#94a3b8';
  };

  const renderCorona = () => {
    let pathTop = "20,20 80,20 60,50 40,50";
    let pathBottom = "40,70 60,70 80,100 20,100";
    let pathLeft = esDerecha ? "20,20 40,50 40,70 20,100" : "80,20 60,50 60,70 80,100";
    let pathRight = esDerecha ? "80,20 60,50 60,70 80,100" : "20,20 40,50 40,70 20,100";
    let pathCenter = "40,50 60,50 60,70 40,70";

    if (tipo === 'incisivo') {
      pathTop = "25,15 75,15 65,50 35,50";
      pathBottom = "35,70 65,70 75,105 25,105";
    } else if (tipo === 'canino') {
      pathTop = "35,10 65,10 60,50 40,50";
    } else if (tipo === 'premolar' || tipo === 'molar_infantil') {
      pathTop = "25,20 75,20 65,50 35,50";
    }

    return (
      <g>
        <polygon points={pathTop} fill={getColor('Vestibular')} stroke={getStroke('Vestibular')} strokeWidth="1.5" />
        <polygon points={pathBottom} fill={getColor('Lingual')} stroke={getStroke('Lingual')} strokeWidth="1.5" />
        <polygon points={pathLeft} fill={getColor('Mesial')} stroke={getStroke('Mesial')} strokeWidth="1.5" />
        <polygon points={pathRight} fill={getColor('Distal')} stroke={getStroke('Distal')} strokeWidth="1.5" />
        <polygon points={pathCenter} fill={getColor('Oclusal')} stroke={getStroke('Oclusal')} strokeWidth="1.5" />
      </g>
    );
  };

  const renderRaices = () => {
    const endodonciaActiva = estado.raiz?.endodoncia;
    const colorEndo = HERRAMIENTAS.Endodoncia.color;

    if (tipo === 'molar') {
      return (
        <>
          <path d="M 30,70 Q 20,120 35,130 Q 45,110 50,70 Z" fill={getColor('raiz')} stroke={getStroke('raiz')} strokeWidth="2" />
          <path d="M 70,70 Q 80,120 65,130 Q 55,110 50,70 Z" fill={getColor('raiz')} stroke={getStroke('raiz')} strokeWidth="2" />
          {endodonciaActiva && (
            <>
              <line x1="38" y1="75" x2="38" y2="115" stroke={colorEndo} strokeWidth="3" strokeLinecap="round" />
              <line x1="62" y1="75" x2="62" y2="115" stroke={colorEndo} strokeWidth="3" strokeLinecap="round" />
            </>
          )}
        </>
      );
    } else if (tipo === 'premolar' || tipo === 'molar_infantil') {
      return (
        <>
          <path d="M 30,70 Q 20,120 50,125 Q 80,120 70,70 Z" fill={getColor('raiz')} stroke={getStroke('raiz')} strokeWidth="2" />
          {endodonciaActiva && <line x1="50" y1="75" x2="50" y2="115" stroke={colorEndo} strokeWidth="3" strokeLinecap="round" />}
        </>
      );
    } else {
      return (
        <>
          <path d="M 35,70 Q 30,120 50,130 Q 70,120 65,70 Z" fill={getColor('raiz')} stroke={getStroke('raiz')} strokeWidth="2" />
          {endodonciaActiva && <line x1="50" y1="75" x2="50" y2="120" stroke={colorEndo} strokeWidth="4" strokeLinecap="round" />}
        </>
      );
    }
  };

  return (
    <div className={`relative flex flex-col items-center ${invertido ? 'flex-col-reverse' : ''}`}>
      <svg viewBox="0 0 100 140" className={`w-12 h-16 sm:w-14 sm:h-20 ${invertido ? 'rotate-180' : ''}`}>
        {renderRaices()}
        {renderCorona()}
        {isAusente && (
          <g>
            <rect x="0" y="0" width="100" height="140" fill="rgba(0,0,0,0.3)" />
            <line x1="20" y1="20" x2="80" y2="120" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
            <line x1="80" y1="20" x2="20" y2="120" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
          </g>
        )}
      </svg>
      <div className={`mt-1 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm ${isAusente ? 'bg-rose-600 text-white line-through' : 'bg-gray-800 text-gray-300'}`}>
        {num}
      </div>
    </div>
  );
};

export default OdontogramaViewer;