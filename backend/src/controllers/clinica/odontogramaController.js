// backend/src/controllers/clinica/odontogramaController.js
const { pool } = require('../../config/db');
const Medico = require('../../models/Medico');

exports.obtener = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const organizacion_id = req.organizacion_id;

    const [rows] = await pool.query(
      `SELECT o.*, u.nombre AS medico_nombre
       FROM odontogramas o
       LEFT JOIN medicos m ON o.medico_id = m.id
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       WHERE o.paciente_id = ? AND o.organizacion_id = ?
       ORDER BY o.fecha_registro DESC`,
      [paciente_id, organizacion_id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener odontogramas:', error);
    res.status(500).json({ message: 'Error al obtener odontogramas' });
  }
};

exports.guardar = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { paciente_id, dientes, observaciones } = req.body;
    const usuario_id = req.usuario_id; // CORREGIDO AQUÍ

    // Obtener médico asociado al usuario
    const medico = await Medico.findByUsuarioId(usuario_id, organizacion_id);
    if (!medico) {
      return res.status(400).json({ message: 'El usuario no está registrado como médico' });
    }

    const [result] = await pool.query(
      `INSERT INTO odontogramas
       (organizacion_id, paciente_id, dientes, observaciones, medico_id)
       VALUES (?, ?, ?, ?, ?)`,
      [organizacion_id, paciente_id, JSON.stringify(dientes), observaciones || null, medico.id]
    );

    res.status(201).json({ message: 'Odontograma guardado', id: result.insertId });
  } catch (error) {
    console.error('Error al guardar odontograma:', error);
    res.status(500).json({ message: 'Error al guardar odontograma' });
  }
};