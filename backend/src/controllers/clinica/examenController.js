const Examen = require('../../models/Examen');
const SolicitudExamen = require('../../models/SolicitudExamen');
const Medico = require('../../models/Medico');
const { verificarLimite, incrementarConsumo } = require('../../helpers/consumoHelper');
const { enviarWhatsApp } = require('../../helpers/whatsappHelper');
const { pool } = require('../../config/db');

// ========== CATÁLOGO DE EXÁMENES ==========
exports.listarCatalogos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { activo } = req.query;
    const soloActivos = activo !== 'false';
    const examenes = await Examen.findAll(organizacion_id, soloActivos);
    res.json(examenes);
  } catch (error) {
    console.error('Error al listar exámenes:', error);
    res.status(500).json({ message: 'Error al listar exámenes' });
  }
};

exports.crearCatalogo = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };
    const id = await Examen.create(data);
    res.status(201).json({ message: 'Examen creado', id });
  } catch (error) {
    console.error('Error al crear examen:', error);
    res.status(500).json({ message: 'Error al crear examen' });
  }
};

exports.actualizarCatalogo = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;
    const examen = await Examen.findById(id, organizacion_id);
    if (!examen) {
      return res.status(404).json({ message: 'Examen no encontrado' });
    }
    await Examen.update(id, organizacion_id, data);
    res.json({ message: 'Examen actualizado' });
  } catch (error) {
    console.error('Error al actualizar examen:', error);
    res.status(500).json({ message: 'Error al actualizar examen' });
  }
};

exports.eliminarCatalogo = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Examen.delete(id, organizacion_id);
    res.json({ message: 'Examen desactivado' });
  } catch (error) {
    console.error('Error al eliminar examen:', error);
    res.status(500).json({ message: 'Error al eliminar examen' });
  }
};

// ========== SOLICITUDES DE EXÁMENES ==========
exports.solicitar = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { consulta_id, examen_id, paciente_id } = req.body;

    // Verificar que exista el examen
    const examen = await Examen.findById(examen_id, organizacion_id);
    if (!examen) {
      return res.status(404).json({ message: 'Examen no encontrado' });
    }

    const id = await SolicitudExamen.create({
      organizacion_id,
      consulta_id,
      examen_id,
      paciente_id
    });

    res.status(201).json({ message: 'Examen solicitado', id });
  } catch (error) {
    console.error('Error al solicitar examen:', error);
    res.status(500).json({ message: 'Error al solicitar examen' });
  }
};

exports.completar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { resultado_texto, resultado_archivo_url } = req.body;

    const solicitud = await SolicitudExamen.findById(id, organizacion_id);
    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    const updated = await SolicitudExamen.completar(id, organizacion_id, {
      resultado_texto,
      resultado_archivo_url
    });

    if (!updated) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    // Enviar notificación por WhatsApp si está activado
    try {
      const [org] = await pool.query(
        'SELECT whatsapp_activado FROM organizaciones WHERE id = ?',
        [organizacion_id]
      );
      if (org[0]?.whatsapp_activado) {
        // Obtener datos del paciente para notificar
        const [paciente] = await pool.query(
          `SELECT cl.telefono_whatsapp, cl.nombre AS cliente_nombre, p.nombre AS paciente_nombre
           FROM solicitudes_examen s
           JOIN pacientes p ON s.paciente_id = p.id
           JOIN clientes cl ON p.cliente_id = cl.id
           WHERE s.id = ? AND s.organizacion_id = ?`,
          [id, organizacion_id]
        );
        if (paciente.length > 0 && paciente[0].telefono_whatsapp) {
          const limiteCheck = await verificarLimite(organizacion_id, 'whatsapp');
          if (limiteCheck.allowed) {
            const mensaje = `Hola ${paciente[0].cliente_nombre}, el resultado del examen "${solicitud.examen_nombre}" para ${paciente[0].paciente_nombre} ya está disponible.`;
            await enviarWhatsApp(paciente[0].telefono_whatsapp, mensaje, organizacion_id, 'Examen_Listo', id);
            await incrementarConsumo(organizacion_id, 'whatsapp');
          }
        }
      }
    } catch (notifError) {
      console.error('Error al enviar notificación de examen:', notifError);
      // No detenemos el flujo
    }

    res.json({ message: 'Examen completado' });
  } catch (error) {
    console.error('Error al completar examen:', error);
    res.status(500).json({ message: 'Error al completar examen' });
  }
};

exports.cancelar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const updated = await SolicitudExamen.cancelar(id, organizacion_id);
    if (!updated) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    res.json({ message: 'Solicitud cancelada' });
  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({ message: 'Error al cancelar solicitud' });
  }
};

exports.listarSolicitudes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { paciente_id, estado, consulta_id } = req.query;
    const solicitudes = await SolicitudExamen.findAll(organizacion_id, {
      paciente_id,
      estado,
      consulta_id
    });
    res.json(solicitudes);
  } catch (error) {
    console.error('Error al listar solicitudes:', error);
    res.status(500).json({ message: 'Error al listar solicitudes' });
  }
};

exports.getPendientes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const pendientes = await SolicitudExamen.getPendientes(organizacion_id);
    res.json(pendientes);
  } catch (error) {
    console.error('Error al obtener exámenes pendientes:', error);
    res.status(500).json({ message: 'Error al obtener exámenes pendientes' });
  }
};