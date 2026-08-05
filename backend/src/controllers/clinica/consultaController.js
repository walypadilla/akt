const Consulta = require('../../models/Consulta');
const Cita = require('../../models/Cita');
const Paciente = require('../../models/Paciente');
const Medico = require('../../models/Medico');
const Factura = require('../../models/Factura');
const DetalleFactura = require('../../models/DetalleFactura');
const { pool } = require('../../config/db');

exports.listar = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { paciente_id, medico_id, fecha_inicio, fecha_fin } = req.query;
    const consultas = await Consulta.findAll(organizacion_id, {
      paciente_id, medico_id, fecha_inicio, fecha_fin
    });
    res.json(consultas);
  } catch (error) {
    console.error('Error al listar consultas:', error);
    res.status(500).json({ message: 'Error al listar consultas' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const consulta = await Consulta.findById(id, organizacion_id);
    if (!consulta) {
      return res.status(404).json({ message: 'Consulta no encontrada' });
    }
    res.json(consulta);
  } catch (error) {
    console.error('Error al obtener consulta:', error);
    res.status(500).json({ message: 'Error al obtener consulta' });
  }
};

exports.crear = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };

    // Si viene con cita_id, actualizar estado de la cita
    if (data.cita_id) {
      const cita = await Cita.findById(data.cita_id, organizacion_id);
      if (cita && cita.estado !== 'Atendida') {
        await Cita.updateStatus(data.cita_id, organizacion_id, 'Atendida');
      }
    }

    const consultaId = await Consulta.create(data);
    res.status(201).json({ message: 'Consulta creada', id: consultaId });
  } catch (error) {
    console.error('Error al crear consulta:', error);
    res.status(500).json({ message: 'Error al crear consulta' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;

    const consulta = await Consulta.findById(id, organizacion_id);
    if (!consulta) {
      return res.status(404).json({ message: 'Consulta no encontrada' });
    }

    await Consulta.update(id, organizacion_id, data);
    res.json({ message: 'Consulta actualizada' });
  } catch (error) {
    console.error('Error al actualizar consulta:', error);
    res.status(500).json({ message: 'Error al actualizar consulta' });
  }
};

exports.facturar = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const usuario_id = req.user?.id || 1;

    const consulta = await Consulta.findById(id, organizacion_id);
    if (!consulta) {
      await connection.rollback();
      return res.status(404).json({ message: 'Consulta no encontrada' });
    }

    // Obtener el cliente (dueño del paciente)
    const paciente = await Paciente.findById(consulta.paciente_id, organizacion_id);
    if (!paciente) {
      await connection.rollback();
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    const { servicios, ...facturaData } = req.body;

    if (!servicios || servicios.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Debe agregar al menos un servicio' });
    }

    // Calcular totales
    let subtotal = 0;
    let iva13 = 0;
    for (const s of servicios) {
      const subtotalItem = s.cantidad * s.precio_unitario;
      subtotal += subtotalItem;
      if (s.tipo_venta === 'Gravado') {
        iva13 += subtotalItem * 0.13;
      }
    }
    const total = subtotal + iva13;

    // Generar número correlativo
    const [count] = await connection.query(
      'SELECT COUNT(*) AS total FROM facturas WHERE organizacion_id = ?',
      [organizacion_id]
    );
    const numero = `FAC-${String(count[0].total + 1).padStart(6, '0')}`;

    // Crear factura
    const [facturaResult] = await connection.query(
      `INSERT INTO facturas
       (organizacion_id, usuario_id, cliente_id, tipo_documento, numero_correlativo,
        subtotal_sumas, descuento, iva_13, total_pagar, estado, condicion_operacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizacion_id,
        usuario_id,
        paciente.cliente_id,
        facturaData.tipo_documento || 'FAF',
        numero,
        subtotal,
        0,
        iva13,
        total,
        facturaData.estado || 'Emitida',
        facturaData.condicion_operacion || 'Contado'
      ]
    );

    const facturaId = facturaResult.insertId;

    // Insertar detalles
    for (const s of servicios) {
      await connection.query(
        `INSERT INTO detalles_factura
         (factura_id, producto_id, cantidad, precio_unitario, subtotal, iva, tipo_venta)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          s.producto_id,
          s.cantidad,
          s.precio_unitario,
          s.cantidad * s.precio_unitario,
          s.tipo_venta === 'Gravado' ? (s.cantidad * s.precio_unitario * 0.13) : 0,
          s.tipo_venta || 'Gravado'
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Factura generada desde consulta',
      factura_id: facturaId,
      numero_correlativo: numero,
      total
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al facturar consulta:', error);
    res.status(500).json({ message: 'Error al facturar consulta' });
  } finally {
    connection.release();
  }
};

// ============================================================
// EXPORTAR TODAS LAS CONSULTAS (CSV)
// ============================================================
exports.exportarTodos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const result = await Consulta.findAll(organizacion_id, {}, 1, 99999);
    const consultas = result.consultas || [];

    if (consultas.length === 0) {
      return res.status(404).json({ message: 'No hay consultas para exportar' });
    }

    const data = consultas.map(c => ({
      'Fecha': c.fecha_consulta ? new Date(c.fecha_consulta).toLocaleString('es-SV') : '',
      'Paciente': c.paciente_nombre || '',
      'Médico': c.medico_nombre || '',
      'Subjetivo': c.subjetivo || '',
      'Objetivo': c.objetivo || '',
      'Análisis': c.analisis || '',
      'Plan': c.plan || '',
      'Diagnóstico': c.diagnostico_texto || '',
      'CIE-10': c.diagnostico_codigo || '',
      'Receta': c.receta || '',
      'Presión Arterial': c.presion_arterial || '',
      'Frecuencia Cardíaca': c.frecuencia_cardiaca || '',
      'Temperatura': c.temperatura || '',
      'Peso': c.peso || '',
      'Talla': c.talla || '',
      'IMC': c.imc || '',
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

    const filename = `consultas_todos_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar consultas:', error);
    res.status(500).json({ message: 'Error al exportar consultas' });
  }
};

// ============================================================
// EXPORTAR CONSULTAS FILTRADAS (CSV)
// ============================================================
exports.exportarFiltrados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { search, paciente_id, medico_id, fecha_inicio, fecha_fin } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (paciente_id) filters.paciente_id = paciente_id;
    if (medico_id) filters.medico_id = medico_id;
    if (fecha_inicio && fecha_fin) {
      filters.fecha_inicio = `${fecha_inicio} 00:00:00`;
      filters.fecha_fin = `${fecha_fin} 23:59:59`;
    }

    const result = await Consulta.findAll(organizacion_id, filters, 1, 99999);
    const consultas = result.consultas || [];

    if (consultas.length === 0) {
      return res.status(404).json({ message: 'No hay consultas con los filtros aplicados' });
    }

    // Misma estructura que exportarTodos
    const data = consultas.map(c => ({
      'Fecha': c.fecha_consulta ? new Date(c.fecha_consulta).toLocaleString('es-SV') : '',
      'Paciente': c.paciente_nombre || '',
      'Médico': c.medico_nombre || '',
      'Subjetivo': c.subjetivo || '',
      'Objetivo': c.objetivo || '',
      'Análisis': c.analisis || '',
      'Plan': c.plan || '',
      'Diagnóstico': c.diagnostico_texto || '',
      'CIE-10': c.diagnostico_codigo || '',
      'Receta': c.receta || '',
      'Presión Arterial': c.presion_arterial || '',
      'Frecuencia Cardíaca': c.frecuencia_cardiaca || '',
      'Temperatura': c.temperatura || '',
      'Peso': c.peso || '',
      'Talla': c.talla || '',
      'IMC': c.imc || '',
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

    const filename = `consultas_filtrados_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Error al exportar consultas filtradas:', error);
    res.status(500).json({ message: 'Error al exportar consultas filtradas' });
  }
};