const Cliente = require('../models/Cliente');
const { pool } = require('../config/db');

// ============================================================
// OBTENER CLIENTES (CON PAGINACIÓN Y FILTROS)
// ============================================================
exports.obtenerClientes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const {
      nombre,
      nit,
      dui,
      tipo_contribuyente,
      giro,
      activo,
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {};
    if (nombre) filters.nombre = nombre;
    if (nit) filters.nit = nit;
    if (dui) filters.dui = dui;
    if (tipo_contribuyente) filters.tipo_contribuyente = tipo_contribuyente;
    if (giro) filters.giro = giro;
    if (activo !== undefined && activo !== '') filters.activo = activo;

    const result = await Cliente.findAll(organizacion_id, filters, page, limit);
    res.json(result);
  } catch (error) {
    console.error('❌ Error al obtener clientes:', error);
    res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
  }
};

// ============================================================
// OBTENER CLIENTE POR ID
// ============================================================
exports.obtenerClientePorId = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const cliente = await Cliente.findById(id, organizacion_id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('❌ Error al obtener cliente:', error);
    res.status(500).json({ message: 'Error al obtener cliente', error: error.message });
  }
};

// ============================================================
// CREAR CLIENTE
// ============================================================
exports.crearCliente = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };

    // Validar duplicados de NIT
    if (data.nit) {
      const exists = await Cliente.existsNit(data.nit, organizacion_id);
      if (exists) {
        return res.status(400).json({ message: 'El NIT ya está registrado para esta organización' });
      }
    }

    const id = await Cliente.create(data);
    res.status(201).json({ message: 'Cliente creado exitosamente', id });
  } catch (error) {
    console.error('❌ Error al crear cliente:', error);
    if (error.message.includes('DUI') || error.message.includes('NIT') || error.message.includes('NRC')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error al crear cliente', error: error.message });
  }
};

// ============================================================
// ACTUALIZAR CLIENTE
// ============================================================
exports.actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;

    const cliente = await Cliente.findById(id, organizacion_id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    if (data.nit && data.nit !== cliente.nit) {
      const exists = await Cliente.existsNit(data.nit, organizacion_id, id);
      if (exists) {
        return res.status(400).json({ message: 'El NIT ya está registrado para esta organización' });
      }
    }

    await Cliente.update(id, organizacion_id, data);
    res.json({ message: 'Cliente actualizado exitosamente' });
  } catch (error) {
    console.error('❌ Error al actualizar cliente:', error);
    if (error.message.includes('DUI') || error.message.includes('NIT') || error.message.includes('NRC')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar cliente', error: error.message });
  }
};

// ============================================================
// DESACTIVAR CLIENTE
// ============================================================
exports.eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Cliente.delete(id, organizacion_id);
    res.json({ message: 'Cliente desactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error al desactivar cliente:', error);
    res.status(500).json({ message: 'Error al desactivar cliente', error: error.message });
  }
};

// ============================================================
// REACTIVAR CLIENTE
// ============================================================
exports.reactivarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Cliente.reactivar(id, organizacion_id);
    res.json({ message: 'Cliente reactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error al reactivar cliente:', error);
    res.status(500).json({ message: 'Error al reactivar cliente', error: error.message });
  }
};

// ============================================================
// OBTENER DATOS PARA GRÁFICAS
// ============================================================

// Clientes nuevos por mes
exports.getClientesPorMes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio } = req.query;
    if (!anio) return res.status(400).json({ message: 'El año es requerido' });

    const data = await Cliente.getClientesPorMes(organizacion_id, anio);
    // Completar meses faltantes con 0
    const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: 0 }));
    for (const row of data) {
      const idx = meses.findIndex(m => m.mes === row.mes);
      if (idx !== -1) meses[idx].total = row.total;
    }
    res.json(meses);
  } catch (error) {
    console.error('❌ Error al obtener clientes por mes:', error);
    res.status(500).json({ message: 'Error al obtener datos', error: error.message });
  }
};

// Top clientes por compras
exports.getTopClientes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio, limit = 5 } = req.query;
    if (!anio) return res.status(400).json({ message: 'El año es requerido' });

    const data = await Cliente.getTopClientes(organizacion_id, anio, parseInt(limit));
    res.json(data);
  } catch (error) {
    console.error('❌ Error al obtener top clientes:', error);
    res.status(500).json({ message: 'Error al obtener datos', error: error.message });
  }
};

// ============================================================
// EXPORTAR CLIENTES A CSV
// ============================================================

