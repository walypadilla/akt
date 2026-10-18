const Examen = require('../../models/Examen');
const SolicitudExamen = require('../../models/SolicitudExamen');
const Medico = require('../../models/Medico');
const { verificarLimite, incrementarConsumo } = require('../../helpers/consumoHelper');
const { enviarWhatsApp } = require('../../helpers/whatsappHelper');
const { pool } = require('../../config/db');

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper compartido para generar PDF
async function generarPDFSolicitud(s, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=examen_${(s.examen_nombre || 'resultado').replace(/\s/g, '_')}.pdf`
    );
    res.send(pdfData);
  });

  const primaryColor = '#1a1a2e';
  const textColor = '#333333';

  let alturaLogo = 40;
  if (s.logo_url) {
    const logoPath = path.join(__dirname, '../..', s.logo_url);
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { fit: [120, 60] });
      alturaLogo = 105;
    }
  }

  doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor);
  doc.text('RESULTADO DE EXAMEN', 350, 40, { width: 205, align: 'right' });
  doc.fontSize(10).fillColor('#666666');
  const fechaEmision = s.fecha_resultado
    ? new Date(s.fecha_resultado).toLocaleDateString('es-SV')
    : new Date().toLocaleDateString('es-SV');
  doc.text(`Fecha: ${fechaEmision}`, 350, 65, { width: 205, align: 'right' });

  doc.moveDown(2);
  const emisorTop = Math.max(doc.y + 25, alturaLogo, 115);
  doc.y = emisorTop;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
  doc.text('LABORATORIO / CLÍNICA', 40, emisorTop);
  doc.font('Helvetica').fontSize(9).fillColor('#555555');
  doc.text(s.nombre_empresa || 'Clínica', 40, doc.y);
  if (s.nit) doc.text(`NIT: ${s.nit}`, 40, doc.y);
  if (s.nrc) doc.text(`NRC: ${s.nrc}`, 40, doc.y);
  if (s.direccion) doc.text(s.direccion, 40, doc.y);
  if (s.telefono) doc.text(`Tel: ${s.telefono}`, 40, doc.y);
  if (s.correo_contacto) doc.text(`Email: ${s.correo_contacto}`, 40, doc.y);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
  doc.text('PACIENTE', 300, emisorTop);
  doc.font('Helvetica').fontSize(9).fillColor('#555555');
  doc.text(`${s.paciente_nombre || ''} ${s.paciente_apellidos || ''}`, 300, doc.y);
  if (s.paciente_codigo) doc.text(`Expediente: ${s.paciente_codigo}`, 300, doc.y);
  if (s.paciente_fecha_nacimiento) {
    doc.text(`Fecha Nac.: ${new Date(s.paciente_fecha_nacimiento).toLocaleDateString('es-SV')}`, 300, doc.y);
  }
  if (s.paciente_genero) {
    doc.text(`Sexo: ${s.paciente_genero === 'M' ? 'Masculino' : s.paciente_genero === 'F' ? 'Femenino' : 'Otro'}`, 300, doc.y);
  }
  if (s.cliente_nombre) doc.text(`Responsable: ${s.cliente_nombre}`, 300, doc.y);

  const infoY = doc.y + 30;
  doc.y = infoY;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
  doc.text('INFORMACIÓN DEL EXAMEN', 40, infoY);
  doc.font('Helvetica').fontSize(9).fillColor('#555555');
  doc.text(`Tipo: ${s.examen_nombre || '-'}`, 40, doc.y);
  if (s.examen_descripcion) doc.text(`Descripción: ${s.examen_descripcion}`, 40, doc.y);
  if (s.medico_nombre) doc.text(`Médico solicitante: ${s.medico_nombre}`, 40, doc.y);
  const fechaSolicitud = s.fecha_solicitud
    ? new Date(s.fecha_solicitud).toLocaleDateString('es-SV')
    : '-';
  doc.text(`Fecha de solicitud: ${fechaSolicitud}`, 40, doc.y);
  doc.text(`Fecha de resultado: ${fechaEmision}`, 40, doc.y);

  doc.moveDown(2);
  const resultY = doc.y + 15;
  doc.rect(40, resultY, 515, 20).fill(primaryColor);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('RESULTADOS / HALLAZGOS', 50, resultY + 6);

  const textoResultado = s.resultado_texto || 'Sin resultados registrados';
  doc.fillColor('#333333').font('Helvetica').fontSize(10);
  doc.text(textoResultado, 50, resultY + 35, { width: 495, align: 'left' });

  const firmaY = Math.max(doc.y + 60, 550);
  doc.font('Helvetica').fontSize(9).fillColor('#666666');
  doc.moveTo(180, firmaY).lineTo(380, firmaY).strokeColor('#999999').lineWidth(0.5).stroke();
  doc.text('Firma del Responsable', 180, firmaY + 5, { width: 200, align: 'center' });

  const footerY = 780;
  doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
  doc.fillColor('#9ca3af').fontSize(8);
  doc.text(
    `Documento generado el ${new Date().toLocaleString('es-SV')} | Resultado de examen`,
    40,
    footerY + 8,
    { width: 515, align: 'center' }
  );

  doc.end();
}

// ========== CATÁLOGO DE EXÁMENES ==========
exports.listarCatalogos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { activo } = req.query;
    // Por defecto traer TODOS (para mostrar inactivos y poder reactivar)
    const soloActivos = activo === 'true';
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
            const waResult = await enviarWhatsApp(paciente[0].telefono_whatsapp, mensaje, organizacion_id, 'Examen_Listo', id);
            if (waResult.success) await incrementarConsumo(organizacion_id, 'whatsapp');
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

// ========== GENERAR PDF DE RESULTADOS ==========
exports.generarPDFResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const [rows] = await pool.query(
      `SELECT 
        s.*,
        e.nombre AS examen_nombre,
        e.descripcion AS examen_descripcion,
        p.nombre AS paciente_nombre,
        p.apellidos AS paciente_apellidos,
        p.fecha_nacimiento AS paciente_fecha_nacimiento,
        p.genero AS paciente_genero,
        p.codigo_expediente AS paciente_codigo,
        cl.nombre AS cliente_nombre,
        u.nombre AS medico_nombre,
        o.nombre_empresa, o.nit, o.nrc, o.direccion, o.telefono, o.correo_contacto, o.logo_url
       FROM solicitudes_examen s
       LEFT JOIN examenes e ON s.examen_id = e.id
       LEFT JOIN pacientes p ON s.paciente_id = p.id
       LEFT JOIN clientes cl ON p.cliente_id = cl.id
       LEFT JOIN consultas c ON s.consulta_id = c.id
       LEFT JOIN medicos m ON c.medico_id = m.id
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       LEFT JOIN organizaciones o ON s.organizacion_id = o.id
       WHERE s.id = ? AND s.organizacion_id = ?`,
      [id, organizacion_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    const s = rows[0];
    if (s.estado !== 'Completado') {
      return res.status(400).json({ message: 'Solo se pueden generar PDFs de exámenes completados' });
    }

    return generarPDFSolicitud(s, res);
  } catch (error) {
    console.error('Error al generar PDF de examen:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
};

exports.getAniosDisponibles = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const Examen = require('../../models/Examen');
    const anios = await Examen.getAniosDisponibles(organizacion_id);
    res.json(anios);
  } catch (error) {
    console.error('Error al obtener años:', error);
    res.status(500).json({ message: 'Error al obtener años' });
  }
};

exports.reactivarCatalogo = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const ok = await Examen.reactivar(id, organizacion_id);
    if (!ok) {
      return res.status(404).json({ message: 'Examen no encontrado' });
    }
    res.json({ message: 'Examen reactivado' });
  } catch (error) {
    console.error('Error al reactivar examen:', error);
    res.status(500).json({ message: 'Error al reactivar examen' });
  }
};

// ========== EXPORTAR CSV FILTRADO ==========
exports.exportarSolicitudesFiltradas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search, estado, examen_id, fecha_inicio, fecha_fin } = req.query;

    const data = await SolicitudExamen.findForExport(organizacion_id, {
      search,
      estado,
      examen_id,
      fecha_inicio,
      fecha_fin,
    });

    if (data.length === 0) {
      return res.status(404).json({ message: 'No hay solicitudes con los filtros aplicados' });
    }

    const rows = data.map((s) => ({
      'Fecha Solicitud': s.fecha_solicitud
        ? new Date(s.fecha_solicitud).toLocaleDateString('es-SV')
        : '',
      'Fecha Resultado': s.fecha_resultado
        ? new Date(s.fecha_resultado).toLocaleDateString('es-SV')
        : '',
      'Paciente': `${s.paciente_nombre || ''} ${s.paciente_apellidos || ''}`.trim(),
      'Cliente': s.cliente_nombre || '',
      'WhatsApp': s.telefono_whatsapp || '',
      'Examen': s.examen_nombre || '',
      'Médico': s.medico_nombre || '',
      'Estado': s.estado || '',
      'Resultado': s.resultado_texto || '',
    }));

    const headers = Object.keys(rows[0]);
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of rows) {
      csv += headers
        .map((h) => {
          let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
          val = String(val);
          if (val.includes(';') || val.includes('\n') || val.includes('"')) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(';') + '\n';
    }

    const filename = `solicitudes_examen_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar solicitudes:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};

