// backend/src/controllers/vacunaController.js
const Vacuna = require('../../models/Vacuna');
const HistorialVacuna = require('../../models/HistorialVacuna');
const Medico = require('../../models/Medico');
const Paciente = require('../../models/Paciente');
const Producto = require('../../models/Producto');
const InventoryMovement = require('../../models/InventoryMovement');
const { verificarLimite, incrementarConsumo } = require('../../helpers/consumoHelper');
const { enviarWhatsApp } = require('../../helpers/whatsappHelper');
const { pool } = require('../../config/db');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ========== CATÁLOGO ==========
exports.listarVacunas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { activo } = req.query;
    const soloActivos = activo === 'true';
    const vacunas = await Vacuna.findAll(organizacion_id, soloActivos);
    res.json(vacunas);
  } catch (error) {
    console.error('Error al listar vacunas:', error);
    res.status(500).json({ message: 'Error al listar vacunas' });
  }
};

exports.crearVacuna = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre, descripcion, dias_recordatorio, producto_id } = req.body;

    if (!nombre || !producto_id) {
      return res.status(400).json({
        message: 'Nombre y producto son obligatorios. Registra primero el producto.',
      });
    }

    const id = await Vacuna.create({
      organizacion_id,
      nombre,
      descripcion,
      dias_recordatorio,
      producto_id,
    });
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
    const vacuna = await Vacuna.findById(id, organizacion_id);
    if (!vacuna) {
      return res.status(404).json({ message: 'Vacuna no encontrada' });
    }
    await Vacuna.update(id, organizacion_id, req.body);
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

exports.reactivarVacuna = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const ok = await Vacuna.reactivar(id, organizacion_id);
    if (!ok) return res.status(404).json({ message: 'Vacuna no encontrada' });
    res.json({ message: 'Vacuna reactivada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al reactivar vacuna' });
  }
};

// ========== HISTORIAL ==========
exports.listarHistorialPorPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const organizacion_id = req.organizacion_id;
    const historial = await HistorialVacuna.findByPaciente(paciente_id, organizacion_id);
    res.json(historial);
  } catch (error) {
    console.error('Error al listar historial:', error);
    res.status(500).json({ message: 'Error al listar historial' });
  }
};

exports.getCartilla = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const organizacion_id = req.organizacion_id;
    const cartilla = await HistorialVacuna.getCartillaPaciente(paciente_id, organizacion_id);
    res.json(cartilla);
  } catch (error) {
    console.error('Error al obtener cartilla:', error);
    res.status(500).json({ message: 'Error al obtener cartilla' });
  }
};

