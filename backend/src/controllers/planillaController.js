// backend/src/controllers/planillaController.js
const Planilla = require('../models/Planilla');
const Empleado = require('../models/Empleado');
const PeriodoPago = require('../models/PeriodoPago');
const Ausencia = require('../models/Ausencia');
const HoraExtra = require('../models/HoraExtra');
const { pool } = require('../config/db');

// ============================================================
// TABLAS DE ISR ACTUALIZADAS (El Salvador 2025)
// ============================================================

function calcularISR(salarioGravable, tipoPeriodo = 'Mensual') {
  let tramos;
  if (tipoPeriodo === 'Mensual') {
    tramos = [
      { hasta: 550.00, excedente: 0, porcentaje: 0, cuotaFija: 0 },
      { hasta: 895.24, excedente: 550.00, porcentaje: 0.10, cuotaFija: 17.67 },
      { hasta: 2038.10, excedente: 895.24, porcentaje: 0.20, cuotaFija: 60.00 },
      { hasta: Infinity, excedente: 2038.10, porcentaje: 0.30, cuotaFija: 288.57 }
    ];
  } else if (tipoPeriodo === 'Quincenal') {
    tramos = [
      { hasta: 275.00, excedente: 0, porcentaje: 0, cuotaFija: 0 },
      { hasta: 447.62, excedente: 275.00, porcentaje: 0.10, cuotaFija: 8.83 },
      { hasta: 1019.05, excedente: 447.62, porcentaje: 0.20, cuotaFija: 30.00 },
      { hasta: Infinity, excedente: 1019.05, porcentaje: 0.30, cuotaFija: 144.28 }
    ];
  } else if (tipoPeriodo === 'Semanal') {
    tramos = [
      { hasta: 137.50, excedente: 0, porcentaje: 0, cuotaFija: 0 },
      { hasta: 223.81, excedente: 137.50, porcentaje: 0.10, cuotaFija: 4.42 },
      { hasta: 509.52, excedente: 223.81, porcentaje: 0.20, cuotaFija: 15.00 },
      { hasta: Infinity, excedente: 509.52, porcentaje: 0.30, cuotaFija: 72.14 }
    ];
  } else {
    tramos = [
      { hasta: 550.00, excedente: 0, porcentaje: 0, cuotaFija: 0 },
      { hasta: 895.24, excedente: 550.00, porcentaje: 0.10, cuotaFija: 17.67 },
      { hasta: 2038.10, excedente: 895.24, porcentaje: 0.20, cuotaFija: 60.00 },
      { hasta: Infinity, excedente: 2038.10, porcentaje: 0.30, cuotaFija: 288.57 }
    ];
  }

  let isr = 0;
  for (const tramo of tramos) {
    if (salarioGravable <= tramo.hasta) {
      if (tramo.excedente > 0 && salarioGravable > tramo.excedente) {
        isr = (salarioGravable - tramo.excedente) * tramo.porcentaje + tramo.cuotaFija;
      } else {
        isr = 0;
      }
      break;
    }
  }
  return Math.round(isr * 100) / 100;
}

// ============================================================
// OBTENER AÑOS DISPONIBLES
// ============================================================
exports.getAniosDisponibles = async (req, res) => {
  try {
    const anios = await Planilla.getAniosDisponibles(req.organizacion_id);
    const currentYear = new Date().getFullYear();
    if (!anios.includes(currentYear)) anios.push(currentYear);
    anios.sort((a, b) => b - a);
    res.json(anios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener años disponibles', error: error.message });
  }
};

// ============================================================
// OBTENER PLANILLAS
// ============================================================
exports.obtenerPlanillas = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { mes, anio, estado } = req.query;
    const planillas = await Planilla.findByOrganizacion(organizacion_id, mes, anio, estado);
    res.json(planillas || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener planillas', error: error.message });
  }
};

