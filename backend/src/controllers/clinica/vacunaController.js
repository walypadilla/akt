const Vacuna = require('../../models/Vacuna');
const HistorialVacuna = require('../../models/HistorialVacuna');
const Medico = require('../../models/Medico');
const Paciente = require('../../models/Paciente');
const { verificarLimite, incrementarConsumo } = require('../../helpers/consumoHelper');
const { enviarWhatsApp } = require('../../helpers/whatsappHelper');
const { pool } = require('../../config/db');

// ========== CATÁLOGO DE VACUNAS ==========
exports.listarVacunas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const vacunas = await Vacuna.findAll(organizacion_id);
    res.json(vacunas);
  } catch (error) {
    console.error('Error al listar vacunas:', error);
    res.status(500).json({ message: 'Error al listar vacunas' });
  }
};

exports.crearVacuna = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };
    const id = await Vacuna.create(data);
    res.status(201).json({ message: 'Vacuna creada', id });
  } catch (error) {
    console.error('Error al crear vacuna:', error);
    res.status(500).json({ message: 'Error al crear vacuna' });
  }
};

exports.actualizarVacuna = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;
    const vacuna = await Vacuna.findById(id, organizacion_id);
    if (!vacuna) {
      return res.status(404).json({ message: 'Vacuna no encontrada' });
    }
    await Vacuna.update(id, organizacion_id, data);
    res.json({ message: 'Vacuna actualizada' });
  } catch (error) {
    console.error('Error al actualizar vacuna:', error);
    res.status(500).json({ message: 'Error al actualizar vacuna' });
  }
};

exports.eliminarVacuna = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Vacuna.delete(id, organizacion_id);
    res.json({ message: 'Vacuna desactivada' });
  } catch (error) {
    console.error('Error al eliminar vacuna:', error);
    res.status(500).json({ message: 'Error al eliminar vacuna' });
  }
};

// ========== HISTORIAL DE VACUNAS APLICADAS ==========
exports.listarHistorialPorPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const organizacion_id = req.organizacion_id;
    const historial = await HistorialVacuna.findByPaciente(paciente_id, organizacion_id);
    res.json(historial);
  } catch (error) {
    console.error('Error al listar historial de vacunas:', error);
    res.status(500).json({ message: 'Error al listar historial' });
  }
};

exports.aplicarVacuna = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const organizacion_id = req.organizacion_id;
    const usuario_id = req.user?.id || 1;
    const {
      paciente_id, vacuna_id, fecha_aplicacion,
      fecha_proxima, lote, observaciones
    } = req.body;

    // Validar paciente
    const paciente = await Paciente.findById(paciente_id, organizacion_id);
    if (!paciente) {
      await connection.rollback();
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    // Obtener médico asociado al usuario
    const medico = await Medico.findByUsuarioId(usuario_id, organizacion_id);
    if (!medico) {
      await connection.rollback();
      return res.status(400).json({ message: 'El usuario no está registrado como médico' });
    }

    // Validar vacuna
    const vacuna = await Vacuna.findById(vacuna_id, organizacion_id);
    if (!vacuna) {
      await connection.rollback();
      return res.status(404).json({ message: 'Vacuna no encontrada' });
    }

    // Calcular fecha próxima si no se envía
    let fechaProxima = fecha_proxima;
    if (!fechaProxima) {
      const fecha = new Date(fecha_aplicacion);
      fecha.setDate(fecha.getDate() + (vacuna.dias_recordatorio || 365));
      fechaProxima = fecha.toISOString().split('T')[0];
    }

    const historialId = await HistorialVacuna.create({
      organizacion_id,
      paciente_id,
      vacuna_id,
      fecha_aplicacion,
      fecha_proxima: fechaProxima,
      lote,
      observaciones,
      medico_id: medico.id
    });

    await connection.commit();

    // Enviar recordatorio por WhatsApp si está activado
    const cliente = await pool.query(
      'SELECT cl.telefono_whatsapp, cl.nombre FROM clientes cl WHERE cl.id = ?',
      [paciente.cliente_id]
    );
    if (cliente[0]?.length > 0 && cliente[0][0].telefono_whatsapp) {
      const [org] = await pool.query(
        'SELECT whatsapp_activado FROM organizaciones WHERE id = ?',
        [organizacion_id]
      );
      if (org[0]?.whatsapp_activado) {
        const limiteCheck = await verificarLimite(organizacion_id, 'whatsapp');
        if (limiteCheck.allowed) {
          const mensaje = `Hola ${cliente[0][0].nombre}, se aplicó la vacuna "${vacuna.nombre}" a ${paciente.nombre}. Próxima dosis: ${new Date(fechaProxima).toLocaleDateString('es-SV')}.`;
          await enviarWhatsApp(cliente[0][0].telefono_whatsapp, mensaje, organizacion_id, 'Vacuna_Recordatorio', historialId);
          await incrementarConsumo(organizacion_id, 'whatsapp');
        }
      }
    }

    res.status(201).json({ message: 'Vacuna aplicada', id: historialId });
  } catch (error) {
    await connection.rollback();
    console.error('Error al aplicar vacuna:', error);
    res.status(500).json({ message: 'Error al aplicar vacuna' });
  } finally {
    connection.release();
  }
};

exports.getProximasVacunas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { dias = 30 } = req.query;
    const proximas = await HistorialVacuna.getProximasVacunas(organizacion_id, parseInt(dias));
    res.json(proximas);
  } catch (error) {
    console.error('Error al obtener próximas vacunas:', error);
    res.status(500).json({ message: 'Error al obtener próximas vacunas' });
  }
};