// ========== APLICAR VACUNA (con descuento de stock) ==========
exports.aplicarVacuna = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const organizacion_id = req.organizacion_id;
    const usuario_id = req.usuario_id;
    const {
      paciente_id, vacuna_id, consulta_id,
      fecha_aplicacion, fecha_proxima, lote, observaciones,
    } = req.body;

    if (!consulta_id) {
      await connection.rollback();
      return res.status(400).json({
        message: 'La vacuna debe estar asociada a una consulta para poder facturarla',
      });
    }

    const paciente = await Paciente.findById(paciente_id, organizacion_id);
    if (!paciente) {
      await connection.rollback();
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    const medico = await Medico.findByUsuarioId(usuario_id, organizacion_id);
    if (!medico) {
      await connection.rollback();
      return res.status(400).json({ message: 'El usuario no está registrado como médico' });
    }

    const vacuna = await Vacuna.findById(vacuna_id, organizacion_id);
    if (!vacuna) {
      await connection.rollback();
      return res.status(404).json({ message: 'Vacuna no encontrada' });
    }

    let stockAnterior = 0;
    let nuevoStock = 0;
    if (vacuna.producto_id) {
      const [prod] = await connection.query(
        'SELECT id, nombre, stock_actual FROM productos WHERE id = ? AND organizacion_id = ?',
        [vacuna.producto_id, organizacion_id]
      );
      if (prod.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Producto vinculado a la vacuna no encontrado' });
      }
      stockAnterior = prod[0].stock_actual;
      if (stockAnterior < 1) {
        await connection.rollback();
        return res.status(400).json({
          message: `Stock insuficiente de "${prod[0].nombre}". Disponible: ${stockAnterior}`,
        });
      }
      nuevoStock = stockAnterior - 1;

      await connection.query(
        'UPDATE productos SET stock_actual = ? WHERE id = ? AND organizacion_id = ?',
        [nuevoStock, vacuna.producto_id, organizacion_id]
      );

      await InventoryMovement.create({
        organizacion_id,
        producto_id: vacuna.producto_id,
        tipo_movimiento: 'Salida',
        cantidad: 1,
        stock_anterior: stockAnterior,
        stock_nuevo: nuevoStock,
        referencia_tipo: 'Vacuna',
        referencia_id: vacuna.id,
        costo_unitario: 0,
        observacion: `Aplicación de ${vacuna.nombre}`,
        usuario_id,
      }, connection);
    }

    let fechaProximaFinal = fecha_proxima;
    if (!fechaProximaFinal) {
      const fecha = new Date(fecha_aplicacion);
      fecha.setDate(fecha.getDate() + (vacuna.dias_recordatorio || 365));
      fechaProximaFinal = fecha.toISOString().split('T')[0];
    }

    const historialId = await HistorialVacuna.create({
      organizacion_id,
      paciente_id,
      vacuna_id,
      consulta_id,
      fecha_aplicacion,
      fecha_proxima: fechaProximaFinal,
      lote,
      observaciones,
      medico_id: medico.id,
    });

    await connection.commit();

    try {
      const [cliente] = await pool.query(
        'SELECT telefono_whatsapp, nombre FROM clientes WHERE id = ?',
        [paciente.cliente_id]
      );
      if (cliente.length > 0 && cliente[0].telefono_whatsapp) {
        const [org] = await pool.query(
          'SELECT whatsapp_activado FROM organizaciones WHERE id = ?',
          [organizacion_id]
        );
        if (org[0]?.whatsapp_activado) {
          const limiteCheck = await verificarLimite(organizacion_id, 'whatsapp');
          if (limiteCheck.allowed) {
            const mensaje = `Hola ${cliente[0].nombre}, se aplicó "${vacuna.nombre}" a ${paciente.nombre}. Próxima dosis: ${new Date(fechaProximaFinal).toLocaleDateString('es-SV')}.`;
            const waResult = await enviarWhatsApp(
              cliente[0].telefono_whatsapp,
              mensaje,
              organizacion_id,
              'Vacuna_Recordatorio',
              historialId
            );
            if (waResult.success) {
              await incrementarConsumo(organizacion_id, 'whatsapp');
            }
          }
        }
      }
    } catch (notifErr) {
      console.error('Error al notificar WhatsApp:', notifErr.message);
    }

    res.status(201).json({ message: 'Vacuna aplicada', id: historialId });
  } catch (error) {
    await connection.rollback();
    console.error('Error al aplicar vacuna:', error);
    res.status(500).json({ message: 'Error al aplicar vacuna', error: error.message });
  } finally {
    connection.release();
  }
};

