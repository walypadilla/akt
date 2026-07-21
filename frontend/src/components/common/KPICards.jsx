// frontend/src/components/common/KPICards.jsx
import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building,
  Clock,
  CreditCard,
  Wallet,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// Mapeo de iconos según el nombre de la métrica
const iconMap = {
  'Ventas Periodo': TrendingUp,
  'Ventas Mes': TrendingUp,
  'Variacion Mes': TrendingUp,
  'Cuentas Cobrar': DollarSign,
  'Organizaciones Activas': Building,
  'Organizaciones Inactivas': Clock,
  'Total Usuarios': Users,
  'Ingresos Membresias': CreditCard,
  'Ingresos Mes': Wallet,
  'Variacion Ingresos': TrendingUp,
  'Gastos Infraestructura': TrendingDown,
};

// Colores según la métrica
const themeMap = {
  'Ventas Periodo': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-emerald-500/50 hover:bg-[#1f2937]',
    textColor: 'text-emerald-400',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconHover: 'group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]',
  },
  'Ventas Mes': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-emerald-500/50 hover:bg-[#1f2937]',
    textColor: 'text-emerald-400',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconHover: 'group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]',
  },
  'Variacion Mes': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-amber-500/50 hover:bg-[#1f2937]',
    textColor: 'text-amber-400',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconHover: 'group-hover:bg-amber-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]',
  },
  'Cuentas Cobrar': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-amber-500/50 hover:bg-[#1f2937]',
    textColor: 'text-amber-400',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconHover: 'group-hover:bg-amber-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]',
  },
  'Organizaciones Activas': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-cyan-500/50 hover:bg-[#1f2937]',
    textColor: 'text-cyan-400',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    iconHover: 'group-hover:bg-cyan-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]',
  },
  'Organizaciones Inactivas': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-pink-500/50 hover:bg-[#1f2937]',
    textColor: 'text-pink-400',
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10 border-pink-500/20',
    iconHover: 'group-hover:bg-pink-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(236,72,153,0.4)]',
  },
  'Total Usuarios': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-purple-500/50 hover:bg-[#1f2937]',
    textColor: 'text-purple-400',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconHover: 'group-hover:bg-purple-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]',
  },
  'Ingresos Membresias': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-cyan-500/50 hover:bg-[#1f2937]',
    textColor: 'text-cyan-400',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    iconHover: 'group-hover:bg-cyan-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]',
  },
  'Ingresos Mes': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-cyan-500/50 hover:bg-[#1f2937]',
    textColor: 'text-cyan-400',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    iconHover: 'group-hover:bg-cyan-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]',
  },
  'Variacion Ingresos': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-emerald-500/50 hover:bg-[#1f2937]',
    textColor: 'text-emerald-400',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconHover: 'group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]',
  },
  'Gastos Infraestructura': {
    bg: 'bg-[#111827] border-[#1e293b] hover:border-rose-500/50 hover:bg-[#1f2937]',
    textColor: 'text-rose-400',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconHover: 'group-hover:bg-rose-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]',
  },
};

const KPICards = ({ kpis, title = 'Métricas Globales', periodoInfo = null }) => {
  if (!kpis) return null;

  const cards = Object.entries(kpis).map(([key, value]) => {
    const displayName = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    const Icon = iconMap[displayName] || DollarSign;
    const theme = themeMap[displayName] || {
      bg: 'bg-[#111827] border-[#1e293b] hover:bg-[#1f2937]',
      textColor: 'text-slate-200',
      iconColor: 'text-slate-400',
      iconBg: 'bg-slate-800/50 border-slate-700',
      iconHover: 'group-hover:bg-slate-700 group-hover:text-white',
    };

    let formattedValue = value;
    let isVariation = displayName.includes('Variacion');
    let variationValue = 0;
    let isPositive = true;

    if (typeof value === 'number') {
      if (isVariation) {
        variationValue = value;
        isPositive = variationValue >= 0;
        formattedValue = `${isPositive ? '+' : ''}${variationValue.toFixed(1)}%`;
      } else if (Number.isInteger(value)) {
        formattedValue = value;
      } else {
        formattedValue = `$${value.toFixed(2)}`;
      }
    }

    return {
      title: displayName,
      value: formattedValue,
      icon: Icon,
      isVariation,
      variationValue,
      isPositive,
      ...theme,
    };
  });

  return (
    <div className="w-full my-6 font-sans">
      {periodoInfo?.label && (
        <div className="flex items-center space-x-4 mb-6">
          <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            {periodoInfo.tipo === 'mes' ? 'Mes Actual' : periodoInfo.tipo === 'trimestre' ? 'Trimestre' : periodoInfo.tipo === '6meses' ? '6 Meses' : 'Año'} - {periodoInfo.label}
          </h3>
          <div className="h-[1px] flex-1 bg-[#1e293b]" />
        </div>
      )}
      {!periodoInfo?.label && (
        <div className="flex items-center space-x-4 mb-6">
          <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">{title}</h3>
          <div className="h-[1px] flex-1 bg-[#1e293b]" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            style={{
              animation: `fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.04}s both`,
            }}
            className={`${card.bg} group relative overflow-hidden p-5 rounded-2xl border transition-all duration-200 ease-out cursor-pointer select-none`}
          >
            <div className="flex flex-col justify-between h-full space-y-4 relative z-10">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase opacity-90 group-hover:text-slate-200 transition-colors leading-tight block max-w-[70%]">
                  {card.title}
                </p>
                <div
                  className={`${card.iconBg} border p-2.5 rounded-xl transition-all duration-200 ease-out ${card.iconHover} shrink-0`}
                >
                  <card.icon className={`w-4 h-4 ${card.iconColor} transition-all duration-200`} strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-3xl font-bold tracking-tight ${card.textColor} font-mono`}>
                  {card.value}
                </p>
                {card.isVariation && (
                  <span className={`flex items-center text-sm font-bold ${card.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {card.isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
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