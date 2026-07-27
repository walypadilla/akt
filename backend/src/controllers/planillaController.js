const Planilla = require('../models/Planilla');
const Empleado = require('../models/Empleado');
const PeriodoPago = require('../models/PeriodoPago');
const Ausencia = require('../models/Ausencia');
const HoraExtra = require('../models/HoraExtra');
const Aguinaldo = require('../models/Aguinaldo');
const { pool } = require('../config/db');

// ============================================================
// TABLAS DE ISR (El Salvador 2025)
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
// OBTENER PLANILLAS (con paginación)
// ============================================================
exports.obtenerPlanillas = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { mes, anio, estado, page = 1, limit = 10, empleado_id } = req.query;
    
    // Si no se especifica estado, excluir 'Anulada'
    const estadoFiltro = estado || 'no-anulada'; // marcador interno
    
    const result = await Planilla.findByOrganizacion(organizacion_id, mes, anio, estadoFiltro, page, limit, empleado_id);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener planillas', error: error.message });
  }
};

// ============================================================
// GENERAR PLANILLA INDIVIDUAL
// ============================================================
exports.generarPlanillaIndividual = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { empleado_id, mes, anio, tipo_periodo: tipoPer } = req.body;
    const organizacion_id = req.organizacion_id;

    if (!organizacion_id) {
      await connection.rollback();
      return res.status(400).json({ message: 'No se encontró la organización del usuario' });
    }

    const empleado = await Empleado.findById(empleado_id, organizacion_id);
    if (!empleado) {
      await connection.rollback();
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    let tipoPeriodoFinal = empleado.tipo_periodo || tipoPer || 'Mensual';

    let limiteMes;
    if (tipoPeriodoFinal === 'Semanal') {
      limiteMes = 4;
    } else if (tipoPeriodoFinal === 'Quincenal') {
      limiteMes = 2;
    } else {
      limiteMes = 1;
    }

    const planillasGeneradas = await Planilla.getCountByEmpleadoMes(empleado_id, mes, anio, organizacion_id);
    if (planillasGeneradas >= limiteMes) {
      await connection.rollback();
      return res.status(400).json({ 
        message: `Este empleado ya tiene ${planillasGeneradas} planilla(s) en el mes. El límite es ${limiteMes} para el tipo ${tipoPeriodoFinal}.` 
      });
    }

    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0);
    let periodo = await PeriodoPago.findByFecha(organizacion_id, fechaInicio);
    let periodoId;
    if (!periodo) {
      periodoId = await PeriodoPago.create(
        organizacion_id,
        tipoPeriodoFinal,
        fechaInicio.toISOString().split('T')[0],
        fechaFin.toISOString().split('T')[0],
        mes,
        anio
      );
    } else {
      periodoId = periodo.id;
    }

    const existe = await Planilla.existePlanilla(empleado_id, periodoId, organizacion_id);
    if (existe) {
      await connection.rollback();
      return res.status(400).json({ message: 'Ya existe una planilla para este empleado en este período.' });
    }

    const ausencias = await Ausencia.getByPeriodo(empleado_id, fechaInicio, fechaFin, organizacion_id);
    const horasExtras = await HoraExtra.findByPeriodo(periodoId, organizacion_id);
    const horasExtrasEmpleado = horasExtras.filter(h => h.empleado_id === empleado_id);

    let diasAusencia = 0;
    let incapacidadDias = 0;
    for (const a of ausencias) {
      if (a.tipo === 'Incapacidad_ISSS') {
        incapacidadDias += parseFloat(a.dias);
      } else if (!a.remunerada) {
        diasAusencia += parseFloat(a.dias);
      }
    }

    let diasTrabajados = 0;
    if (tipoPeriodoFinal === 'Mensual') diasTrabajados = 30 - diasAusencia - incapacidadDias;
    else if (tipoPeriodoFinal === 'Quincenal') diasTrabajados = 15 - diasAusencia - incapacidadDias;
    else if (tipoPeriodoFinal === 'Semanal') diasTrabajados = 7 - diasAusencia - incapacidadDias;
    if (diasTrabajados < 0) diasTrabajados = 0;

    const salarioBase = parseFloat(empleado.salario_base) || 0;
    const salarioDiario = salarioBase / 30;
    const descuentoAusencias = (diasAusencia + incapacidadDias) * salarioDiario;

    let montoHorasExtras = 0;
    for (const h of horasExtrasEmpleado) {
      montoHorasExtras += parseFloat(h.monto_total) || 0;
    }

    const salarioGravable = salarioBase + montoHorasExtras - descuentoAusencias;

    let descuentoISSS = 0;
    let descuentoAFP = 0;
    let isssPatronal = 0;
    let afpPatronal = 0;
    if (empleado.cotiza_isss) {
      descuentoISSS = salarioBase * 0.075;
      isssPatronal = salarioBase * 0.075;
    }
    if (empleado.cotiza_afp) {
      descuentoAFP = salarioBase * 0.0725;
      afpPatronal = salarioBase * 0.0725;
    }
    const renta = calcularISR(salarioGravable, tipoPeriodoFinal);
    const salarioNeto = salarioGravable - descuentoISSS - descuentoAFP - renta;

    await Planilla.create({
      organizacion_id,
      empleado_id,
      periodo_id: periodoId,
      mes,
      anio,
      tipo_periodo: tipoPeriodoFinal,
      dias_trabajados: diasTrabajados,
      dias_ausencia: diasAusencia,
      incapacidad_dias: incapacidadDias,
      horas_extras_monto: montoHorasExtras,
      nocturnidad_monto: 0,
      descuento_isss: descuentoISSS,
      descuento_afp: descuentoAFP,
      descuento_renta: renta,
      isss_patronal: isssPatronal,
      afp_patronal: afpPatronal,
      salario_neto_pagar: salarioNeto,
      estado: 'Borrador'
    }, connection);

    await connection.commit();
    res.status(201).json({ message: 'Planilla individual generada correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [generarPlanillaIndividual] Error:', error);
    res.status(500).json({ message: 'Error al generar planilla individual', error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// GENERAR PLANILLA MASIVA
// ============================================================
exports.generarPlanillaMasiva = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { mes, anio, tipo_periodo } = req.body;
    const organizacion_id = req.organizacion_id;

    if (!organizacion_id) {
      await connection.rollback();
      return res.status(400).json({ message: 'Organización no identificada' });
    }

    // Determinar el período actual según la fecha
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const ultimoDiaMes = new Date(anio, mes, 0).getDate();

    let inicioPeriodo, finPeriodo;
    let numPeriodos = 1;
    if (tipo_periodo === 'Quincenal') {
      numPeriodos = 2;
      if (diaActual <= 15) {
        // Primera quincena
        inicioPeriodo = 1;
        finPeriodo = 15;
      } else {
        // Segunda quincena
        inicioPeriodo = 16;
        finPeriodo = ultimoDiaMes;
      }
    } else { // Mensual
      inicioPeriodo = 1;
      finPeriodo = ultimoDiaMes;
    }

    // Obtener empleados activos
    const [empleados] = await connection.query(
      'SELECT id, salario_base, cotiza_isss, cotiza_afp FROM empleados_nomina WHERE activo = 1 AND organizacion_id = ?',
      [organizacion_id]
    );

    if (empleados.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'No hay empleados activos' });
    }

    let generadas = 0;

    for (const emp of empleados) {
      // Verificar si ya existe planilla para este período (inicioPeriodo-finPeriodo)
      const fechaInicio = new Date(anio, mes - 1, inicioPeriodo);
      const fechaFin = new Date(anio, mes - 1, finPeriodo);

      // Buscar período de pago existente
      let periodo = await PeriodoPago.findByFecha(organizacion_id, fechaInicio);
      let periodoId;
      if (!periodo) {
        periodoId = await PeriodoPago.create(
          organizacion_id,
          tipo_periodo,
          fechaInicio.toISOString().split('T')[0],
          fechaFin.toISOString().split('T')[0],
          mes,
          anio
        );
      } else {
        periodoId = periodo.id;
      }

      // Verificar si ya existe planilla para este período
      const existe = await Planilla.existePlanilla(emp.id, periodoId, organizacion_id);
      if (existe) continue;

      // Obtener ausencias y horas extras
      const ausencias = await Ausencia.getByPeriodo(emp.id, fechaInicio, fechaFin, organizacion_id);
      const horasExtras = await HoraExtra.findByPeriodo(periodoId, organizacion_id);
      const horasExtrasEmpleado = horasExtras.filter(h => h.empleado_id === emp.id);

      let diasAusencia = 0;
      let incapacidadDias = 0;
      for (const a of ausencias) {
        if (a.tipo === 'Incapacidad_ISSS') incapacidadDias += parseFloat(a.dias);
        else if (!a.remunerada) diasAusencia += parseFloat(a.dias);
      }

      const diasPeriodo = finPeriodo - inicioPeriodo + 1;
      let diasTrabajados = diasPeriodo - diasAusencia - incapacidadDias;
      if (diasTrabajados < 0) diasTrabajados = 0;

      const salarioBaseMensual = parseFloat(emp.salario_base) || 0;
      // Calcular salario proporcional al período
      const salarioPeriodo = tipo_periodo === 'Quincenal' ? salarioBaseMensual / 2 : salarioBaseMensual;
      const salarioDiario = salarioBaseMensual / 30;

      const descuentoAusencias = (diasAusencia + incapacidadDias) * salarioDiario;

      let montoHorasExtras = 0;
      for (const h of horasExtrasEmpleado) {
        montoHorasExtras += parseFloat(h.monto_total) || 0;
      }

      // El salario gravable es el salario del período + horas extras - descuento ausencias
      const salarioGravable = salarioPeriodo + montoHorasExtras - descuentoAusencias;

      // Descuentos ISSS, AFP, Renta (sobre el salario del período)
      let descuentoISSS = 0, descuentoAFP = 0, isssPatronal = 0, afpPatronal = 0;
      if (emp.cotiza_isss) {
        descuentoISSS = salarioPeriodo * 0.075;
        isssPatronal = salarioPeriodo * 0.075;
      }
      if (emp.cotiza_afp) {
        descuentoAFP = salarioPeriodo * 0.0725;
        afpPatronal = salarioPeriodo * 0.0725;
      }
      const renta = calcularISR(salarioGravable, tipo_periodo);
      const salarioNeto = salarioGravable - descuentoISSS - descuentoAFP - renta;

      await Planilla.create({
        organizacion_id,
        empleado_id: emp.id,
        periodo_id: periodoId,
        mes,
        anio,
        tipo_periodo: tipo_periodo,
        dias_trabajados: diasTrabajados,
        dias_ausencia: diasAusencia,
        incapacidad_dias: incapacidadDias,
        horas_extras_monto: montoHorasExtras,
        nocturnidad_monto: 0,
        descuento_isss: descuentoISSS,
        descuento_afp: descuentoAFP,
        descuento_renta: renta,
        isss_patronal: isssPatronal,
        afp_patronal: afpPatronal,
        salario_neto_pagar: salarioNeto,
        estado: 'Borrador'
      }, connection);

      generadas++;
    }

    await connection.commit();
    res.status(201).json({
      message: `Planillas masivas generadas: ${generadas} (${tipo_periodo === 'Quincenal' ? (diaActual <= 15 ? 'primera quincena' : 'segunda quincena') : 'mensual'})`,
      generadas
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [generarPlanillaMasiva] Error:', error);
    res.status(500).json({ message: 'Error al generar planillas masivas', error: error.message });
  } finally {
    connection.release();
  }
};


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
      return res.status(400).json({ message: 'No se puede anular una planilla pagada' });
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
// CAMBIAR ESTADO MÚLTIPLE PLANILLAS
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
    const estadosPermitidos = ['Borrador', 'Cerrada', 'Pagada', 'Anulada'];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({ message: 'Estado no válido' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await connection.query(
      `SELECT id, estado, mes, anio FROM planillas WHERE id IN (${placeholders}) AND organizacion_id = ?`,
      [...ids, organizacion_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'No se encontraron planillas para actualizar' });
    }

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    let actualizados = 0;
    for (const p of rows) {
      // No modificar pagadas
      if (p.estado === 'Pagada') continue;
      // Si es anulada y se quiere cambiar a Borrador o Cerrada, solo si es mes actual o anterior
      if (p.estado === 'Anulada' && (estado === 'Borrador' || estado === 'Cerrada')) {
        if (p.anio < anioActual || (p.anio === anioActual && p.mes < mesActual - 1)) {
          continue;
        }
      }
      // Si está cerrada y se quiere pagar, permitir
      if (estado === 'Pagada' && p.estado !== 'Cerrada') continue;
      // Si está anulada y se quiere pagar, no permitir
      if (p.estado === 'Anulada' && estado === 'Pagada') continue;
      // Si ya está en el estado destino, no hacer nada
      if (p.estado === estado) continue;

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
// ELIMINAR PLANILLA (Anular)
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
    res.json({ message: 'Planilla anulada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al anular planilla', error: error.message });
  }
};

// ============================================================
// EXPORTAR PLANILLAS CSV
// ============================================================
exports.exportarPlanillas = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { mes, anio } = req.query;
    const result = await Planilla.findByOrganizacion(organizacion_id, mes, anio, null, 1, 99999);
    const planillas = result.planillas || [];
    if (!planillas || planillas.length === 0) {
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
// EXPORTAR AUSENCIAS CSV
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
// EXPORTAR HORAS EXTRAS CSV
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
    console.error(error);
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

    const salarioMostrado = planilla.tipo_periodo === 'Quincenal' ? salarioBase / 2 : salarioBase;
    drawRow(y, 'Salario Base', `$${salarioMostrado.toFixed(2)}`, '', '');
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

    const existePlanilla = await Planilla.existePlanilla(empleado_id, periodoId, organizacion_id);
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
// AGUINALDOS
// ============================================================
function calcularAntiguedad(fechaIngreso, anio) {
  const ingreso = new Date(fechaIngreso);
  const fechaCorte = new Date(anio, 11, 31);
  const diff = fechaCorte - ingreso;
  const años = diff / (1000 * 60 * 60 * 24 * 365.25);
  return años;
}

exports.generarAguinaldos = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { anio } = req.body;
    if (!anio) return res.status(400).json({ message: 'El año es obligatorio' });

    console.log('Generando aguinaldos para año:', anio, 'organización:', organizacion_id);

    const result = await Empleado.findAll(organizacion_id, { activo: true, limit: 99999 });
    const empleados = result.empleados || [];
    console.log('Empleados activos encontrados:', empleados.length);

    if (empleados.length === 0) {
      return res.status(404).json({ message: 'No hay empleados activos para generar aguinaldos' });
    }

    // Eliminar aguinaldos anteriores para el año
    await Aguinaldo.deleteByOrganizacion(organizacion_id, anio);
    console.log('Aguinaldos anteriores eliminados');

    const aguinaldosCreados = [];

    for (const emp of empleados) {
      if (!emp.fecha_ingreso) {
        console.log(`Empleado ${emp.nombre} sin fecha de ingreso, saltando`);
        continue;
      }
      const antiguedad = calcularAntiguedad(emp.fecha_ingreso, anio);
      let diasAguinaldo = 0;
      if (antiguedad < 1) {
        // Proporcional: (días trabajados en el año / 365) * 15
        // Para simplificar, usamos antiguedad en fracción de año * 15
        diasAguinaldo = antiguedad * 15;
      } else if (antiguedad >= 1 && antiguedad < 3) {
        diasAguinaldo = 15;
      } else if (antiguedad >= 3 && antiguedad < 10) {
        diasAguinaldo = 19;
      } else {
        diasAguinaldo = 21;
      }
      diasAguinaldo = Math.max(0, diasAguinaldo);

      const monto = (parseFloat(emp.salario_base) / 30) * diasAguinaldo;
      const montoRedondeado = Math.round(monto * 100) / 100;

      console.log(`Empleado ${emp.nombre}, antigüedad: ${antiguedad}, días: ${diasAguinaldo}, monto: ${montoRedondeado}`);

      const id = await Aguinaldo.create({
        organizacion_id,
        empleado_id: emp.id,
        anio,
        monto: montoRedondeado,
        estado: 'Emitido'
      });

      aguinaldosCreados.push({
        id,
        empleado: emp.nombre,
        monto: montoRedondeado,
        estado: 'Emitido'
      });
    }

    res.json({
      message: 'Aguinaldos generados correctamente',
      aguinaldos: aguinaldosCreados,
      total: aguinaldosCreados.reduce((sum, a) => sum + a.monto, 0)
    });
  } catch (error) {
    console.error('❌ [generarAguinaldos] Error:', error);
    res.status(500).json({ message: 'Error al generar aguinaldos', error: error.message });
  }
};

