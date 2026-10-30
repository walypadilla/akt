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
    // Limpiamos valores vacíos
    const data = { ...req.body, organizacion_id };
    if (data.paciente_id === '') data.paciente_id = null;
    if (data.medico_id === '') data.medico_id = null;
    if (data.cliente_id === '') data.cliente_id = null;

    // Validar fecha pasada
    const fechaCita = new Date(data.fecha_hora);
    const ahora = new Date();
    if (fechaCita < new Date(ahora.getTime() - 5 * 60000)) {
      return res.status(400).json({ message: 'No se puede agendar una cita en una fecha u hora pasada.' });
    }

    const { pool } = require('../../config/db');
    const [orgRows] = await pool.query(
      'SELECT tipo_organizacion FROM organizaciones WHERE id = ?', [organizacion_id]
    );
    const isClinica = orgRows[0].tipo_organizacion.includes('Clinica');

    if (isClinica) {
      if (!data.paciente_id || !data.medico_id) {
        return res.status(400).json({ message: 'Paciente y médico son requeridos para clínicas.' });
      }
      const conflictos = await Cita.checkConflicto(
        organizacion_id, data.medico_id, data.paciente_id, data.fecha_hora, data.duracion_minutos
      );
      if (conflictos.length > 0) {
        const choqueMedico = conflictos.find(c => c.medico_id === Number(data.medico_id));
        const choquePaciente = conflictos.find(c => c.paciente_id === Number(data.paciente_id));
        if (choqueMedico) return res.status(400).json({ message: 'El médico ya tiene una cita en este horario.' });
        if (choquePaciente) return res.status(400).json({ message: 'El paciente ya tiene una cita en este horario.' });
      }
      // Asegurar que no se guarden datos de empresa
      data.cliente_id = null;
      data.titulo = null;
    } else {
      if (!data.cliente_id) {
        return res.status(400).json({ message: 'El cliente es requerido para empresas comerciales.' });
      }
      // Asegurar que no se guarden datos clínicos
      data.paciente_id = null;
      data.medico_id = null;
    }

    const citaId = await Cita.create(data);
    res.status(201).json({ message: 'Cita creada', id: citaId });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({ message: 'Error al crear cita' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body };

    // Limpiamos valores vacíos
    if (data.paciente_id === '') data.paciente_id = null;
    if (data.medico_id === '') data.medico_id = null;
    if (data.cliente_id === '') data.cliente_id = null;

    const cita = await Cita.findById(id, organizacion_id);
    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });

    if (data.fecha_hora && data.fecha_hora !== cita.fecha_hora) {
      const fechaCita = new Date(data.fecha_hora);
      const ahora = new Date();
      if (fechaCita < new Date(ahora.getTime() - 5 * 60000)) {
        return res.status(400).json({ message: 'No se puede agendar una cita en una fecha u hora pasada.' });
      }
    }

    const { pool } = require('../../config/db');
    const [orgRows] = await pool.query(
      'SELECT tipo_organizacion FROM organizaciones WHERE id = ?', [organizacion_id]
    );
    const isClinica = orgRows[0].tipo_organizacion.includes('Clinica');

    if (isClinica) {
      if (data.fecha_hora) {
        const conflictos = await Cita.checkConflicto(
          organizacion_id, 
          data.medico_id || cita.medico_id, 
          data.paciente_id || cita.paciente_id, 
          data.fecha_hora, 
          data.duracion_minutos || cita.duracion_minutos,
          id
        );
        if (conflictos.length > 0) {
          const choqueMedico = conflictos.find(c => c.medico_id === Number(data.medico_id || cita.medico_id));
          const choquePaciente = conflictos.find(c => c.paciente_id === Number(data.paciente_id || cita.paciente_id));
          if (choqueMedico) return res.status(400).json({ message: 'El médico ya tiene una cita en este horario.' });
          if (choquePaciente) return res.status(400).json({ message: 'El paciente ya tiene una cita en este horario.' });
        }
      }
      data.cliente_id = null;
      data.titulo = null; 
    } else {
      data.paciente_id = null;
      data.medico_id = null;
    }

    await Cita.update(id, organizacion_id, data);
    res.json({ message: 'Cita actualizada' });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({ message: 'Error al actualizar cita' });
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const organizacion_id = req.organizacion_id;

    const cita = await Cita.findById(id, organizacion_id);
    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });

    await Cita.updateStatus(id, organizacion_id, estado);
    res.json({ message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ message: 'Error al cambiar estado' });
  }
};