// ============================================================
// GENERAR PLANILLA INDIVIDUAL (con múltiples períodos)
// ============================================================
exports.generarPlanillaIndividual = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { empleado_id, mes, anio, tipoPer, fechaFin, periodo_id_custom } = req.body; 
    const organizacion_id = req.user?.organizacion_id || req.body.organizacion_id;

    if (!organizacion_id) {
      await connection.rollback();
      return res.status(400).json({ message: 'No se encontró la organización del usuario' });
    }

    let numPeriodos, diasPeriodo, limiteMes;
    const tipoPeriodoFinal = tipoPer || 'Mensual';
    
    if (tipoPeriodoFinal === 'Semanal') {
      numPeriodos = 4; diasPeriodo = 7; limiteMes = 4;
    } else if (tipoPeriodoFinal === 'Quincenal') {
      numPeriodos = 2; diasPeriodo = 15; limiteMes = 2;
    } else {
      numPeriodos = 1; diasPeriodo = 30; limiteMes = 1;
    }

    // Validación del límite antes de generar, asegurando el filtro por organización
    const planillasGeneradasMes = await Planilla.getCountByEmpleadoMes(empleado_id, mes, anio, organizacion_id);
    if (planillasGeneradasMes >= limiteMes) {
      await connection.rollback();
      return res.status(400).json({ message: `Ya no puedes generar boletas porque ya generaste las ${limiteMes} boletas del mes.` });
    }

    let generadas = 0;
    for (let p = 0; p < numPeriodos; p++) {
      const inicioPeriodo = new Date(anio, mes - 1, 1 + p * diasPeriodo);
      const finPeriodo = new Date(Math.min(inicioPeriodo.getTime() + (diasPeriodo - 1) * 86400000, new Date(fechaFin || new Date()).getTime()));

      let periodoId = periodo_id_custom || (p + 1); 

      const existe = await Planilla.existePlanilla(empleado_id, periodoId, organizacion_id); 
      if (!existe) {
        
        await Planilla.create({
          organizacion_id,
          empleado_id,
          periodo_id: periodoId,
          mes,
          anio,
          tipo_periodo: tipoPeriodoFinal,
          // ... tus demás campos (isss, afp, renta, etc.)
        }, connection);

        generadas++;
        break; 
      }
    }

    await connection.commit();
    res.status(200).json({ message: 'Planilla generada con éxito', generadas });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Error al generar la planilla' });
  } finally {
    connection.release();
  }
};


// ============================================================
// GENERAR PLANILLA MASIVA (con múltiples períodos)
// ============================================================
exports.generarPlanillaMasiva = async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { mes, anio, tipo_periodo } = req.body;
      const tipoPer = tipo_periodo || 'Mensual';

      // 1. Determinar límites por tipo de período
      let numPeriodos, diasPeriodo, limiteMes;
      if (tipoPer === 'Semanal') {
        numPeriodos = 4; diasPeriodo = 7; limiteMes = 4;
      } else if (tipoPer === 'Quincenal') {
        numPeriodos = 2; diasPeriodo = 15; limiteMes = 2;
      } else {
        numPeriodos = 1; diasPeriodo = 30; limiteMes = 1;
      }

      // 2. Obtener todos los empleados activos
      const [empleados] = await connection.query('SELECT id, salario_base FROM empleados_nomina WHERE activo = 1');

      let generadas = 0;

      // 3. Iterar sobre cada empleado activo
      for (const empleado of empleados) {
        const empleado_id = empleado.id;

        // 4. Validar el límite de boletas para ESTE empleado en este mes
        const planillasGeneradasMes = await Planilla.getCountByEmpleadoMes(empleado_id, mes, anio);

        // Si el empleado ya llegó al límite (ej. 2 boletas en quincenal), lo saltamos
        if (planillasGeneradasMes >= limiteMes) {
          continue; 
        }

        // 5. Generar SOLO el primer período faltante
        for (let p = 0; p < numPeriodos; p++) {
          const inicioPeriodo = new Date(anio, mes - 1, 1 + p * diasPeriodo);
          
          // Nota: Asegúrate de adaptar esta línea a cómo obtienes tu periodoId actualmente
          let periodoId = 1; 

          const existe = await Planilla.existePlanilla(empleado_id, periodoId);
          if (!existe) {
            
            // Insertar la planilla en base de datos
            await Planilla.create({
              empleado_id,
              mes,
              anio,
              tipo_periodo: tipoPer,
              // ... aquí va tu lógica de isss, afp, renta, etc ...
            }, connection);

            generadas++;
            break; // IMPORTANTE: Rompemos el ciclo para que genere solo 1 boleta por empleado
          }
        }
      }

      await connection.commit();
      res.status(200).json({ message: `Generación masiva completada. Se generaron ${generadas} planillas en Borrador.`, generadas });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ message: 'Error al generar las planillas masivas' });
    } finally {
      connection.release();
    }
  }