// ========== DASHBOARD DE EXÁMENES ==========
exports.getDashboard = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio, mes } = req.query;
    const data = await SolicitudExamen.getDashboard(organizacion_id, anio, mes);
    res.json(data);
  } catch (error) {
    console.error('Error al obtener dashboard de exámenes:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

// ========== VERIFICAR WHATSAPP DISPONIBLE ==========
exports.getEstadoWhatsApp = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;

    const [org] = await pool.query(
      `SELECT whatsapp_activado, limite_whatsapp FROM organizaciones WHERE id = ?`,
      [organizacion_id]
    );

    if (org.length === 0) {
      return res.json({ activo: false, motivo: 'Organización no encontrada' });
    }

    const whatsappActivo = org[0].whatsapp_activado === 1;

    if (!whatsappActivo) {
      return res.json({ activo: false, motivo: 'WhatsApp no activado en el plan' });
    }

    const limiteCheck = await verificarLimite(organizacion_id, 'whatsapp');
    if (!limiteCheck.allowed) {
      return res.json({
        activo: false,
        motivo: limiteCheck.message || 'Límite de WhatsApp alcanzado',
      });
    }

    res.json({ activo: true });
  } catch (error) {
    console.error('Error al verificar WhatsApp:', error);
    res.json({ activo: false, motivo: 'Error al verificar' });
  }
};

