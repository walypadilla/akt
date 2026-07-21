// frontend/src/components/common/TopClientsTable.jsx
import React from 'react';

const TopClientsTable = ({ clients, title = 'Top 5 Clientes' }) => {
  if (!clients || clients.length === 0) {
    return <div className="p-5 text-slate-400 text-xs uppercase font-bold">No hay datos disponibles</div>;
  }

  const isOrganization = clients[0]?.nombre_empresa !== undefined;
  const nameKey = isOrganization ? 'nombre_empresa' : 'nombre';
  const valueKey = 'total_facturado';

  return (
    <div className="bg-[#111827] p-5 rounded-2xl border border-[#1e293b] shadow-xl">
      {/* Título con una separación limpia */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5 pl-1">
        {title}
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#1e293b]">
              {/* pl-4 le da aire al texto de la izquierda */}
              <th className="text-left pb-3 pl-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isOrganization ? 'Organización' : 'Cliente'}
              </th>
              {/* pr-4 le da aire al texto de la derecha */}
              <th className="text-right pb-3 pr-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Facturado
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((item) => {
              const valor = parseFloat(item[valueKey]) || 0;
              return (
                <tr 
                  key={item.id} 
                  className="border-b border-[#1e293b]/40 hover:bg-[#1f2937] transition-all duration-150 group"
                >
                  {/* Agregamos pl-4 a la celda del nombre y rounded-l para el efecto hover */}
                  <td className="py-3 pl-4 text-sm font-medium text-slate-300 group-hover:text-white transition-colors rounded-l-xl">
                    {item[nameKey]}
                  </td>
                  {/* Agregamos pr-4 a la celda del monto y rounded-r para cerrar el bloque del hover */}
                  <td className="text-right py-3 pr-4 text-sm font-bold font-mono text-purple-400 rounded-r-xl">
                    ${valor.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopClientsTable;