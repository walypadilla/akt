import React from 'react';

const TopClientsTable = ({ clients }) => {
  if (!clients || clients.length === 0) {
    return <div className="p-4">No hay clientes con facturación</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Top 5 Clientes</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Cliente</th>
            <th className="text-right py-2">Total Facturado</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b">
              <td className="py-2">{client.nombre}</td>
              <td className="text-right py-2">${client.total_facturado.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TopClientsTable;