exports.obtenerAguinaldos = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { anio } = req.query;
    const aguinaldos = await Aguinaldo.findByOrganizacion(organizacion_id, anio);
    res.json(aguinaldos);
  } catch (error) {
    console.error('❌ [obtenerAguinaldos] Error:', error);
    res.status(500).json({ message: 'Error al obtener aguinaldos', error: error.message });
  }
};

exports.cambiarEstadoAguinaldosMultiple = async (req, res) => {
  try {
    const { ids, estado } = req.body;
    const { organizacion_id } = req;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Se requiere un array de IDs' });
    }
    let actualizados = 0;
    if (estado === 'Pagado') {
      const placeholders = ids.map(() => '?').join(',');
      const [result] = await pool.query(
        `UPDATE aguinaldos SET estado = ?, fecha_pago = NOW() WHERE id IN (${placeholders}) AND organizacion_id = ? AND estado != 'Pagado'`,
        [estado, ...ids, organizacion_id]
      );
      actualizados = result.affectedRows;
    } else {
      const placeholders = ids.map(() => '?').join(',');
      const [result] = await pool.query(
        `UPDATE aguinaldos SET estado = ? WHERE id IN (${placeholders}) AND organizacion_id = ? AND estado != 'Pagado'`,
        [estado, ...ids, organizacion_id]
      );
      actualizados = result.affectedRows;
    }
    res.json({ message: `${actualizados} aguinaldos actualizados a ${estado}` });
  } catch (error) {
    console.error('❌ [cambiarEstadoAguinaldosMultiple] Error:', error);
    res.status(500).json({ message: 'Error al actualizar aguinaldos', error: error.message });
  }
};