// ============================================================
// CAMBIAR ESTADO DE PLANILLA
// ============================================================
exports.cambiarEstadoPlanilla = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const { organizacion_id } = req;
    const planilla = await Planilla.findById(id, organizacion_id);
    if (!planilla) {
      return res.status(404).json({ message: 'Planilla no encontrada' });
    }
    if (planilla.estado === 'Pagada' && estado === 'Anulada') {
      return res.status(400).json({ message: 'No se puede anular una planilla que ya está pagada' });
    }
    if (estado === 'Pagada' && planilla.estado !== 'Cerrada') {
      return res.status(400).json({ message: 'Para pagar, la planilla debe estar en estado "Cerrada"' });
    }
    const updateData = { estado };
    if (estado === 'Pagada') {
      updateData.pagado_en = new Date().toISOString().split('T')[0];
    }
    await Planilla.update(id, organizacion_id, updateData);
    res.json({ message: `Estado cambiado a ${estado}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
  }
};

// ============================================================
// CAMBIAR ESTADO DE MÚLTIPLES PLANILLAS
// ============================================================
exports.cambiarEstadoMultiple = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { ids, estado } = req.body;
    const { organizacion_id } = req;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Se requiere un array de IDs' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await connection.query(
      `SELECT id, estado FROM planillas WHERE id IN (${placeholders}) AND organizacion_id = ?`,
      [...ids, organizacion_id]
    );
    let actualizados = 0;
    for (const p of rows) {
      if (p.estado === 'Pagada' && estado === 'Anulada') continue;
      await connection.query(
        'UPDATE planillas SET estado = ? WHERE id = ? AND organizacion_id = ?',
        [estado, p.id, organizacion_id]
      );
      actualizados++;
    }
    await connection.commit();
    res.json({ message: `${actualizados} planillas actualizadas a ${estado}` });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Error al cambiar estado múltiple', error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// ELIMINAR PLANILLA (cambiar a estado 'Anulada')
// ============================================================
exports.eliminarPlanilla = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const planilla = await Planilla.findById(id, organizacion_id);
    if (!planilla) {
      return res.status(404).json({ message: 'Planilla no encontrada' });
    }
    if (planilla.estado === 'Pagada') {
      return res.status(400).json({ message: 'No se puede anular una planilla pagada' });
    }
    await Planilla.update(id, organizacion_id, { estado: 'Anulada' });
    res.json({ message: 'Planilla anulada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al anular planilla', error: error.message });
  }
};

// ============================================================
// AUSENCIAS
// ============================================================
exports.crearAusencia = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { empleado_id, fecha, tipo, remunerada, dias, observacion } = req.body;
    const id = await Ausencia.create({ organizacion_id, empleado_id, fecha, tipo, remunerada, dias, observacion });
    res.status(201).json({ message: 'Ausencia registrada', id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar ausencia', error: error.message });
  }
};

exports.obtenerAusencias = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { empleado_id, mes, anio } = req.query;
    let sql = `
      SELECT a.*, e.nombre AS empleado_nombre, e.apellidos, e.salario_base
      FROM ausencias_empleado a
      JOIN empleados_nomina e ON a.empleado_id = e.id
      WHERE a.organizacion_id = ?
    `;
    const params = [organizacion_id];
    if (empleado_id) { sql += ' AND a.empleado_id = ?'; params.push(empleado_id); }
    if (mes) { sql += ' AND MONTH(a.fecha) = ?'; params.push(mes); }
    if (anio) { sql += ' AND YEAR(a.fecha) = ?'; params.push(anio); }
    sql += ' ORDER BY a.fecha DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener ausencias', error: error.message });
  }
};

exports.eliminarAusencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const deleted = await Ausencia.delete(id, organizacion_id);
    if (!deleted) return res.status(404).json({ message: 'Ausencia no encontrada' });
    res.json({ message: 'Ausencia eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar ausencia', error: error.message });
  }
};

// ============================================================
// HORAS EXTRAS
// ============================================================
exports.crearHoraExtra = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { empleado_id, mes, anio, horas, descripcion } = req.body;

    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0);
    let periodo = await PeriodoPago.findByFecha(organizacion_id, fechaInicio);
    let periodoId;
    if (!periodo) {
      periodoId = await PeriodoPago.create(
        organizacion_id,
        'Mensual',
        fechaInicio.toISOString().split('T')[0],
        fechaFin.toISOString().split('T')[0],
        mes,
        anio
      );
    } else {
      periodoId = periodo.id;
    }

    const existePlanilla = await Planilla.existePlanilla(empleado_id, periodoId);
    if (existePlanilla) {
      return res.status(400).json({ message: 'Ya existe una planilla para este período. No se pueden registrar horas extras.' });
    }

    const empleado = await Empleado.findById(empleado_id, organizacion_id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    const salarioDiario = parseFloat(empleado.salario_base) / 30;
    const valorHoraExtra = salarioDiario / 8 * 1.5;
    const montoTotal = horas * valorHoraExtra;

    const id = await HoraExtra.create({
      organizacion_id,
      empleado_id,
      periodo_id: periodoId,
      horas,
      monto_total: Math.round(montoTotal * 100) / 100,
      descripcion
    });
    res.status(201).json({ message: 'Hora extra registrada', id, monto_total: montoTotal });
  } catch (error) {
    console.error('❌ [crearHoraExtra] Error:', error);
    res.status(500).json({ message: 'Error al registrar hora extra', error: error.message });
  }
};

exports.obtenerHorasExtras = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { periodo_id } = req.query;
    const horas = await HoraExtra.findByPeriodo(periodo_id, organizacion_id);
    res.json(horas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener horas extras', error: error.message });
  }
};

exports.eliminarHoraExtra = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const deleted = await HoraExtra.delete(id, organizacion_id);
    if (!deleted) return res.status(404).json({ message: 'Hora extra no encontrada' });
    res.json({ message: 'Hora extra eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar hora extra', error: error.message });
  }
};

// ============================================================
// EXPORTAR PLANILLAS A CSV
// ============================================================
exports.exportarPlanillas = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { mes, anio } = req.query;
    const planillas = await Planilla.findByOrganizacion(organizacion_id, mes, anio);
    if (!planillas || !Array.isArray(planillas) || planillas.length === 0) {
      return res.status(404).json({ message: 'No hay planillas para exportar' });
    }
    const data = planillas.map(p => ({
      'Empleado': p.empleado_nombre,
      'Mes': p.mes,
      'Año': p.anio,
      'Días Trabajados': p.dias_trabajados,
      'Días Ausencia': p.dias_ausencia,
      'Incapacidad Días': p.incapacidad_dias,
      'Descuento Ausencias': p.descuento_ausencias || 0,
      'Horas Extras': p.horas_extras_monto,
      'ISSS': p.descuento_isss,
      'AFP': p.descuento_afp,
      'ISR': p.descuento_renta,
      'ISSS Patronal': p.isss_patronal,
      'AFP Patronal': p.afp_patronal,
      'Neto': p.salario_neto_pagar,
      'Estado': p.estado
    }));
    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }
    const filename = `planillas_${mes || 'todos'}_${anio || 'todos'}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al exportar planillas', error: error.message });
  }
};

