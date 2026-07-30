// backend/src/helpers/formatTelefono.js
function formatearTelefono(numero) {
  if (!numero) return null;
  // Eliminar espacios, guiones, puntos y cualquier carácter no numérico
  let limpio = numero.replace(/\D/g, '');
  if (limpio.length === 0) return null;
  
  // Si tiene exactamente 8 dígitos, asumimos que es de El Salvador (sin código de país)
  if (limpio.length === 8) {
    return `+503${limpio}`;
  }
  // Si tiene 10 dígitos y empieza con 503, ya tiene código, solo agregamos el +
  if (limpio.length === 10 && limpio.startsWith('503')) {
    return `+${limpio}`;
  }
  // Si tiene 11 dígitos y empieza con 503 (con el cero inicial), lo corregimos
  if (limpio.length === 11 && limpio.startsWith('503')) {
    return `+${limpio}`;
  }
  // Si ya tiene el símbolo +, lo devolvemos tal cual
  if (numero.startsWith('+')) {
    return numero;
  }
  // En cualquier otro caso, asumimos que es un número válido y le agregamos +
  return `+${limpio}`;
}

module.exports = { formatearTelefono };