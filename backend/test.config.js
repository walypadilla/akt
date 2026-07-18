// backend/test-env.js
require('dotenv').config();

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('PASSWORD_DB:', process.env.PASSWORD_DB ? '***' : 'undefined');
console.log('NAME_DB:', process.env.NAME_DB);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***' : 'undefined');
console.log('PORT:', process.env.PORT);