// backend/src/controllers/clinica/citaController.js
const Cita = require('../../models/Cita');
const Paciente = require('../../models/Paciente');
const Medico = require('../../models/Medico');
const { verificarLimite, incrementarConsumo } = require('../../helpers/consumoHelper');
const { enviarWhatsApp } = require('../../helpers/whatsappHelper');

exports.crearCita = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };
    const citaId = await Cita.create(data);

    // Obtener datos del paciente y médico para el mensaje
    const paciente = await Paciente.findById(data.paciente_id, organizacion_id);
    const medico = await Medico.findById(data.medico_id, organizacion_id);
    const cliente = await Cliente.findById(paciente.cliente_id, organizacion_id);

    // Enviar confirmación por WhatsApp si está activado y tiene créditos
    if (cliente.telefono_whatsapp) {
      const limiteCheck = await verificarLimite(organizacion_id, 'whatsapp');
      if (limiteCheck.allowed) {
        const mensaje = `Hola ${cliente.nombre}, su cita para ${paciente.nombre} ha sido agendada para el ${new Date(data.fecha_hora).toLocaleString()}.`;
        await enviarWhatsApp(cliente.telefono_whatsapp, mensaje);
        await incrementarConsumo(organizacion_id, 'whatsapp');
      }
    }

    res.status(201).json({ message: 'Cita creada', id: citaId });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear cita', error: error.message });
  }
};