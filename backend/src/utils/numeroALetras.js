// backend/src/utils/numeroALetras.js

function numeroALetras(num) {
  const Unidades = (num) => {
    switch (num) {
      case 1: return 'UN'; case 2: return 'DOS'; case 3: return 'TRES';
      case 4: return 'CUATRO'; case 5: return 'CINCO'; case 6: return 'SEIS';
      case 7: return 'SIETE'; case 8: return 'OCHO'; case 9: return 'NUEVE';
    }
    return '';
  };

  const Decenas = (num) => {
    let decena = Math.floor(num / 10);
    let unidad = num - (decena * 10);
    switch (decena) {
      case 1:
        switch (unidad) {
          case 0: return 'DIEZ'; case 1: return 'ONCE'; case 2: return 'DOCE';
          case 3: return 'TRECE'; case 4: return 'CATORCE'; case 5: return 'QUINCE';
          default: return 'DIECI' + Unidades(unidad);
        }
      case 2:
        if (unidad === 0) return 'VEINTE';
        return 'VEINTI' + Unidades(unidad);
      case 3: return DecenasY('TREINTA', unidad);
      case 4: return DecenasY('CUARENTA', unidad);
      case 5: return DecenasY('CINCUENTA', unidad);
      case 6: return DecenasY('SESENTA', unidad);
      case 7: return DecenasY('SETENTA', unidad);
      case 8: return DecenasY('OCHENTA', unidad);
      case 9: return DecenasY('NOVENTA', unidad);
      case 0: return Unidades(unidad);
    }
  };

  const DecenasY = (strSin, numUnidad) => {
    if (numUnidad > 0) return strSin + ' Y ' + Unidades(numUnidad);
    return strSin;
  };

  const Centenas = (num) => {
    let centena = Math.floor(num / 100);
    let decena = num - (centena * 100);
    switch (centena) {
      case 1:
        if (decena > 0) return 'CIENTO ' + Decenas(decena);
        return 'CIEN';
      case 2: return 'DOSCIENTOS ' + Decenas(decena);
      case 3: return 'TRESCIENTOS ' + Decenas(decena);
      case 4: return 'CUATROCIENTOS ' + Decenas(decena);
      case 5: return 'QUINIENTOS ' + Decenas(decena);
      case 6: return 'SEISCIENTOS ' + Decenas(decena);
      case 7: return 'SETECIENTOS ' + Decenas(decena);
      case 8: return 'OCHOCIENTOS ' + Decenas(decena);
      case 9: return 'NOVECIENTOS ' + Decenas(decena);
      case 0: return Decenas(decena);
    }
  };

  const Seccion = (num, divisor, strSingular, strPlural) => {
    let cientos = Math.floor(num / divisor);
    let resto = num % divisor;
    let letras = '';
    if (cientos > 0) {
      if (cientos > 1) letras = Centenas(cientos) + ' ' + strPlural;
      else letras = strSingular;
    }
    if (resto > 0) letras += '';
    return letras;
  };

  const Miles = (num) => {
    let divisor = 1000;
    let cientos = Math.floor(num / divisor);
    let resto = num % divisor;
    let strMiles = Seccion(num, divisor, 'UN MIL', 'MIL');
    let strCentenas = Centenas(resto);
    if (strMiles === '') return strCentenas;
    return strMiles + ' ' + strCentenas;
  };

  let entero = Math.floor(num);
  if (entero === 0) return 'CERO';
  return Miles(entero).trim();
}

module.exports = numeroALetras;