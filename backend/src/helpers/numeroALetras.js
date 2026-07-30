// backend/src/utils/numeroALetras.js

function numeroALetras(num) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (num === 0) return 'CERO';

  const numStr = num.toFixed(2);
  const partes = numStr.split('.');
  const entero = parseInt(partes[0]);
  const decimal = parseInt(partes[1]);

  let resultado = '';

  // Miles
  const miles = Math.floor(entero / 1000);
  const resto = entero % 1000;
  if (miles > 0) {
    resultado += (miles === 1 ? 'MIL' : numeroALetras(miles) + ' MIL');
    if (resto > 0) resultado += ' ';
  }

  // Centenas, decenas, unidades
  if (resto > 0) {
    const c = Math.floor(resto / 100);
    const d = Math.floor((resto % 100) / 10);
    const u = resto % 10;

    if (c > 0) {
      if (c === 1 && resto % 100 === 0) resultado += 'CIEN';
      else resultado += centenas[c];
      if (resto % 100 > 0) resultado += ' ';
    }

    if (d > 0) {
      if (d === 1 && u > 0) {
        resultado += especiales[u];
      } else {
        if (d === 2 && u > 0) {
          resultado += 'VEINTI' + unidades[u];
        } else {
          resultado += decenas[d - 1];
          if (u > 0) resultado += ' Y ' + unidades[u];
        }
      }
    } else if (u > 0) {
      resultado += unidades[u];
    }
  }

  resultado += ` CON ${decimal.toString().padStart(2, '0')}/100`;
  return resultado;
}

module.exports = {numeroALetras}