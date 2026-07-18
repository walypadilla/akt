import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, FileText } from 'lucide-react';

const KPICards = ({ kpis }) => {
  if (!kpis) return null;

  const cards = [
    { title: 'Ingresos Totales', value: `$${kpis.totalIngresos.toFixed(2)}`, icon: TrendingUp, color: 'text-green-600' },
    { title: 'Gastos Totales', value: `$${kpis.totalGastos.toFixed(2)}`, icon: TrendingDown, color: 'text-red-600' },
    { title: 'Cuentas por Cobrar', value: `$${kpis.totalCxC.toFixed(2)}`, icon: DollarSign, color: 'text-yellow-600' },
    { title: 'Clientes', value: kpis.totalClientes, icon: Users, color: 'text-blue-600' },
    { title: 'Facturas Emitidas', value: kpis.totalFacturas, icon: FileText, color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-xl font-bold">{card.value}</p>
            </div>
            <card.icon className={`w-8 h-8 ${card.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPICards;