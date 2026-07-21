import React from 'react';

const DataTable = ({ 
  columns, 
  data, 
  actions, 
  title,
  emptyMessage = 'No hay datos disponibles' 
}) => {
  return (
    <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              {actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-8 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-700/50 transition">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {col.render ? col.render(item[col.key], item) : item[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      {actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => action.onClick(item)}
                          className={`${action.className || 'text-cyan-400 hover:text-cyan-300'} transition`}
                          title={action.label}
                        >
                          {action.icon}
                        </button>
                      ))}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;