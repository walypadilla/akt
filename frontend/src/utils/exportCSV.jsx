
// src/utils/exportCSV.js
export const downloadCSV = (data, filename = 'export.csv') => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(field => {
        let val = row[field] === null || row[field] === undefined ? '' : row[field];
        // Escapar comillas y envolver campos que contengan coma o salto
        if (typeof val === 'string' && (val.includes(',') || val.includes('\n') || val.includes('"'))) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};