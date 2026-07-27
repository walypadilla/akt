// backend/src/controllers/proveedorController.js
const Proveedor = require('../models/Proveedor');
const { pool } = require('../config/db');

// ============================================================
// OBTENER PROVEEDORES (CON PAGINACIÓN Y FILTROS)
// ============================================================
exports.obtenerProveedores = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const {
      razon_social,
      nombre_comercial,
      numero_documento,
      tipo_documento,
      codigo_giro,
      tipo_contribuyente,
      activo, 
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {};
    if (razon_social) filters.razon_social = razon_social;
    if (nombre_comercial) filters.nombre_comercial = nombre_comercial;
    if (numero_documento) filters.numero_documento = numero_documento;
    if (tipo_documento) filters.tipo_documento = tipo_documento;
    if (codigo_giro) filters.codigo_giro = codigo_giro;
    if (tipo_contribuyente) filters.tipo_contribuyente = tipo_contribuyente;
    if (activo !== undefined && activo !== '') filters.activo = activo; // ← importante

    const result = await Proveedor.findAll(organizacion_id, filters, page, limit);
    res.json(result);
  } catch (error) {
    console.error('❌ Error al obtener proveedores:', error);
    res.status(500).json({ message: 'Error al obtener proveedores', error: error.message });
  }
};

// ============================================================
// OBTENER PROVEEDOR POR ID
// ============================================================
exports.obtenerProveedorPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const proveedor = await Proveedor.findById(id, organizacion_id);
    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.json(proveedor);
  } catch (error) {
    console.error('❌ Error al obtener proveedor:', error);
    res.status(500).json({ message: 'Error al obtener proveedor', error: error.message });
  }
};

// ============================================================
// CREAR PROVEEDOR
// ============================================================
exports.crearProveedor = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };

    // Validar que el NRC sea obligatorio para NIT
    if (data.tipo_documento === 'NIT' && !data.nrc) {
      return res.status(400).json({ message: 'El NRC es obligatorio para contribuyentes con NIT' });
    }

    const id = await Proveedor.create(data);
    res.status(201).json({ message: 'Proveedor creado exitosamente', id });
  } catch (error) {
    console.error('❌ Error al crear proveedor:', error);
    // Capturar errores de validación de sanitización
    if (error.message.includes('DUI') || error.message.includes('NIT')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error al crear proveedor', error: error.message });
  }
};

// ============================================================
// ACTUALIZAR PROVEEDOR
// ============================================================
exports.actualizarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;

    const proveedor = await Proveedor.findById(id, organizacion_id);
    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    // Validar que el NRC sea obligatorio para NIT
    if (data.tipo_documento === 'NIT' && !data.nrc) {
      return res.status(400).json({ message: 'El NRC es obligatorio para contribuyentes con NIT' });
    }

    await Proveedor.update(id, organizacion_id, data);
    res.json({ message: 'Proveedor actualizado exitosamente' });
  } catch (error) {
    console.error('❌ Error al actualizar proveedor:', error);
    if (error.message.includes('DUI') || error.message.includes('NIT')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar proveedor', error: error.message });
  }
};

// ============================================================
// DESACTIVAR PROVEEDOR
// ============================================================
exports.eliminarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Proveedor.delete(id, organizacion_id);
    res.json({ message: 'Proveedor desactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error al desactivar proveedor:', error);
    res.status(500).json({ message: 'Error al desactivar proveedor', error: error.message });
  }
};

// ============================================================
// REACTIVAR PROVEEDOR
// ============================================================
exports.reactivarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Proveedor.reactivar(id, organizacion_id);
    res.json({ message: 'Proveedor reactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error al reactivar proveedor:', error);
    res.status(500).json({ message: 'Error al reactivar proveedor', error: error.message });
  }
};


