const { randomUUID } = require('crypto');

function generarUUID() {
  return randomUUID().toUpperCase();
}

module.exports = { generarUUID };