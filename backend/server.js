// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./src/routes');
const publicRoutes = require('./src/routes/publicRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (logos, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', routes);
app.use('/api/publico', publicRoutes);

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});