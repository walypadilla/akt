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
    const { paciente_id, medico_id, anio, mes, search, fecha_inicio, fecha_fin } = req.query;

    const consultas = await Consulta.findAll(organizacion_id, {
      paciente_id, medico_id, anio, mes, search, fecha_inicio, fecha_fin,
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

    // 🔧 Convertir fecha del formato datetime-local al formato MySQL
    if (data.fecha_consulta) {
      data.fecha_consulta = data.fecha_consulta.replace('T', ' ');
      if (data.fecha_consulta.length === 16) {
        data.fecha_consulta += ':00';
      }
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
    const usuario_id = req.usuario_id; // viene del authMiddleware

    // ============================================================
    // 1. VALIDAR QUE EXISTA LA CONSULTA
    // ============================================================
    const consulta = await Consulta.findById(id, organizacion_id);
    if (!consulta) {
      await connection.rollback();
      return res.status(404).json({ message: 'Consulta no encontrada' });
    }

    // ============================================================
    // 2. VALIDAR QUE LA CONSULTA NO ESTÉ YA FACTURADA
    //    (a menos que su factura esté anulada)
    // ============================================================
    if (consulta.factura_id) {
      const [facturaExistente] = await connection.query(
        'SELECT id, estado FROM facturas WHERE id = ? AND organizacion_id = ?',
        [consulta.factura_id, organizacion_id]
      );
      if (facturaExistente.length > 0 && facturaExistente[0].estado !== 'Anulada') {
        await connection.rollback();
        return res.status(400).json({
          message: 'Esta consulta ya tiene una factura activa asociada',
        });
      }
    }

    // ============================================================
    // 3. OBTENER EL PACIENTE Y SU CLIENTE ASOCIADO
    // ============================================================
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

    // ============================================================
    // 4. 🔐 VALIDACIÓN DE PRECIOS DESDE LA BD
    //    No confiamos en los precios del frontend. Los recalculamos.
    // ============================================================
    const serviciosValidados = [];
    let subtotal = 0;
    let iva13 = 0;

    for (const s of servicios) {
      const [prod] = await connection.query(
        `SELECT id, nombre, precio_unitario, tipo, stock_actual
         FROM productos
         WHERE id = ? AND organizacion_id = ?`,
        [s.producto_id, organizacion_id]
      );

      if (prod.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          message: `Producto con ID ${s.producto_id} no encontrado en esta organización`,
        });
      }

      const producto = prod[0];
      const cantidad = parseInt(s.cantidad) || 1;
      const precioReal = parseFloat(producto.precio_unitario);
      const subtotalItem = cantidad * precioReal;
      const tipoVenta = s.tipo_venta || 'Gravado';

      // Log de control (útil para auditoría si alguien manipula precios)
      if (Math.abs((s.precio_unitario || 0) - precioReal) > 0.01) {
        console.warn(
          `⚠️ Precio manipulado detectado: producto ${producto.id} ` +
          `- enviado: $${s.precio_unitario}, real: $${precioReal}. ` +
          `Se usará el precio real.`
        );
      }

      subtotal += subtotalItem;
      if (tipoVenta === 'Gravado') {
        iva13 += subtotalItem * 0.13;
      }

      serviciosValidados.push({
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        cantidad,
        precio_unitario: precioReal,
        subtotal: subtotalItem,
        tipo_venta: tipoVenta,
        iva: tipoVenta === 'Gravado' ? subtotalItem * 0.13 : 0,
      });
    }

    const total = subtotal + iva13;

    // ============================================================
    // 5. GENERAR NÚMERO CORRELATIVO
    // ============================================================
    const [count] = await connection.query(
      'SELECT COUNT(*) AS total FROM facturas WHERE organizacion_id = ?',
      [organizacion_id]
    );
    const numero = `FAC-${String(count[0].total + 1).padStart(6, '0')}`;

    // ============================================================
    // 6. INSERTAR FACTURA
    // ============================================================
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
        facturaData.condicion_operacion || 'Contado',
      ]
    );

    const facturaId = facturaResult.insertId;

    // ============================================================
    // 7. VINCULAR LA FACTURA A LA CONSULTA
    // ============================================================
    await connection.query(
      `UPDATE consultas SET factura_id = ? WHERE id = ? AND organizacion_id = ?`,
      [facturaId, id, organizacion_id]
    );

    // ============================================================
    // 8. ✅ VINCULAR LA FACTURA A LAS VACUNAS APLICADAS EN LA CONSULTA
    //    (solo las que aún no tienen factura)
    // ============================================================
    const [vacunasVinculadas] = await connection.query(
      `UPDATE historial_vacunas 
       SET factura_id = ? 
       WHERE consulta_id = ? 
         AND organizacion_id = ? 
         AND factura_id IS NULL`,
      [facturaId, id, organizacion_id]
    );

    if (vacunasVinculadas.affectedRows > 0) {
      console.log(
        `💉 Vinculadas ${vacunasVinculadas.affectedRows} vacuna(s) a la factura ${numero}`
      );
    }

    // ============================================================
    // 9. ✅ VINCULAR LA FACTURA A LAS SOLICITUDES DE EXAMEN INTERNAS
    //    (solo las que aún no tienen factura)
    // ============================================================
    const [examenesVinculados] = await connection.query(
      `UPDATE solicitudes_examen 
       SET factura_id = ? 
       WHERE consulta_id = ? 
         AND organizacion_id = ? 
         AND tipo_ejecucion = 'Interno'
         AND factura_id IS NULL`,
      [facturaId, id, organizacion_id]
    );

    if (examenesVinculados.affectedRows > 0) {
      console.log(
        `🔬 Vinculados ${examenesVinculados.affectedRows} examen(es) a la factura ${numero}`
      );
    }

    // ============================================================
    // 10. INSERTAR DETALLES DE LA FACTURA (usando precios validados)
    // ============================================================
    for (const s of serviciosValidados) {
      await connection.query(
        `INSERT INTO detalles_factura
         (factura_id, producto_id, cantidad, precio_unitario, subtotal, iva, tipo_venta)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          s.producto_id,
          s.cantidad,
          s.precio_unitario,
          s.subtotal,
          s.iva,
          s.tipo_venta,
        ]
      );
    }

    // ============================================================
    // 11. COMMIT
    // ============================================================
    await connection.commit();

    res.status(201).json({
      message: 'Factura generada desde consulta',
      factura_id: facturaId,
      numero_correlativo: numero,
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva: parseFloat(iva13.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      vacunas_vinculadas: vacunasVinculadas.affectedRows || 0,
      examenes_vinculados: examenesVinculados.affectedRows || 0,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al facturar consulta:', error);
    res.status(500).json({
      message: 'Error al facturar consulta',
      error: error.message,
    });
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
    const { search, paciente_id, medico_id, anio, mes, fecha_inicio, fecha_fin } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (paciente_id) filters.paciente_id = paciente_id;
    if (medico_id) filters.medico_id = medico_id;
    if (anio) filters.anio = anio;
    if (mes) filters.mes = mes;
    if (fecha_inicio && fecha_fin) {
      filters.fecha_inicio = fecha_inicio;
      filters.fecha_fin = fecha_fin;
    }

    const consultas = await Consulta.findAll(organizacion_id, filters, 1, 99999);

    if (consultas.length === 0) {
      return res.status(404).json({ message: 'No hay consultas con los filtros aplicados' });
    }

    const data = consultas.map((c) => ({
      'SKU': c.codigo_sku || '',
      'Fecha': c.fecha_consulta ? new Date(c.fecha_consulta).toLocaleString('es-SV') : '',
      'Paciente': `${c.paciente_nombre || ''} ${c.paciente_apellidos || ''}`.trim(),
      'Médico': c.medico_nombre || '',
      'Motivo': c.subjetivo || '',
      'Diagnóstico': c.diagnostico_texto || '',
      'CIE-10': c.diagnostico_codigo || '',
      'Receta': c.receta || '',
      'N° Factura': c.factura_numero || 'Sin factura',
      'Estado Factura': c.factura_estado || '-',
      'Total Factura': c.factura_total ? `$${parseFloat(c.factura_total).toFixed(2)}` : '$0.00',
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

    const filename = `consultas_filtrados_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar consultas filtradas:', error);
    res.status(500).json({ message: 'Error al exportar consultas filtradas' });
  }
};

