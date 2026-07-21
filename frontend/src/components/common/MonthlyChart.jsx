// frontend/src/components/common/KPICards.jsx
import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Building, Clock } from 'lucide-react';

// Mapeo de iconos ajustado a tus llaves y lógica de negocio
const iconMap = {
  'Ventas Mes': TrendingUp,
  'Cuentas Cobrar': DollarSign,
  'Organizaciones Activas': Building,
  'Organizaciones Inactivas': Clock,
  'Total Usuarios': Users,
  'Ingresos Membresias': DollarSign,
  'Gastos Infraestructura': TrendingDown,
};

// Configuración cromática: Colores muy vivos desde el inicio y ultra-saturados en Hover
const themeMap = {
  'Ventas Mes': {
    borderClass: 'border-emerald-500/20 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]',
    textGradient: 'from-emerald-400 to-teal-300 group-hover:from-emerald-300 group-hover:to-cyan-200',
    iconColor: 'text-emerald-400 group-hover:text-emerald-300',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-400',
    glow: 'from-emerald-500/5 group-hover:from-emerald-500/25'
  },
  'Cuentas Cobrar': {
    borderClass: 'border-amber-500/20 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]',
    textGradient: 'from-amber-400 to-orange-400 group-hover:from-amber-300 group-hover:to-yellow-200',
    iconColor: 'text-amber-400 group-hover:text-amber-300',
    iconBg: 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20 group-hover:border-amber-400',
    glow: 'from-amber-500/5 group-hover:from-amber-500/25'
  },
  'Organizaciones Activas': {
    borderClass: 'border-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.25)]',
    textGradient: 'from-cyan-400 to-blue-400 group-hover:from-cyan-300 group-hover:to-sky-200',
    iconColor: 'text-cyan-400 group-hover:text-cyan-300',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:border-cyan-400',
    glow: 'from-cyan-500/5 group-hover:from-cyan-500/25'
  },
  'Organizaciones Inactivas': {
    borderClass: 'border-rose-500/20 hover:border-rose-400 hover:shadow-[0_0_30px_rgba(244,63,94,0.25)]',
    textGradient: 'from-rose-400 to-pink-500 group-hover:from-rose-300 group-hover:to-red-300',
    iconColor: 'text-rose-400 group-hover:text-rose-300',
    iconBg: 'bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/20 group-hover:border-rose-400',
    glow: 'from-rose-500/5 group-hover:from-rose-500/25'
  },
  'Total Usuarios': {
    borderClass: 'border-violet-500/20 hover:border-violet-400 hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]',
    textGradient: 'from-violet-400 to-fuchsia-400 group-hover:from-violet-300 group-hover:to-purple-200',
    iconColor: 'text-violet-400 group-hover:text-violet-300',
    iconBg: 'bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/20 group-hover:border-violet-400',
    glow: 'from-violet-500/5 group-hover:from-violet-500/25'
  },
  'Ingresos Membresias': {
    borderClass: 'border-sky-500/20 hover:border-sky-400 hover:shadow-[0_0_30px_rgba(14,165,233,0.25)]',
    textGradient: 'from-sky-400 to-indigo-400 group-hover:from-sky-300 group-hover:to-teal-200',
    iconColor: 'text-sky-400 group-hover:text-sky-300',
    iconBg: 'bg-sky-500/10 border-sky-500/20 group-hover:bg-sky-500/20 group-hover:border-sky-400',
    glow: 'from-sky-500/5 group-hover:from-sky-500/25'
  },
  'Gastos Infraestructura': {
    borderClass: 'border-orange-500/20 hover:border-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.25)]',
    textGradient: 'from-orange-400 to-red-400 group-hover:from-orange-300 group-hover:to-yellow-300',
    iconColor: 'text-orange-400 group-hover:text-orange-300',
    iconBg: 'bg-orange-500/10 border-orange-500/20 group-hover:bg-orange-500/20 group-hover:border-orange-400',
    glow: 'from-orange-500/5 group-hover:from-orange-500/25'
  },
};

const KPICards = ({ kpis, title = 'Métricas Globales' }) => {
  if (!kpis) return null;

  const cards = Object.entries(kpis).map(([key, value]) => {
    const displayName = key
      .replace(/([A-Z])/g, ' $1') 
      .replace(/_/g, ' ')         
      .replace(/^./, str => str.toUpperCase())
      .trim();

    const Icon = iconMap[displayName] || DollarSign;
    const theme = themeMap[displayName] || {
      borderClass: 'border-slate-800 hover:border-slate-600',
      textGradient: 'from-white to-slate-300',
      iconColor: 'text-slate-400',
      iconBg: 'bg-slate-800 border-slate-700',
      glow: 'from-transparent'
    };

    let formattedValue = value;
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        formattedValue = value;
      } else {
        formattedValue = `$${value.toFixed(2)}`;
      }
    }

    return {
      title: displayName,
      value: formattedValue,
      icon: Icon,
      ...theme
    };
  });

  return (
    <div className="w-full my-6 font-sans">
      {/* Encabezado Bento */}
      <div className="flex items-center space-x-4 mb-6">
        <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          {title}
        </h3>
        <div className="h-[1px] flex-1 bg-slate-800/60" />
      </div>
      
      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {cards.map((card, index) => (
          <div
            key={index}
            style={{
              animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.05}s both`,
            }}
            className={`group relative overflow-hidden p-6 rounded-2xl border bg-[#0e131f]/90 ${card.borderClass} backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1.5`}
          >
            {/* Ambient Glow: Un sutil reflejo de color de fondo que se aviva un 500% en Hover */}
            <div className={`absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br ${card.glow} blur-2xl pointer-events-none rounded-full transition-all duration-500 ease-out`} />

            <div className="flex flex-col justify-between h-full space-y-5 relative z-10">
              
              {/* Top: Título de la métrica e Icono con color nativo */}
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase opacity-90 group-hover:text-slate-200 transition-colors duration-300">
                  {card.title}
                </p>
                
                {/* Caja contenedora del icono con bordes que combinan */}
                <div className={`${card.iconBg} border p-2.5 rounded-xl transition-all duration-300 shadow-md flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor} transition-all duration-300 group-hover:scale-110 group-hover:rotate-[6deg]`} strokeWidth={2.5} />
                </div>
              </div>

              {/* Bottom: El número principal destaca con su color específico desde el inicio */}
              <div>
                <p className={`text-2xl font-black tracking-tight bg-gradient-to-b ${card.textGradient} bg-clip-text text-transparent font-mono select-none transition-all duration-300`}>
                  {card.value}
                </p>
              </div>

            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default KPICards;