// ========== EDITAR APLICACIÓN DE VACUNA ==========
exports.editarAplicacionVacuna = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { fecha_aplicacion, fecha_proxima, lote, observaciones } = req.body;

    const [historialReg] = await connection.query(
      `SELECT h.*, f.estado AS factura_estado 
       FROM historial_vacunas h
       LEFT JOIN facturas f ON h.factura_id = f.id
       WHERE h.id = ? AND h.organizacion_id = ?`,
      [id, organizacion_id]
    );

    if (historialReg.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Registro de aplicación no encontrado' });
    }

    const reg = historialReg[0];

    // Validación según regla de negocio (similar a consulta facturada)
    if (reg.factura_id && reg.factura_estado === 'Pagada') {
      await connection.rollback();
      return res.status(400).json({
        message: 'No se puede modificar esta aplicación porque la factura asociada ya está pagada.',
      });
    }

    await connection.query(
      `UPDATE historial_vacunas 
       SET fecha_aplicacion = ?, fecha_proxima = ?, lote = ?, observaciones = ?
       WHERE id = ? AND organizacion_id = ?`,
      [fecha_aplicacion, fecha_proxima || null, lote || null, observaciones || null, id, organizacion_id]
    );

    await connection.commit();
    res.json({ message: 'Aplicación de vacuna actualizada exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al editar aplicación de vacuna:', error);
    res.status(500).json({ message: 'Error al editar aplicación de vacuna', error: error.message });
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
    console.error('Error al obtener próximas:', error);
    res.status(500).json({ message: 'Error al obtener próximas' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio, mes } = req.query;
    const data = await HistorialVacuna.getDashboard(organizacion_id, anio, mes);
    res.json(data);
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ message: 'Error al obtener dashboard' });
  }
};

exports.getAniosDisponibles = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const anios = await Vacuna.getAniosDisponibles(organizacion_id);
    res.json(anios);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener años' });
  }
};

// ========== EXPORTAR CSV ==========
exports.exportarHistorial = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search, vacuna_id, anio, mes } = req.query;

    let sql = `
      SELECT 
        h.fecha_aplicacion, h.fecha_proxima, h.lote, h.observaciones,
        v.nombre AS vacuna_nombre,
        p.nombre AS paciente_nombre, p.apellidos AS paciente_apellidos,
        c.nombre AS cliente_nombre,
        u.nombre AS medico_nombre,
        f.numero_correlativo AS factura_numero, f.estado AS factura_estado
      FROM historial_vacunas h
      JOIN vacunas v ON h.vacuna_id = v.id
      JOIN pacientes p ON h.paciente_id = p.id
      JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN medicos m ON h.medico_id = m.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      LEFT JOIN facturas f ON h.factura_id = f.id
      WHERE h.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (search) {
      sql += ' AND (p.nombre LIKE ? OR p.apellidos LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (vacuna_id) {
      sql += ' AND h.vacuna_id = ?';
      params.push(vacuna_id);
    }
    if (anio) {
      sql += ' AND YEAR(h.fecha_aplicacion) = ?';
      params.push(parseInt(anio));
    }
    if (mes) {
      sql += ' AND MONTH(h.fecha_aplicacion) = ?';
      params.push(parseInt(mes));
    }
    sql += ' ORDER BY h.fecha_aplicacion DESC';

    const [rows] = await pool.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay registros con los filtros aplicados' });
    }

    const data = rows.map((r) => ({
      'Fecha Aplicación': new Date(r.fecha_aplicacion).toLocaleDateString('es-SV'),
      'Paciente': `${r.paciente_nombre || ''} ${r.paciente_apellidos || ''}`.trim(),
      'Cliente': r.cliente_nombre,
      'Vacuna': r.vacuna_nombre,
      'Lote': r.lote || '',
      'Próxima Dosis': r.fecha_proxima ? new Date(r.fecha_proxima).toLocaleDateString('es-SV') : '',
      'Médico': r.medico_nombre || '',
      'N° Factura': r.factura_numero || 'Sin factura',
      'Estado Factura': r.factura_estado || '-',
      'Observaciones': r.observaciones || '',
    }));

    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of data) {
      csv += headers.map((h) => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }

    const filename = `vacunas_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar:', error);
    res.status(500).json({ message: 'Error al exportar' });
  }
};