// ============================================================
// GENERAR PDF DE PROVEEDOR (FORMATO PROFESIONAL)
// ============================================================
exports.generarProveedorPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const proveedor = await Proveedor.findById(id, organizacion_id);
    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=proveedor_${proveedor.razon_social.replace(/\s/g, '_')}.pdf`);
      res.send(pdfData);
    });

    // Título
    doc.fontSize(18).font('Helvetica-Bold').text('REGISTRO DE PROVEEDOR', { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#444444').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(1);

    // Datos Básicos
    doc.fontSize(12).font('Helvetica-Bold').text('DATOS BÁSICOS');
    doc.moveDown(0.3);

    const info = [
      ['Razón Social:', proveedor.razon_social],
      ['Nombre Comercial:', proveedor.nombre_comercial || 'N/A'],
      ['Tipo Documento:', proveedor.tipo_documento],
      ['Número Documento:', proveedor.numero_documento],
      ['NRC:', proveedor.nrc || 'N/A'],
      ['Tipo Contribuyente:', proveedor.tipo_contribuyente],
      ['Giro:', proveedor.descripcion_giro || 'N/A'],
      ['Código Giro:', proveedor.codigo_giro || 'N/A'],
    ];

    let y = doc.y;
    const col1 = 50;
    const col2 = 200;
    const rowHeight = 22;

    doc.fontSize(10);
    for (const [label, value] of info) {
      doc.font('Helvetica-Bold').text(label, col1, y);
      doc.font('Helvetica').text(value, col2, y);
      y += rowHeight;
    }

    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(0.5);

    // Ubicación y Contacto
    doc.fontSize(12).font('Helvetica-Bold').text('UBICACIÓN Y CONTACTO');
    doc.moveDown(0.3);

    const contacto = [
      ['Departamento:', proveedor.nombre_departamento || 'N/A'],
      ['Municipio:', proveedor.nombre_municipio || 'N/A'],
      ['Dirección:', proveedor.direccion_linea || 'N/A'],
      ['Teléfono:', proveedor.telefono || 'N/A'],
      ['Email DTE:', proveedor.email_dte || 'N/A'],
    ];

    y = doc.y;
    for (const [label, value] of contacto) {
      doc.font('Helvetica-Bold').text(label, col1, y);
      doc.font('Helvetica').text(value, col2, y);
      y += rowHeight;
    }

    doc.moveDown(1);

    // Pie de página
    doc.fontSize(8).font('Helvetica');
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-SV')}`, 50, doc.y);
    doc.text(`Estado: ${proveedor.activo === 1 ? 'ACTIVO' : 'INACTIVO'}`, 400, doc.y - 10);
    doc.text('Este documento es un registro de proveedor válido.', 50, doc.y + 12);

    doc.end();
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
};

// ============================================================
// EXPORTAR TODOS LOS PROVEEDORES
// ============================================================
exports.exportarTodosProveedores = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const result = await Proveedor.findAll(organizacion_id, {}, 1, 99999);
    const proveedores = result.proveedores || [];

    if (proveedores.length === 0) {
      return res.status(404).json({ message: 'No hay proveedores para exportar' });
    }

    const data = proveedores.map(p => ({
      'Razón Social': p.razon_social,
      'Nombre Comercial': p.nombre_comercial || '',
      'Tipo Documento': p.tipo_documento,
      'Número Documento': p.numero_documento,
      'NRC': p.nrc || '',
      'Tipo Contribuyente': p.tipo_contribuyente,
      'Giro': p.descripcion_giro || '',
      'Código Giro': p.codigo_giro || '',
      'Departamento': p.nombre_departamento || '',
      'Municipio': p.nombre_municipio || '',
      'Dirección': p.direccion_linea || '',
      'Teléfono': p.telefono || '',
      'Email DTE': p.email_dte || '',
      'Estado': p.activo === 1 ? 'Activo' : 'Inactivo',
    }));

    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n';
    csv += headers.join(';') + '\n';
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

    const filename = `proveedores_todos_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar todos los proveedores:', error);
    res.status(500).json({ message: 'Error al exportar proveedores', error: error.message });
  }
};

// ============================================================
// EXPORTAR PROVEEDORES FILTRADOS
// ============================================================
exports.exportarProveedoresFiltrados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const {
      razon_social,
      nombre_comercial,
      numero_documento,
      tipo_documento,
      codigo_giro,
      tipo_contribuyente,
      incluir_desactivados,
    } = req.query;

    const filters = {};
    if (razon_social) filters.razon_social = razon_social;
    if (nombre_comercial) filters.nombre_comercial = nombre_comercial;
    if (numero_documento) filters.numero_documento = numero_documento;
    if (tipo_documento) filters.tipo_documento = tipo_documento;
    if (codigo_giro) filters.codigo_giro = codigo_giro;
    if (tipo_contribuyente) filters.tipo_contribuyente = tipo_contribuyente;
    if (incluir_desactivados === 'true' || incluir_desactivados === true) {
      filters.incluir_desactivados = true;
    }

    const result = await Proveedor.findAll(organizacion_id, filters, 1, 99999);
    const proveedores = result.proveedores || [];

    if (proveedores.length === 0) {
      return res.status(404).json({ message: 'No hay proveedores para exportar con los filtros aplicados' });
    }

    const data = proveedores.map(p => ({
      'Razón Social': p.razon_social,
      'Nombre Comercial': p.nombre_comercial || '',
      'Tipo Documento': p.tipo_documento,
      'Número Documento': p.numero_documento,
      'NRC': p.nrc || '',
      'Tipo Contribuyente': p.tipo_contribuyente,
      'Giro': p.descripcion_giro || '',
      'Código Giro': p.codigo_giro || '',
      'Departamento': p.nombre_departamento || '',
      'Municipio': p.nombre_municipio || '',
      'Dirección': p.direccion_linea || '',
      'Teléfono': p.telefono || '',
      'Email DTE': p.email_dte || '',
      'Estado': p.activo === 1 ? 'Activo' : 'Inactivo',
    }));

    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n';
    csv += headers.join(';') + '\n';
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

    const filename = `proveedores_filtrados_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar proveedores filtrados:', error);
    res.status(500).json({ message: 'Error al exportar proveedores filtrados', error: error.message });
  }
};