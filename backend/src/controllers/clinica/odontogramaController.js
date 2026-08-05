const { pool } = require('../../config/db');
const Medico = require('../../models/Medico');

exports.obtener = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const organizacion_id = req.organizacion_id;

    const [rows] = await pool.query(
      `SELECT * FROM odontogramas
       WHERE paciente_id = ? AND organizacion_id = ?
       ORDER BY fecha_registro DESC`,
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

    // Obtener médico asociado al usuario
    const medico = await Medico.findByUsuarioId(req.user.id, organizacion_id);
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