// ========== ENVIAR RESULTADO POR WHATSAPP ==========
exports.enviarResultadoWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const solicitud = await SolicitudExamen.findById(id, organizacion_id);
    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'Completado') {
      return res.status(400).json({ message: 'Solo se pueden enviar resultados completados' });
    }

    const [org] = await pool.query(
      'SELECT whatsapp_activado, nombre_empresa, telefono_whatsapp FROM organizaciones WHERE id = ?',
      [organizacion_id]
    );
    if (!org[0]?.whatsapp_activado) {
      return res.status(400).json({ message: 'WhatsApp no activado para esta organización' });
    }

    // Verificar límite ANTES de enviar
    const limiteCheck = await verificarLimite(organizacion_id, 'whatsapp');
    if (!limiteCheck.allowed) {
      return res.status(400).json({ message: limiteCheck.message || 'Límite alcanzado' });
    }

    const [paciente] = await pool.query(
      `SELECT cl.telefono_whatsapp, cl.nombre AS cliente_nombre, p.nombre AS paciente_nombre
       FROM solicitudes_examen s
       JOIN pacientes p ON s.paciente_id = p.id
       JOIN clientes cl ON p.cliente_id = cl.id
       WHERE s.id = ? AND s.organizacion_id = ?`,
      [id, organizacion_id]
    );

    if (!paciente.length || !paciente[0].telefono_whatsapp) {
      return res.status(400).json({ message: 'El cliente no tiene WhatsApp registrado' });
    }

    // Generar link público
    const baseUrl = process.env.PUBLIC_FRONTEND_URL || req.get('origin') || 'http://localhost:5173';
    const linkPublico = solicitud.token_publico
      ? `${baseUrl}/resultado/${solicitud.token_publico}`
      : null;

    if (!linkPublico) {
      return res.status(400).json({ message: 'No se pudo generar el link público' });
    }

    const nombreEmpresa = org[0].nombre_empresa || 'Clínica';
    const mensaje = 
      `Hola ${paciente[0].cliente_nombre}, te saludamos de ${nombreEmpresa}.\n\n` +
      `El resultado del examen *${solicitud.examen_nombre}* para *${paciente[0].paciente_nombre}* ya está disponible.\n\n` +
      `📄 Puedes verlo y descargarlo aquí (válido 7 días):\n${linkPublico}\n\n` +
      `Gracias por tu preferencia.`;

    const waResult = await enviarWhatsApp(
      paciente[0].telefono_whatsapp,
      mensaje,
      organizacion_id,
      'Examen_Resultado',
      id
    );

    if (waResult.success) {
      await incrementarConsumo(organizacion_id, 'whatsapp');
      res.json({
        message: 'Resultado enviado por WhatsApp',
        telefono: waResult.to,
        link: linkPublico,
      });
    } else {
      res.status(500).json({ message: 'Error al enviar WhatsApp', error: waResult.error });
    }
  } catch (error) {
    console.error('Error al enviar WhatsApp:', error);
    res.status(500).json({ message: 'Error al enviar WhatsApp', error: error.message });
  }
};