// ========== GENERAR PDF CARTILLA (CON LOGO ARRIBA A LA DERECHA) ==========
async function generarPDFCartilla(data, res) {
  const { paciente, historial, organizacion } = data;

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=cartilla_${paciente.id}.pdf`);
    res.send(pdfData);
  });

  const primaryColor = '#1a1a2e';
  const textColor = '#333333';
  const lightGray = '#f5f5f5';

  // 1. CARGA DEL LOGO (RUTA ABSOLUTA CORRECTA HACIA backend/uploads)
  let alturaLogo = 40;
  if (organizacion.logo_url) {
    // Extraemos únicamente el nombre del archivo (ej: org_1_1785722548676.jpg)
    const nombreArchivo = path.basename(organizacion.logo_url);
    
    // process.cwd() apunta siempre a la carpeta raíz 'backend' donde corre el servidor
    const logoPath = path.join(process.cwd(), 'uploads', 'logos', nombreArchivo);
    
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { fit: [120, 60] });
      alturaLogo = 105;
    } else {
      console.warn('⚠️ Logo no encontrado en la ruta física:', logoPath);
    }
  }

  // 2. ENCABEZADO A LA DERECHA
  doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor);
  doc.text('CARTILLA DE VACUNACION', 300, 40, { width: 255, align: 'right' });
  
  doc.fontSize(9).fillColor('#666666');
  doc.text(`Expediente: ${paciente.codigo_expediente || 'N/A'}`, 300, 65, { width: 255, align: 'right' });
  doc.text(`Emitida: ${new Date().toLocaleDateString('es-SV')}`, 300, 80, { width: 255, align: 'right' });

  // 3. DATOS DEL EMISOR
  doc.moveDown(2);
  const emisorTop = Math.max(doc.y + 25, alturaLogo, 115);
  doc.y = emisorTop;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
  doc.text('EMISOR', 40, emisorTop);
  doc.font('Helvetica').fontSize(9).fillColor('#555555');
  doc.text(organizacion.nombre_empresa || 'Clínica Veterinaria', 40, doc.y);
  if (organizacion.nit) doc.text(`NIT: ${organizacion.nit}`, 40, doc.y);
  if (organizacion.nrc) doc.text(`NRC: ${organizacion.nrc}`, 40, doc.y);
  if (organizacion.direccion) doc.text(organizacion.direccion, 40, doc.y);
  if (organizacion.telefono) doc.text(`Tel: ${organizacion.telefono}`, 40, doc.y);
  if (organizacion.correo_contacto) doc.text(`Email: ${organizacion.correo_contacto}`, 40, doc.y);
  const emisorBottom = doc.y + 5;

  // 4. DATOS DEL PACIENTE
  doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
  doc.text('PACIENTE', 300, emisorTop);
  doc.font('Helvetica').fontSize(9).fillColor('#555555');
  doc.text(`${paciente.nombre || ''} ${paciente.apellidos || ''}`, 300, doc.y);
  if (paciente.especie) doc.text(`Especie: ${paciente.especie}`, 300, doc.y);
  if (paciente.raza) doc.text(`Raza: ${paciente.raza}`, 300, doc.y);
  if (paciente.fecha_nacimiento) {
    doc.text(`Nacimiento: ${new Date(paciente.fecha_nacimiento).toLocaleDateString('es-SV')}`, 300, doc.y);
  }
  const clienteBottom = doc.y;

  // 5. TABLA DE VACUNAS
  const tableTop = Math.max(emisorBottom, clienteBottom) + 25;
  const colX = [40, 110, 260, 330, 415, 480];

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
  doc.rect(40, tableTop, 515, 20).fill(primaryColor);
  doc.fillColor('#ffffff');
  doc.text('FECHA', colX[0] + 5, tableTop + 6);
  doc.text('VACUNA', colX[1] + 5, tableTop + 6);
  doc.text('LOTE', colX[2], tableTop + 6);
  doc.text('PROXIMA', colX[3], tableTop + 6);
  doc.text('ESTADO', colX[4], tableTop + 6);
  doc.text('VET.', colX[5], tableTop + 6);

  let rowY = tableTop + 25;
  historial.forEach((h, index) => {
    if (index % 2 === 0) doc.rect(40, rowY - 3, 515, 18).fill(lightGray);
    doc.fillColor(textColor).font('Helvetica').fontSize(8.5);

    const estadoTexto =
      h.semaforo === 'verde' ? 'Al dia' :
      h.semaforo === 'amarillo' ? 'Proxima' :
      h.semaforo === 'rojo' ? 'Vencida' : '-';

    doc.text(new Date(h.fecha_aplicacion).toLocaleDateString('es-SV'), colX[0] + 5, rowY);
    doc.text(h.vacuna_nombre || '-', colX[1] + 5, rowY, { width: 140, truncate: true });
    doc.text(h.lote || '-', colX[2], rowY, { width: 65, truncate: true });
    doc.text(h.fecha_proxima ? new Date(h.fecha_proxima).toLocaleDateString('es-SV') : '-', colX[3], rowY);
    doc.text(estadoTexto, colX[4], rowY);
    doc.text((h.medico_nombre || '-').substring(0, 12), colX[5], rowY, { width: 75, truncate: true });
    
    rowY += 20;

    if (rowY > 720) {
      doc.addPage();
      rowY = 50;
    }
  });

  // 6. PIE DE PÁGINA
  const footerY = 760;
  doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.fillColor('#9ca3af').fontSize(8);
  doc.text(
    `Generado: ${new Date().toLocaleDateString('es-SV')} | Cartilla de vacunacion`,
    40, footerY + 10, { width: 515, align: 'center' }
  );

  doc.end();
}

exports.generarPDFCartillaPrivada = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const organizacion_id = req.organizacion_id;

    const paciente = await Paciente.findById(paciente_id, organizacion_id);
    if (!paciente) return res.status(404).json({ message: 'Paciente no encontrado' });

    const historial = await HistorialVacuna.getCartillaPaciente(paciente_id, organizacion_id);

    const [org] = await pool.query(
      `SELECT nombre_empresa, nit, nrc, direccion, telefono, correo_contacto, logo_url FROM organizaciones WHERE id = ?`,
      [organizacion_id]
    );

    return generarPDFCartilla({ paciente, historial, organizacion: org[0] || {} }, res);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
};

exports.generarTokenCartilla = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const organizacion_id = req.organizacion_id;

    const paciente = await Paciente.findById(paciente_id, organizacion_id);
    if (!paciente) return res.status(404).json({ message: 'Paciente no encontrado' });

    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `UPDATE pacientes 
       SET cartilla_token = ?, 
           cartilla_token_expira = DATE_ADD(NOW(), INTERVAL 7 DAY)
       WHERE id = ? AND organizacion_id = ?`,
      [token, paciente_id, organizacion_id]
    );

    const baseUrl = process.env.PUBLIC_FRONTEND_URL || req.get('origin') || 'http://localhost:5173';
    const link = `${baseUrl}/cartilla/${token}`;

    res.json({
      message: 'Token generado. Válido 7 días.',
      token,
      link,
      expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error al generar token:', error);
    res.status(500).json({ message: 'Error al generar token' });
  }
};

exports.getCartillaPublica = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ message: 'Link inválido' });
    }

    const paciente = await HistorialVacuna.findByToken(token);
    if (!paciente) {
      return res.status(404).json({ message: 'Link inválido o expirado' });
    }

    const historial = await HistorialVacuna.getCartillaPaciente(
      paciente.paciente_id,
      paciente.organizacion_id || null
    );

    res.json({
      paciente: {
        nombre: paciente.nombre,
        apellidos: paciente.apellidos,
        codigo_expediente: paciente.codigo_expediente,
        especie: paciente.especie,
        raza: paciente.raza,
        fecha_nacimiento: paciente.fecha_nacimiento,
      },
      organizacion: {
        nombre_empresa: paciente.nombre_empresa,
        telefono: paciente.telefono,
        correo_contacto: paciente.correo_contacto,
      },
      historial: historial.map((h) => ({
        vacuna_nombre: h.vacuna_nombre,
        fecha_aplicacion: h.fecha_aplicacion,
        fecha_proxima: h.fecha_proxima,
        lote: h.lote,
        semaforo: h.semaforo,
        mensaje_semaforo: h.mensaje_semaforo,
      })),
    });
  } catch (error) {
    console.error('Error al obtener cartilla pública:', error);
    res.status(500).json({ message: 'Error al obtener cartilla' });
  }
};

exports.getPDFCartillaPublica = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ message: 'Link inválido' });
    }

    const [rows] = await pool.query(
      `SELECT p.*, o.nombre_empresa, o.logo_url, o.telefono, o.correo_contacto, o.id AS organizacion_id
       FROM pacientes p
       JOIN organizaciones o ON p.organizacion_id = o.id
       WHERE p.cartilla_token = ? AND p.cartilla_token_expira > NOW()
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Link inválido o expirado' });
    }

    const paciente = rows[0];
    const historial = await HistorialVacuna.getCartillaPaciente(
      paciente.id,
      paciente.organizacion_id
    );

    return generarPDFCartilla({
      paciente,
      historial,
      organizacion: {
        nombre_empresa: paciente.nombre_empresa,
        logo_url: paciente.logo_url,
        telefono: paciente.telefono,
        correo_contacto: paciente.correo_contacto,
      },
    }, res);
  } catch (error) {
    console.error('Error al generar PDF público:', error);
    res.status(500).json({ message: 'Error al generar PDF' });
  }
};

