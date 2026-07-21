// backend/src/controllers/catalogoController.js
const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio');
const ActividadEconomica = require('../models/ActividadEconomica');
const { pool } = require('../config/db');

exports.obtenerDepartamentos = async (req, res) => {
  try {
    const departamentos = await Departamento.findAll();
    res.json(departamentos);
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ message: 'Error al obtener departamentos', error: error.message });
  }
};

exports.obtenerMunicipios = async (req, res) => {
  try {
    const { id_departamento } = req.params;
    const municipios = await Municipio.findByDepartamento(id_departamento);
    res.json(municipios);
  } catch (error) {
    console.error('Error al obtener municipios:', error);
    res.status(500).json({ message: 'Error al obtener municipios', error: error.message });
  }
};

exports.obtenerActividades = async (req, res) => {
  try {
    const actividades = await ActividadEconomica.findAll();
    res.json(actividades);
  } catch (error) {
    console.error('Error al obtener actividades económicas:', error);
    res.status(500).json({ message: 'Error al obtener actividades', error: error.message });
  }
};

exports.obtenerDepartamentoPorId = async (req, res) => {
  try {
    const { id_departamento } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM departamentos WHERE id_departamento = ?',
      [id_departamento]
    );
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

exports.obtenerMunicipioPorId = async (req, res) => {
  try {
    const { id_departamento, id_municipio } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM municipios WHERE id_departamento = ? AND id_municipio = ?',
      [id_departamento, id_municipio]
    );
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

exports.obtenerActividadPorCodigo = async (req, res) => {
  try {
    const { codigo_giro } = req.params;
    const actividad = await ActividadEconomica.findByCodigo(codigo_giro);
    res.json(actividad || null);
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};