// ============================================================
// EXPORTAR AUSENCIAS A CSV
// ============================================================
exports.exportarAusencias = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { mes, anio, empleado_id } = req.query;
    let sql = `
      SELECT a.*, e.nombre AS empleado_nombre, e.apellidos, e.salario_base
      FROM ausencias_empleado a
      JOIN empleados_nomina e ON a.empleado_id = e.id
      WHERE a.organizacion_id = ?
    `;
    const params = [organizacion_id];
    if (empleado_id) { sql += ' AND a.empleado_id = ?'; params.push(empleado_id); }
    if (mes) { sql += ' AND MONTH(a.fecha) = ?'; params.push(mes); }
    if (anio) { sql += ' AND YEAR(a.fecha) = ?'; params.push(anio); }
    sql += ' ORDER BY a.fecha DESC';
    const [rows] = await pool.query(sql, params);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'No hay ausencias para exportar' });
    }
    const data = rows.map(r => {
      const salarioDiario = parseFloat(r.salario_base) / 30;
      const descuento = !r.remunerada ? salarioDiario * parseFloat(r.dias) : 0;
      return {
        'Empleado': `${r.empleado_nombre} ${r.apellidos || ''}`,
        'Fecha': new Date(r.fecha).toLocaleDateString('es-SV'),
        'Días': r.dias,
        'Tipo': r.tipo,
        'Remunerada': r.remunerada ? 'Sí' : 'No',
        'Descuento Aplicado': descuento.toFixed(2),
        'Observación': r.observacion || ''
      };
    });
    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }
    const filename = `ausencias_${mes || 'todos'}_${anio || 'todos'}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al exportar ausencias', error: error.message });
  }
};

// ============================================================
// EXPORTAR HORAS EXTRAS A CSV
// ============================================================
exports.exportarHorasExtras = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { mes, anio, empleado_id } = req.query;
    let sql = `
      SELECT h.*, e.nombre AS empleado_nombre, e.apellidos,
             p.mes, p.anio
      FROM horas_extras_empleado h
      JOIN empleados_nomina e ON h.empleado_id = e.id
      JOIN periodos_pago p ON h.periodo_id = p.id
      WHERE h.organizacion_id = ?
    `;
    const params = [organizacion_id];
    if (empleado_id) { sql += ' AND h.empleado_id = ?'; params.push(empleado_id); }
    if (mes) { sql += ' AND p.mes = ?'; params.push(mes); }
    if (anio) { sql += ' AND p.anio = ?'; params.push(anio); }
    sql += ' ORDER BY h.created_at DESC';
    const [rows] = await pool.query(sql, params);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'No hay horas extras para exportar' });
    }
    const data = rows.map(r => ({
      'Empleado': `${r.empleado_nombre} ${r.apellidos || ''}`,
      'Período': `${r.mes}/${r.anio}`,
      'Horas': r.horas,
      'Monto Total': parseFloat(r.monto_total).toFixed(2),
      'Descripción': r.descripcion || ''
    }));
    const headers = Object.keys(data[0]);
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined ? row[h] : '';
        val = String(val);
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }
    const filename = `horas_extras_${mes || 'todos'}_${anio || 'todos'}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ [exportarHorasExtras] Error:', error);
    res.status(500).json({ message: 'Error al exportar horas extras', error: error.message });
  }
};