exports.listarHistorialGlobal = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio, mes, filtro, page = 1, limit = 10 } = req.query;
    
    const result = await HistorialVacuna.findAllGlobal(
      organizacion_id, anio, mes, filtro, parseInt(page), parseInt(limit)
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error al listar historial global:', error);
    res.status(500).json({ message: 'Error al listar historial' });
  }
};

exports.exportarTopVacunas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio, mes } = req.query;
    const anioFiltro = anio || new Date().getFullYear();
    const mesFiltro = mes ? parseInt(mes) : null;

    let sqlTop = `
      SELECT v.id, v.nombre, COUNT(h.id) AS total_aplicaciones
      FROM historial_vacunas h
      JOIN vacunas v ON h.vacuna_id = v.id
      WHERE h.organizacion_id = ? AND YEAR(h.fecha_aplicacion) = ?
    `;
    const paramsTop = [organizacion_id, anioFiltro];
    if (mesFiltro) {
      sqlTop += ' AND MONTH(h.fecha_aplicacion) = ?';
      paramsTop.push(mesFiltro);
    }
    sqlTop += ' GROUP BY v.id, v.nombre ORDER BY total_aplicaciones DESC LIMIT 5';
    
    const [topVacunas] = await pool.query(sqlTop, paramsTop);

    if (topVacunas.length === 0) {
      return res.status(404).json({ message: 'No hay datos para el período seleccionado' });
    }

    const idsVacunas = topVacunas.map(v => v.id);
    const placeholders = idsVacunas.map(() => '?').join(',');

    let sqlAplicaciones = `
      SELECT 
        v.nombre AS vacuna,
        h.fecha_aplicacion,
        p.nombre AS paciente_nombre,
        p.apellidos AS paciente_apellidos,
        f.numero_correlativo AS factura_numero
      FROM historial_vacunas h
      JOIN vacunas v ON h.vacuna_id = v.id
      JOIN pacientes p ON h.paciente_id = p.id
      LEFT JOIN facturas f ON h.factura_id = f.id
      WHERE h.organizacion_id = ? 
        AND YEAR(h.fecha_aplicacion) = ?
        AND h.vacuna_id IN (${placeholders})
    `;
    
    const paramsAplic = [organizacion_id, anioFiltro, ...idsVacunas];
    if (mesFiltro) {
      sqlAplicaciones += ' AND MONTH(h.fecha_aplicacion) = ?';
      paramsAplic.push(mesFiltro);
    }
    sqlAplicaciones += ' ORDER BY v.nombre ASC, h.fecha_aplicacion DESC';

    const [aplicaciones] = await pool.query(sqlAplicaciones, paramsAplic);

    if (aplicaciones.length === 0) {
      return res.status(404).json({ message: 'No se encontraron aplicaciones detalladas' });
    }

    const data = aplicaciones.map(a => ({
      'Vacuna': a.vacuna,
      'Fecha Aplicación': new Date(a.fecha_aplicacion).toLocaleDateString('es-SV'),
      'Paciente': `${a.paciente_nombre} ${a.paciente_apellidos || ''}`.trim(),
      'N° Factura': a.factura_numero || 'Sin factura'
    }));

    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }

    const filename = `top5_vacunas_${mesFiltro || 'todo'}_${anioFiltro}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);

  } catch (error) {
    console.error('Error al exportar top 5 vacunas:', error);
    res.status(500).json({ message: 'Error al exportar top 5 vacunas' });
  }
};

// ========== ELIMINAR APLICACIÓN DE VACUNA (con reversión de stock) ==========
exports.deleteAplicacion = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const usuario_id = req.usuario_id;

    const [rows] = await connection.query(
      `SELECT h.*, v.producto_id, v.nombre AS vacuna_nombre,
              f.estado AS factura_estado, f.numero_correlativo
       FROM historial_vacunas h
       JOIN vacunas v ON h.vacuna_id = v.id
       LEFT JOIN facturas f ON h.factura_id = f.id
       WHERE h.id = ? AND h.organizacion_id = ?`,
      [id, organizacion_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Registro de aplicación no encontrado' });
    }

    const reg = rows[0];

    if (reg.factura_id && reg.factura_estado && reg.factura_estado !== 'Anulada') {
      await connection.rollback();
      return res.status(400).json({
        message:
          `No se puede cancelar esta aplicación porque está vinculada a la factura ` +
          `${reg.numero_correlativo || reg.factura_id} (estado: "${reg.factura_estado}"). ` +
          `Primero anule la factura o emita una nota de crédito.`,
      });
    }

    // Devolver stock al producto
    if (reg.producto_id) {
      const [prod] = await connection.query(
        'SELECT stock_actual, nombre FROM productos WHERE id = ? AND organizacion_id = ?',
        [reg.producto_id, organizacion_id]
      );
      if (prod.length > 0) {
        const stockAnterior = prod[0].stock_actual;
        const nuevoStock = stockAnterior + 1;

        await connection.query(
          'UPDATE productos SET stock_actual = ? WHERE id = ? AND organizacion_id = ?',
          [nuevoStock, reg.producto_id, organizacion_id]
        );

        await InventoryMovement.create({
          organizacion_id,
          producto_id: reg.producto_id,
          tipo_movimiento: 'Entrada',
          cantidad: 1,
          stock_anterior: stockAnterior,
          stock_nuevo: nuevoStock,
          referencia_tipo: 'Devolucion',
          referencia_id: reg.id,
          costo_unitario: 0,
          observacion: `Cancelación de aplicación de ${reg.vacuna_nombre}`,
          usuario_id,
        }, connection);
      }
    }

    //  SOFT DELETE: Solo cambiamos el estado
    await connection.query(
      'UPDATE historial_vacunas SET estado = "Cancelada" WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );

    await connection.commit();
    res.json({ message: 'Aplicación de vacuna cancelada correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al cancelar aplicación:', error);
    res.status(500).json({ message: 'Error al cancelar aplicación', error: error.message });
  } finally {
    connection.release();
  }
};