// ============================================================
// VACACIONES (opcional)
// ============================================================
exports.generarVacaciones = async (req, res) => {
  res.status(501).json({ message: 'Funcionalidad de vacaciones no implementada' });
};

exports.generarBoletaAguinaldoPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const aguinaldo = await Aguinaldo.findById(id, organizacion_id);
    if (!aguinaldo) {
      return res.status(404).json({ message: 'Aguinaldo no encontrado' });
    }
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=aguinaldo_${aguinaldo.empleado_nombre}_${aguinaldo.anio}.pdf`);
      res.send(pdfData);
    });

    doc.fontSize(18).text('COMPROBANTE DE AGUINALDO', { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text(`Empleado: ${aguinaldo.empleado_nombre} ${aguinaldo.apellidos || ''}`, 50, doc.y);
    doc.text(`Año: ${aguinaldo.anio}`, 300, doc.y);
    doc.text(`Monto: $${parseFloat(aguinaldo.monto).toFixed(2)}`, 50, doc.y + 15);
    doc.text(`Estado: ${aguinaldo.estado}`, 300, doc.y + 15);
    if (aguinaldo.fecha_pago) {
      doc.text(`Fecha de Pago: ${new Date(aguinaldo.fecha_pago).toLocaleDateString('es-SV')}`, 50, doc.y + 30);
    }

    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica');
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-SV')}`, 50, doc.y);
    doc.text('Este documento es un comprobante de pago de aguinaldo válido.', 50, doc.y + 12);

    doc.end();
  } catch (error) {
    console.error('❌ [generarBoletaAguinaldoPDF] Error:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
};

exports.exportarAguinaldos = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { anio } = req.query;
    const aguinaldos = await Aguinaldo.findByOrganizacion(organizacion_id, anio);
    if (!aguinaldos || aguinaldos.length === 0) {
      return res.status(404).json({ message: 'No hay aguinaldos para exportar' });
    }

    const calcularDetalleAguinaldo = (fechaIngreso, anio) => {
      if (!fechaIngreso) return { antiguedad: 0, dias: 0, esProporcional: false };
      const ingreso = new Date(fechaIngreso);
      const fechaCorte = new Date(anio, 9, 20); // 20 de octubre
      if (ingreso > fechaCorte) {
        return { antiguedad: 0, dias: 0, esProporcional: false };
      }
      const diffMs = fechaCorte - ingreso;
      const diasLaborados = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      const fechaCorteDiciembre = new Date(anio, 11, 31);
      const diffAnios = (fechaCorteDiciembre - ingreso) / (1000 * 60 * 60 * 24 * 365.25);
      const antiguedad = Math.max(0, diffAnios);
      
      let diasAguinaldo = 0;
      let esProporcional = false;
      if (antiguedad < 1) {
        diasAguinaldo = (diasLaborados / 365) * 15;
        esProporcional = true;
      } else if (antiguedad >= 1 && antiguedad < 3) {
        diasAguinaldo = 15;
      } else if (antiguedad >= 3 && antiguedad < 10) {
        diasAguinaldo = 19;
      } else {
        diasAguinaldo = 21;
      }
      diasAguinaldo = Math.round(diasAguinaldo * 100) / 100;
      return { antiguedad, dias: diasAguinaldo, esProporcional };
    };

    const data = aguinaldos.map(a => {
      const detalle = calcularDetalleAguinaldo(a.fecha_ingreso, a.anio);
      return {
        'Empleado': `${a.empleado_nombre} ${a.apellidos || ''}`,
        'Año': a.anio,
        'Monto': parseFloat(a.monto).toFixed(2),
        'Estado': a.estado,
        'Fecha Pago': a.fecha_pago ? new Date(a.fecha_pago).toLocaleDateString('es-SV') : '',
        'Antigüedad (años)': detalle.antiguedad.toFixed(2),
        'Días de Aguinaldo': detalle.dias,
        'Proporcional': detalle.esProporcional ? 'Sí' : 'No',
        'Salario Base': parseFloat(a.salario_base || 0).toFixed(2),
        'Fecha Ingreso': a.fecha_ingreso ? new Date(a.fecha_ingreso).toLocaleDateString('es-SV') : '',
      };
    });

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

    const filename = `aguinaldos_${anio || 'todos'}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ [exportarAguinaldos] Error:', error);
    res.status(500).json({ message: 'Error al exportar aguinaldos', error: error.message });
  }
};

// ============================================================
// ESTADO DE GENERACIÓN DE PLANILLAS
// ============================================================
exports.obtenerEstadoGeneracion = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { tipo_periodo } = req.query;
    if (!tipo_periodo) {
      return res.status(400).json({ message: 'tipo_periodo es requerido' });
    }

    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();
    const diaActual = hoy.getDate();

    let numPeriodos;
    let periodoActual;
    if (tipo_periodo === 'Quincenal') {
      numPeriodos = 2;
      periodoActual = (diaActual <= 15) ? 1 : 2;
    } else { // Mensual
      numPeriodos = 1;
      periodoActual = 1;
    }

    // Obtener empleados activos
    const result = await Empleado.findAll(organizacion_id, { activo: true, limit: 99999 });
    const empleados = result.empleados || [];
    const totalEmpleados = empleados.length;

    // Contar planillas generadas en el mes actual para el período actual
    let inicioPeriodo, finPeriodo;
    const ultimoDiaMes = new Date(anio, mes, 0).getDate();
    if (periodoActual === 1) {
      inicioPeriodo = 1;
      finPeriodo = 15;
    } else {
      inicioPeriodo = 16;
      finPeriodo = ultimoDiaMes;
    }

    // Buscar período de pago correspondiente
    const fechaInicio = new Date(anio, mes - 1, inicioPeriodo);
    const periodo = await PeriodoPago.findByFecha(organizacion_id, fechaInicio);
    let planillasGeneradas = 0;
    if (periodo) {
      const [count] = await pool.query(
        `SELECT COUNT(*) as total FROM planillas 
         WHERE organizacion_id = ? AND periodo_id = ? AND tipo_periodo NOT IN ('Aguinaldo', 'Vacaciones')`,
        [organizacion_id, periodo.id]
      );
      planillasGeneradas = count[0]?.total || 0;
    }

    const planillasEsperadas = totalEmpleados;
    const completado = planillasGeneradas >= planillasEsperadas;

    res.json({
      mes,
      anio,
      tipo_periodo,
      periodoActual,
      totalEmpleados,
      planillasGeneradas,
      planillasEsperadas,
      completado,
      faltantes: Math.max(0, planillasEsperadas - planillasGeneradas),
    });
  } catch (error) {
    console.error('❌ [obtenerEstadoGeneracion] Error:', error);
    res.status(500).json({ message: 'Error al obtener estado de generación', error: error.message });
  }
};