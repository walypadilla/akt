const Factura = require('../models/Factura');
const { pool } = require('../config/db');

// --- Funciones auxiliares (getClienteInfo, generarNumeroCorrelativo) ---
async function getClienteInfo(cliente_id, organizacion_id) {
    const [rows] = await pool.query(
        'SELECT tipo_contribuyente, nit, nrc, giro, nombre, telefono FROM clientes WHERE id = ? AND organizacion_id = ?',
        [cliente_id, organizacion_id]
    );
    return rows[0];
}

async function generarNumeroCorrelativo(organizacion_id, tipo_documento) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS count FROM facturas 
         WHERE organizacion_id = ? AND tipo_documento = ? AND eliminado_en IS NULL`,
        [organizacion_id, tipo_documento]
    );
    const count = rows[0].count + 1;
    const prefix = tipo_documento === 'CCF' ? 'CCF' : 'FAF';
    return `${prefix}-${String(count).padStart(6, '0')}`;
}

// --- Controladores existentes ---
exports.crearFactura = async (req, res) => { /* igual que antes */ };
exports.obtenerFacturas = async (req, res) => { /* igual */ };
exports.anularFactura = async (req, res) => { /* igual */ };

// --- Nuevos controladores ---
exports.obtenerUltimasFacturas = async (req, res) => {
    try {
        const { organizacion_id } = req;
        const limit = parseInt(req.query.limit) || 14;
        const facturas = await Factura.findLatestByOrganizacion(organizacion_id, limit);
        res.json(facturas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener últimas facturas' });
    }
};

exports.buscarFacturas = async (req, res) => {
    try {
        const { organizacion_id } = req;
        const filters = {
            cliente_id: req.query.cliente_id,
            monto_min: req.query.monto_min,
            monto_max: req.query.monto_max,
            mes: req.query.mes,
            anio: req.query.anio,
            estado: req.query.estado,
            tipo_documento: req.query.tipo_documento,
        };
        const facturas = await Factura.searchByFilters(organizacion_id, filters);
        res.json(facturas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en búsqueda de facturas' });
    }
};

exports.cambiarEstadoFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const { organizacion_id } = req;
        if (!['Borrador', 'Emitida', 'Pagada', 'Anulada'].includes(estado)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }
        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }
        if (factura.estado === 'Anulada') {
            return res.status(400).json({ message: 'No se puede modificar una factura anulada' });
        }
        await Factura.update(id, organizacion_id, { estado });
        res.json({ message: 'Estado actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cambiar estado' });
    }
};

exports.editarFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const { organizacion_id } = req;
        const { descuento, intereses_mora, cliente_id } = req.body;
        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }
        if (factura.estado === 'Anulada') {
            return res.status(400).json({ message: 'No se puede editar una factura anulada' });
        }
        let updateData = {};
        if (descuento !== undefined) updateData.descuento = descuento;
        if (intereses_mora !== undefined) updateData.intereses_mora = intereses_mora;
        if (cliente_id !== undefined) updateData.cliente_id = cliente_id;
        // Recalcular si cambia descuento o intereses
        if (updateData.descuento !== undefined || updateData.intereses_mora !== undefined) {
            const subtotal = factura.subtotal_sumas;
            const descuentoNuevo = updateData.descuento !== undefined ? updateData.descuento : factura.descuento;
            const interesesNuevo = updateData.intereses_mora !== undefined ? updateData.intereses_mora : factura.intereses_mora;
            const base = subtotal - descuentoNuevo;
            const iva = base * 0.13;
            let retencion = factura.retencion_1; // mantenemos la original
            const total = base + iva - retencion + interesesNuevo;
            updateData.iva_13 = Math.round(iva * 100) / 100;
            updateData.total_pagar = Math.round(total * 100) / 100;
        }
        await Factura.update(id, organizacion_id, updateData);
        res.json({ message: 'Factura actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al editar factura' });
    }
};

exports.generarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;

    // Buscar la factura con los datos del cliente
    const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura_${factura.numero_correlativo}.pdf`);
      res.send(pdfData);
    });

    // Construir el PDF
    doc.fontSize(16).text('Factura', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Número: ${factura.numero_correlativo}`);
    doc.text(`Fecha: ${factura.creado_en}`);
    doc.text(`Cliente: ${factura.cliente_nombre}`);
    doc.text(`NIT: ${factura.nit || 'N/A'}`);
    doc.text(`Tipo: ${factura.tipo_documento}`);
    doc.moveDown();
    doc.text(`Subtotal: $${factura.subtotal_sumas}`);
    doc.text(`Descuento: $${factura.descuento}`);
    doc.text(`IVA (13%): $${factura.iva_13}`);
    if (factura.retencion_1 > 0) doc.text(`Retención (1%): $${factura.retencion_1}`);
    if (factura.intereses_mora > 0) doc.text(`Intereses mora: $${factura.intereses_mora}`);
    doc.text(`Total a pagar: $${factura.total_pagar}`, { bold: true });
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar PDF: ' + error.message });
  }
};

exports.obtenerFacturaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const { organizacion_id } = req;
        const factura = await Factura.findByIdAndOrganizacion(id, organizacion_id);
        if (!factura) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }
        res.json(factura);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener factura' });
    }
};