// ============================================================
// GENERAR BOLETA PDF
// ============================================================
exports.generarBoletaPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const planilla = await Planilla.findById(id, organizacion_id);
    if (!planilla) {
      return res.status(404).json({ message: 'Planilla no encontrada' });
    }
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=boleta_${planilla.empleado_nombre}_${planilla.mes}_${planilla.anio}.pdf`);
      res.send(pdfData);
    });

    doc.fontSize(18).text('BOLETA DE PAGO', { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10);
    const empleadoNombre = `${planilla.empleado_nombre} ${planilla.apellidos || ''}`;
    const periodo = `${planilla.mes}/${planilla.anio}`;
    const tipoPago = planilla.tipo_periodo || 'Mensual';
    const diasTrabajados = planilla.dias_trabajados || 0;
    const diasAusencia = planilla.dias_ausencia || 0;
    const incapacidadDias = planilla.incapacidad_dias || 0;
    const salarioBase = parseFloat(planilla.salario_base) || 0;

    doc.text(`Empleado: ${empleadoNombre}`, 50, doc.y);
    doc.text(`Período: ${periodo}`, 300, doc.y - 12);
    doc.text(`Tipo de Pago: ${tipoPago}`, 50, doc.y + 15);
    doc.text(`Días Trabajados: ${diasTrabajados}`, 300, doc.y + 3);
    doc.text(`Días Ausencia: ${diasAusencia}`, 50, doc.y + 30);
    doc.text(`Incapacidad Días: ${incapacidadDias}`, 300, doc.y + 18);
    doc.moveDown(0.5);

    const margin = 50;
    const tableTop = doc.y + 10;
    const col1 = 50;
    const col2 = 200;
    const col3 = 350;
    const col4 = 450;
    const rowHeight = 18;

    const drawRow = (y, text1, text2, text3, text4, bold = false) => {
      doc.fontSize(9);
      if (bold) doc.font('Helvetica-Bold');
      else doc.font('Helvetica');
      doc.text(text1, col1, y);
      doc.text(text2, col2, y);
      doc.text(text3, col3, y);
      doc.text(text4, col4, y);
    };

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Concepto', col1, tableTop);
    doc.text('Haberes', col2, tableTop);
    doc.text('Descuentos', col3, tableTop);
    doc.text('Aportes Patronales', col4, tableTop);
    doc.moveDown(0.2);
    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(margin, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.2);

    let y = doc.y;
    const isss = parseFloat(planilla.descuento_isss) || 0;
    const afp = parseFloat(planilla.descuento_afp) || 0;
    const renta = parseFloat(planilla.descuento_renta) || 0;
    const horasExtras = parseFloat(planilla.horas_extras_monto) || 0;
    const descAusencias = parseFloat(planilla.descuento_ausencias) || 0;
    const isssPatronal = parseFloat(planilla.isss_patronal) || 0;
    const afpPatronal = parseFloat(planilla.afp_patronal) || 0;
    const neto = parseFloat(planilla.salario_neto_pagar) || 0;

    drawRow(y, 'Salario Base', `$${salarioBase.toFixed(2)}`, '', '');
    y += rowHeight;
    drawRow(y, 'Horas Extras', `$${horasExtras.toFixed(2)}`, '', '');
    y += rowHeight;
    if (descAusencias > 0) {
      drawRow(y, 'Descuento Ausencias', '', `$${descAusencias.toFixed(2)}`, '');
      y += rowHeight;
    }
    drawRow(y, 'ISSS', '', `$${isss.toFixed(2)}`, '');
    y += rowHeight;
    drawRow(y, 'AFP', '', `$${afp.toFixed(2)}`, '');
    y += rowHeight;
    drawRow(y, 'ISR', '', `$${renta.toFixed(2)}`, '');
    y += rowHeight;
    drawRow(y, 'ISSS Patronal', '', '', `$${isssPatronal.toFixed(2)}`);
    y += rowHeight;
    drawRow(y, 'AFP Patronal', '', '', `$${afpPatronal.toFixed(2)}`);
    y += rowHeight;

    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(margin, y).lineTo(550, y).stroke();
    y += rowHeight;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`NETO A PAGAR: $${neto.toFixed(2)}`, 50, y);
    doc.text(`Estado: ${planilla.estado}`, 400, y);

    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica');
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-SV')}`, 50, doc.y);
    doc.text('Este documento es un comprobante de pago válido.', 50, doc.y + 12);

    doc.end();
  } catch (error) {
    console.error('❌ [generarBoletaPDF] Error:', error);
    res.status(500).json({ message: 'Error al generar boleta PDF', error: error.message });
  }
};

