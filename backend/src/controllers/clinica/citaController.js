const Cita = require('../../models/Cita');
const Paciente = require('../../models/Paciente');
const Medico = require('../../models/Medico');
const Cliente = require('../../models/Cliente');
const { verificarLimite, incrementarConsumo } = require('../../helpers/consumoHelper');
const { enviarWhatsApp } = require('../../helpers/whatsappHelper');

exports.listar = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { estado, medico_id, fecha_inicio, fecha_fin, paciente_id } = req.query;
    const citas = await Cita.findAll(organizacion_id, {
      estado, medico_id, fecha_inicio, fecha_fin, paciente_id
    });
    res.json(citas);
  } catch (error) {
    console.error('Error al listar citas:', error);
    res.status(500).json({ message: 'Error al listar citas' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const cita = await Cita.findById(id, organizacion_id);
    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    res.json(cita);
  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({ message: 'Error al obtener cita' });
  }
};

exports.crear = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };

    // Validar que el paciente exista
    const paciente = await Paciente.findById(data.paciente_id, organizacion_id);
    if (!paciente) {
      return res.status(400).json({ message: 'Paciente no encontrado' });
    }

    // Validar que el médico exista
    const medico = await Medico.findById(data.medico_id, organizacion_id);
    if (!medico) {
      return res.status(400).json({ message: 'Médico no encontrado' });
    }

    const citaId = await Cita.create(data);

    // Enviar confirmación por WhatsApp si está activado y tiene créditos
    const cliente = await Cliente.findById(paciente.cliente_id, organizacion_id);
    if (cliente && cliente.telefono_whatsapp) {
      // Verificar si la organización tiene WhatsApp activado
      const [org] = await pool.query(
        'SELECT whatsapp_activado FROM organizaciones WHERE id = ?',
        [organizacion_id]
      );
      if (org[0]?.whatsapp_activado) {
        const limiteCheck = await verificarLimite(organizacion_id, 'whatsapp');
        if (limiteCheck.allowed) {
          const fechaFormateada = new Date(data.fecha_hora).toLocaleString('es-SV');
          const mensaje = `Hola ${cliente.nombre}, su cita para ${paciente.nombre} ha sido agendada para el ${fechaFormateada}.`;
          await enviarWhatsApp(cliente.telefono_whatsapp, mensaje);
          await incrementarConsumo(organizacion_id, 'whatsapp');
        }
      }
    }

    res.status(201).json({ message: 'Cita creada', id: citaId });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({ message: 'Error al crear cita' });
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const organizacion_id = req.organizacion_id;

    const cita = await Cita.findById(id, organizacion_id);
    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    await Cita.updateStatus(id, organizacion_id, estado);
    res.json({ message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ message: 'Error al cambiar estado' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;

    const cita = await Cita.findById(id, organizacion_id);
    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    await Cita.update(id, organizacion_id, data);
    res.json({ message: 'Cita actualizada' });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({ message: 'Error al actualizar cita' });
  }
};