// ========== SUBIR ARCHIVO ADJUNTO (opcional) ==========
exports.subirArchivoResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }

    // Verificar tamaño (doble check)
    if (req.file.size > 2 * 1024 * 1024) {
      // Eliminar archivo subido
      try {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      } catch (e) {}
      return res.status(400).json({ message: 'El archivo excede el límite de 2MB' });
    }

    const archivoUrl = `/uploads/examenes/${req.file.filename}`;

    const solicitud = await SolicitudExamen.findById(id, organizacion_id);
    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    await pool.query(
      'UPDATE solicitudes_examen SET resultado_archivo_url = ? WHERE id = ? AND organizacion_id = ?',
      [archivoUrl, id, organizacion_id]
    );

    res.json({
      message: 'Archivo subido correctamente',
      archivo_url: archivoUrl,
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ message: 'Error al subir archivo' });
  }
};

// ========== GENERAR PDF PÚBLICO (SIN AUTH) ==========
exports.getResultadoPublico = async (req, res) => {
  try {
    const { token } = req.params;

    // Validar formato del token (64 chars hex)
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ message: 'Link inválido' });
    }

    const s = await SolicitudExamen.findByToken(token);
    if (!s) {
      return res.status(404).json({ message: 'Link inválido o expirado' });
    }

    return generarPDFSolicitud(s, res);
  } catch (error) {
    console.error('Error al generar PDF público:', error);
    res.status(500).json({ message: 'Error al generar PDF' });
  }
};

exports.getInfoResultadoPublico = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({ message: 'Link inválido' });
    }

    const s = await SolicitudExamen.findByToken(token);
    if (!s) {
      return res.status(404).json({ message: 'Link inválido o expirado' });
    }

    // NO devolver IDs internos ni información sensible
    res.json({
      examen_nombre: s.examen_nombre,
      examen_descripcion: s.examen_descripcion,
      paciente_nombre: `${s.paciente_nombre || ''} ${s.paciente_apellidos || ''}`.trim(),
      fecha_resultado: s.fecha_resultado,
      resultado_texto: s.resultado_texto,
      tiene_archivo: !!s.resultado_archivo_url,
      organizacion_nombre: s.nombre_empresa,
      expira_en: s.token_expira_en,
    });
  } catch (error) {
    console.error('Error al obtener info pública:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
};

// ========== EXPORTAR CATÁLOGO DE EXÁMENES ==========
exports.exportarCatalogos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search } = req.query;

    const Examen = require('../../models/Examen');
    const examenes = await Examen.findAll(organizacion_id, false); // false para traer activos e inactivos

    let data = examenes;
    if (search) {
      const term = search.toLowerCase();
      data = data.filter(e => 
        (e.nombre && e.nombre.toLowerCase().includes(term)) ||
        (e.descripcion && e.descripcion.toLowerCase().includes(term))
      );
    }

    if (data.length === 0) {
      return res.status(404).json({ message: 'No hay exámenes para exportar con los filtros aplicados' });
    }

    const rows = data.map((e) => ({
      'Nombre': e.nombre || '',
      'Descripción': e.descripcion || '',
      'Costo': e.precio || 0,
      'Estado': e.activo ? 'Activo' : 'Inactivo'
    }));

    const headers = Object.keys(rows[0]);
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of rows) {
      csv += headers
        .map((h) => {
          let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
          val = String(val);
          if (val.includes(';') || val.includes('\n') || val.includes('"')) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(';') + '\n';
    }

    const filename = `catalogo_examenes_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar catálogo de exámenes:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};