// ============================================================
// AGUINALDOS Y VACACIONES
// ============================================================
function calcularAguinaldo(salarioBase, fechaIngreso, anio) {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const fechaIngresoDate = new Date(fechaIngreso);
  const añosTrabajados = anioActual - fechaIngresoDate.getFullYear();
  if (añosTrabajados >= 1) {
    return salarioBase * (15 / 30);
  } else {
    return salarioBase * (15 / 30) * (añosTrabajados / 12);
  }
}

exports.generarAguinaldos = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { anio } = req.body;
    if (!anio) return res.status(400).json({ message: 'El año es obligatorio' });

    const result = await Empleado.findAll(organizacion_id, { activo: true, limit: 99999 });
    const empleados = result.empleados || [];
    if (empleados.length === 0) return res.status(404).json({ message: 'No hay empleados activos' });

    const resultados = [];
    let totalAguinaldos = 0;

    for (const emp of empleados) {
      if (!emp.fecha_ingreso) continue;
      const monto = calcularAguinaldo(parseFloat(emp.salario_base), emp.fecha_ingreso, anio);
      await pool.query(
        `INSERT INTO aguinaldos (organizacion_id, empleado_id, anio, monto, pagado)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE monto = VALUES(monto)`,
        [organizacion_id, emp.id, anio, monto]
      );
      totalAguinaldos += monto;
      resultados.push({ empleado: emp.nombre, monto });
    }

    res.json({ message: 'Aguinaldos generados', resultados, total: totalAguinaldos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar aguinaldos', error: error.message });
  }
};

exports.generarVacaciones = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { anio } = req.body;
    if (!anio) return res.status(400).json({ message: 'El año es obligatorio' });

    const result = await Empleado.findAll(organizacion_id, { activo: true, limit: 99999 });
    const empleados = result.empleados || [];
    if (empleados.length === 0) return res.status(404).json({ message: 'No hay empleados activos' });

    const resultados = [];
    let totalVacaciones = 0;

    for (const emp of empleados) {
      if (!emp.fecha_ingreso) continue;
      const monto = calcularAguinaldo(parseFloat(emp.salario_base), emp.fecha_ingreso, anio);
      await pool.query(
        `INSERT INTO vacaciones (organizacion_id, empleado_id, anio, monto, pagado)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE monto = VALUES(monto)`,
        [organizacion_id, emp.id, anio, monto]
      );
      totalVacaciones += monto;
      resultados.push({ empleado: emp.nombre, monto });
    }

    res.json({ message: 'Vacaciones generadas', resultados, total: totalVacaciones });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al generar vacaciones', error: error.message });
  }
};