exports.getAniosDisponibles = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const anios = await Consulta.getAniosDisponibles(organizacion_id);
    res.json(anios);
  } catch (error) {
    console.error('Error al obtener años:', error);
    res.status(500).json({ message: 'Error al obtener años' });
  }
};

exports.getExamenesInternos = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const [rows] = await pool.query(
      `SELECT 
        s.id AS solicitud_id,
        s.tipo_ejecucion,
        s.estado AS examen_estado,
        e.id AS examen_id,
        e.nombre AS examen_nombre,
        e.precio,
        e.producto_id
       FROM solicitudes_examen s
       JOIN examenes e ON s.examen_id = e.id
       WHERE s.consulta_id = ? 
         AND s.organizacion_id = ?
         AND s.tipo_ejecucion = 'Interno'
         AND e.producto_id IS NOT NULL`,
      [id, organizacion_id]
    );

    res.json(rows || []);
  } catch (error) {
    console.error('Error al obtener exámenes internos:', error);
    res.status(500).json({ message: 'Error al obtener exámenes internos' });
  }
};

exports.getVacunasAplicadasConsulta = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;

    const [rows] = await pool.query(
      `SELECT 
        h.id AS historial_id,
        h.fecha_aplicacion,
        h.lote,
        h.observaciones,
        v.id AS vacuna_id,
        v.nombre AS vacuna_nombre,
        p.id AS producto_id,
        p.nombre AS producto_nombre,
        p.precio_unitario,
        p.stock_actual
       FROM historial_vacunas h
       JOIN vacunas v ON h.vacuna_id = v.id
       JOIN productos p ON v.producto_id = p.id
       WHERE h.consulta_id = ?
         AND h.organizacion_id = ?
         AND h.factura_id IS NULL
         AND v.producto_id IS NOT NULL
       ORDER BY h.fecha_aplicacion ASC`,
      [id, organizacion_id]
    );

    res.json(rows || []);
  } catch (error) {
    console.error('Error al obtener vacunas aplicadas:', error);
    res.status(500).json({ message: 'Error al obtener vacunas aplicadas' });
  }
};