exports.exportarTodosClientes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const result = await Cliente.findAll(organizacion_id, {}, 1, 99999);
    const clientes = result.clientes || [];
    if (clientes.length === 0) {
      return res.status(404).json({ message: 'No hay clientes para exportar' });
    }

    const data = clientes.map(c => ({
      'Nombre': c.nombre,
      'DUI': c.dui || '',
      'NIT': c.nit || '',
      'NRC': c.nrc || '',
      'Giro': c.giro || '',
      'Tipo Contribuyente': c.tipo_contribuyente,
      'Teléfono': c.telefono || '',
      'WhatsApp': c.telefono_whatsapp || '',
      'Correo': c.correo || '',
      'Departamento': c.nombre_departamento || '',
      'Municipio': c.nombre_municipio || '',
      'Dirección': c.direccion_linea || '',
      'Estado': c.activo === 1 ? 'Activo' : 'Inactivo',
      'Fecha Registro': c.created_at ? new Date(c.created_at).toLocaleDateString('es-SV') : '',
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

    const filename = `clientes_todos_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar todos los clientes:', error);
    res.status(500).json({ message: 'Error al exportar clientes', error: error.message });
  }
};

exports.exportarClientesFiltrados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre, nit, dui, tipo_contribuyente, giro, activo } = req.query;

    const filters = {};
    if (nombre) filters.nombre = nombre;
    if (nit) filters.nit = nit;
    if (dui) filters.dui = dui;
    if (tipo_contribuyente) filters.tipo_contribuyente = tipo_contribuyente;
    if (giro) filters.giro = giro;
    if (activo !== undefined && activo !== '') filters.activo = activo;

    const result = await Cliente.findAll(organizacion_id, filters, 1, 99999);
    const clientes = result.clientes || [];
    if (clientes.length === 0) {
      return res.status(404).json({ message: 'No hay clientes con los filtros aplicados' });
    }

    const data = clientes.map(c => ({
      'Nombre': c.nombre,
      'DUI': c.dui || '',
      'NIT': c.nit || '',
      'NRC': c.nrc || '',
      'Giro': c.giro || '',
      'Tipo Contribuyente': c.tipo_contribuyente,
      'Teléfono': c.telefono || '',
      'WhatsApp': c.telefono_whatsapp || '',
      'Correo': c.correo || '',
      'Departamento': c.nombre_departamento || '',
      'Municipio': c.nombre_municipio || '',
      'Dirección': c.direccion_linea || '',
      'Estado': c.activo === 1 ? 'Activo' : 'Inactivo',
      'Fecha Registro': c.created_at ? new Date(c.created_at).toLocaleDateString('es-SV') : '',
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

    const filename = `clientes_filtrados_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar clientes filtrados:', error);
    res.status(500).json({ message: 'Error al exportar clientes filtrados', error: error.message });
  }
};

// ============================================================
// GENERAR PDF DE CLIENTE
// ============================================================
exports.generarClientePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const cliente = await Cliente.findById(id, organizacion_id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cliente_${cliente.nombre.replace(/\s/g, '_')}.pdf`);
      res.send(pdfData);
    });

    doc.fontSize(18).font('Helvetica-Bold').text('FICHA DE CLIENTE', { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#444444').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('DATOS BÁSICOS');
    doc.moveDown(0.3);

    const info = [
      ['Nombre:', cliente.nombre],
      ['DUI:', cliente.dui || 'N/A'],
      ['NIT:', cliente.nit || 'N/A'],
      ['NRC:', cliente.nrc || 'N/A'],
      ['Giro:', cliente.giro || 'N/A'],
      ['Tipo Contribuyente:', cliente.tipo_contribuyente],
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

    doc.fontSize(12).font('Helvetica-Bold').text('UBICACIÓN Y CONTACTO');
    doc.moveDown(0.3);

    const contacto = [
      ['Departamento:', cliente.nombre_departamento || 'N/A'],
      ['Municipio:', cliente.nombre_municipio || 'N/A'],
      ['Dirección:', cliente.direccion_linea || 'N/A'],
      ['Teléfono:', cliente.telefono || 'N/A'],
      ['WhatsApp:', cliente.telefono_whatsapp || 'N/A'],
      ['Correo:', cliente.correo || 'N/A'],
    ];

    y = doc.y;
    for (const [label, value] of contacto) {
      doc.font('Helvetica-Bold').text(label, col1, y);
      doc.font('Helvetica').text(value, col2, y);
      y += rowHeight;
    }

    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica');
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-SV')}`, 50, doc.y);
    doc.text(`Estado: ${cliente.activo === 1 ? 'ACTIVO' : 'INACTIVO'}`, 400, doc.y - 10);
    doc.text('Este documento es un registro de cliente válido.', 50, doc.y + 12);

    doc.end();
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
};

// ============================================================
// EXPORTAR DATOS DE GRÁFICAS (CSV)
// ============================================================
exports.exportarGraficaClientesPorMes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio } = req.query;
    if (!anio) return res.status(400).json({ message: 'El año es requerido' });

    const data = await Cliente.getClientesPorMes(organizacion_id, anio);
    const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: 0 }));
    for (const row of data) {
      const idx = meses.findIndex(m => m.mes === row.mes);
      if (idx !== -1) meses[idx].total = row.total;
    }

    const headers = ['Mes', 'Clientes Nuevos'];
    let csv = '\uFEFFsep=;\n';
    csv += headers.join(';') + '\n';
    for (const row of meses) {
      const nombreMes = new Date(2024, row.mes - 1).toLocaleString('es', { month: 'long' });
      csv += `${nombreMes};${row.total}\n`;
    }

    const filename = `clientes_nuevos_por_mes_${anio}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar gráfica:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};

exports.exportarTopClientes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { anio, limit = 5 } = req.query;
    if (!anio) return res.status(400).json({ message: 'El año es requerido' });

    const data = await Cliente.getTopClientes(organizacion_id, anio, parseInt(limit));

    const headers = ['Cliente', 'Total Compras'];
    let csv = '\uFEFFsep=;\n';
    csv += headers.join(';') + '\n';
    for (const row of data) {
      csv += `${row.nombre};${parseFloat(row.total_compras).toFixed(2)}\n`;
    }

    const filename = `top_clientes_${anio}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar top clientes:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};

exports.getAniosDisponibles = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(created_at) AS anio FROM clientes WHERE organizacion_id = ?
       UNION
       SELECT DISTINCT YEAR(creado_en) AS anio FROM facturas WHERE organizacion_id = ?
       ORDER BY anio DESC`,
      [organizacion_id, organizacion_id]
    );
    let anios = rows.map(row => row.anio);
    if (anios.length === 0) {
      const year = new Date().getFullYear();
      anios = [year];
    }
    res.json(anios);
  } catch (error) {
    console.error('❌ Error al obtener años disponibles:', error);
    res.status(500).json({ message: 'Error al obtener años', error: error.message });
  }
};