// Endpoint manual para enviar WhatsApp
exports.enviarWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const cita = await Cita.findById(id, organizacion_id);
    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });

    // Obtener datos de la organización (incluyendo el teléfono)
    const { pool } = require('../../config/db');
    const [orgRows] = await pool.query(
      'SELECT nombre_empresa, tipo_organizacion, telefono_whatsapp FROM organizaciones WHERE id = ?',
      [organizacion_id]
    );
    const org = orgRows[0];
    const isClinica = org.tipo_organizacion.includes('Clinica');

    let telefonoDestino = null;
    let mensaje = '';
    
    // Formatear fecha y hora
    const fechaObj = new Date(cita.fecha_hora);
    const fechaStr = fechaObj.toLocaleDateString('es-SV');
    const horaStr = fechaObj.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

    // Formatear teléfono de la organización para el mensaje (si existe)
    const telContacto = org.telefono_whatsapp ? ` al WhatsApp ${org.telefono_whatsapp}` : '';

    if (isClinica) {
      // LÓGICA PARA CLÍNICAS
      if (!cita.paciente_id) return res.status(400).json({ message: 'La cita no tiene un paciente asignado.' });
      
      const paciente = await Paciente.findById(cita.paciente_id, organizacion_id);
      const cliente = await Cliente.findById(paciente.cliente_id, organizacion_id);

      if (!cliente || !cliente.telefono_whatsapp) {
        return res.status(400).json({ message: 'El dueño del paciente no tiene un número de WhatsApp registrado.' });
      }

      telefonoDestino = cliente.telefono_whatsapp;
      mensaje = `Hola ${cliente.nombre}, le recordamos su cita en "${org.nombre_empresa}" para ${paciente.nombre} el día ${fechaStr} a las ${horaStr} con el Dr. ${cita.medico_nombre}. Cualquier consulta favor contactarnos${telContacto}. ¡Le esperamos!`;

    } else {
      // LÓGICA PARA EMPRESAS COMERCIALES
      if (!cita.cliente_id) return res.status(400).json({ message: 'La cita no tiene un cliente asignado.' });

      const cliente = await Cliente.findById(cita.cliente_id, organizacion_id);

      if (!cliente || !cliente.telefono_whatsapp) {
        return res.status(400).json({ message: 'El cliente no tiene un número de WhatsApp registrado.' });
      }

      telefonoDestino = cliente.telefono_whatsapp;
      const motivo = cita.titulo ? ` Motivo: ${cita.titulo}.` : '';
      
      mensaje = `Estimado(a) ${cliente.nombre}, le recordamos que tiene una cita en "${org.nombre_empresa}" para el día ${fechaStr} a las ${horaStr}.${motivo} Cualquier consulta favor contactarnos${telContacto}. ¡Le esperamos!`;
    }

    // Validar límite de la organización
    const limiteCheck = await verificarLimite(organizacion_id, 'whatsapp');
    if (!limiteCheck.allowed) {
      return res.status(403).json({ message: 'Límite de mensajes de WhatsApp alcanzado para este mes.' });
    }

    // Enviar el mensaje
    const result = await enviarWhatsApp(
      telefonoDestino, 
      mensaje, 
      organizacion_id, 
      'Recordatorio_Cita', 
      cita.id
    );

    if (result.success) {
      await incrementarConsumo(organizacion_id, 'whatsapp');
      res.json({ message: 'Mensaje enviado correctamente' });
    } else {
      res.status(500).json({ message: 'Error al enviar WhatsApp: ' + result.error });
    }
  } catch (error) {
    console.error('Error al enviar WhatsApp manual:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};