// backend/src/controllers/planillaController.js
const Planilla = require('../models/Planilla');
const Empleado = require('../models/Empleado');
const { pool } = require('../config/db');

// ============================================================
// FUNCIONES AUXILIARES (Cálculos fiscales de El Salvador)
// ============================================================

function calcularISR(salarioGravable) {
  const tramos = [
    { hasta: 0.01, excedente: 0, porcentaje: 0 },
    { hasta: 472.00, excedente: 0, porcentaje: 0 },
    { hasta: 895.24, excedente: 472.00, porcentaje: 0.10 },
    { hasta: 2038.10, excedente: 895.24, porcentaje: 0.12 },
    { hasta: 2827.48, excedente: 2038.10, porcentaje: 0.15 },
    { hasta: 5679.48, excedente: 2827.48, porcentaje: 0.20 },
    { hasta: Infinity, excedente: 5679.48, porcentaje: 0.30 }
  ];
  let isr = 0;
  for (const tramo of tramos) {
    if (salarioGravable <= tramo.hasta) {
      if (tramo.excedente > 0) {
        isr = (salarioGravable - tramo.excedente) * tramo.porcentaje;
      } else {
        isr = 0;
      }
      break;
    }
  }
  return Math.round(isr * 100) / 100;
}

// ============================================================
// 1. OBTENER PLANILLAS
// ============================================================

exports.obtenerPlanillas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { mes, anio, estado } = req.query;
    const filters = {};
    if (mes) filters.mes = parseInt(mes);
    if (anio) filters.anio = parseInt(anio);
    if (estado) filters.estado = estado;
    const planillas = await Planilla.findByOrganizacion(organizacion_id, filters);
    res.json(planillas);
  } catch (error) {
    console.error('❌ [obtenerPlanillas] Error:', error);
    res.status(500).json({ message: 'Error al obtener planillas', error: error.message });
  }
};

// ============================================================
// 2. CALCULAR PLANILLA (individual)
// ============================================================

exports.calcularPlanilla = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const {
      empleado_id,
      mes,
      anio,
      dias_trabajados = 30,
      horas_extras_monto = 0,
      nocturnidad_monto = 0
    } = req.body;

    if (!empleado_id || !mes || !anio) {
      return res.status(400).json({
        message: 'Faltan campos obligatorios: empleado_id, mes, anio'
      });
    }

    const empleado = await Empleado.findById(empleado_id, organizacion_id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM planillas_mensuales WHERE empleado_id = ? AND mes = ? AND anio = ?',
      [empleado_id, mes, anio]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        message: 'Ya existe una planilla para este empleado en el período seleccionado'
      });
    }

    let salarioBase = parseFloat(empleado.salario_base) || 0;
    let descuento_isss = 0;
    let descuento_afp = 0;
    let salarioGravable = salarioBase;

    if (empleado.cotiza_isss) {
      const topeISSS = 1000;
      const baseISSS = Math.min(salarioBase, topeISSS);
      descuento_isss = baseISSS * 0.03;
      descuento_isss = Math.round(descuento_isss * 100) / 100;
    }

    if (empleado.cotiza_afp) {
      descuento_afp = salarioBase * 0.0725;
      descuento_afp = Math.round(descuento_afp * 100) / 100;
    }

    if (empleado.cotiza_isss || empleado.cotiza_afp) {
      salarioGravable = salarioBase - descuento_isss - descuento_afp;
    } else {
      salarioGravable = salarioBase;
    }

    const descuento_renta = calcularISR(salarioGravable);

    let salarioNeto = salarioBase
      + parseFloat(horas_extras_monto)
      + parseFloat(nocturnidad_monto)
      - descuento_isss
      - descuento_afp
      - descuento_renta;
    salarioNeto = Math.round(salarioNeto * 100) / 100;

    const planillaId = await Planilla.create({
      organizacion_id,
      empleado_id,
      mes,
      anio,
      dias_trabajados,
      horas_extras_monto: parseFloat(horas_extras_monto),
      nocturnidad_monto: parseFloat(nocturnidad_monto),
      descuento_isss,
      descuento_afp,
      descuento_renta,
      salario_neto_pagar: salarioNeto,
      estado: 'Pendiente'
    });

    res.status(201).json({
      message: 'Planilla calculada y guardada exitosamente',
      planilla_id: planillaId,
      empleado: empleado.nombre,
      salario_neto: salarioNeto,
      descuentos: { isss: descuento_isss, afp: descuento_afp, renta: descuento_renta }
    });
  } catch (error) {
    console.error('❌ [calcularPlanilla] Error:', error);
    res.status(500).json({
      message: 'Error al calcular planilla',
      error: error.message
    });
  }
};

// ============================================================
// 3. ACTUALIZAR PLANILLA
// ============================================================

exports.actualizarPlanilla = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;
    const {
      estado,
      dias_trabajados,
      horas_extras_monto,
      nocturnidad_monto
    } = req.body;

    const [planilla] = await pool.query(
      'SELECT * FROM planillas_mensuales WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    if (planilla.length === 0) {
      return res.status(404).json({ message: 'Planilla no encontrada' });
    }

    const planillaActual = planilla[0];
    if (estado === 'Pagado' && planillaActual.estado === 'Pagado') {
      return res.status(400).json({ message: 'La planilla ya está pagada' });
    }

    const updateFields = [];
    const params = [];

    if (estado) {
      updateFields.push('estado = ?');
      params.push(estado);
    }
    if (dias_trabajados !== undefined) {
      updateFields.push('dias_trabajados = ?');
      params.push(parseFloat(dias_trabajados));
    }
    if (horas_extras_monto !== undefined) {
      updateFields.push('horas_extras_monto = ?');
      params.push(parseFloat(horas_extras_monto));
    }
    if (nocturnidad_monto !== undefined) {
      updateFields.push('nocturnidad_monto = ?');
      params.push(parseFloat(nocturnidad_monto));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    if (horas_extras_monto !== undefined || nocturnidad_monto !== undefined) {
      const empleado = await Empleado.findById(planillaActual.empleado_id, organizacion_id);
      if (empleado) {
        let salarioBase = parseFloat(empleado.salario_base);
        let nuevoHorasExtras = horas_extras_monto !== undefined ? parseFloat(horas_extras_monto) : planillaActual.horas_extras_monto;
        let nuevoNocturnidad = nocturnidad_monto !== undefined ? parseFloat(nocturnidad_monto) : planillaActual.nocturnidad_monto;
        let nuevoDescuentoISSS = planillaActual.descuento_isss;
        let nuevoDescuentoAFP = planillaActual.descuento_afp;
        let salarioGravable = salarioBase - nuevoDescuentoISSS - nuevoDescuentoAFP;
        let nuevoISR = calcularISR(salarioGravable);
        let nuevoNeto = salarioBase + nuevoHorasExtras + nuevoNocturnidad - nuevoDescuentoISSS - nuevoDescuentoAFP - nuevoISR;
        nuevoNeto = Math.round(nuevoNeto * 100) / 100;

        updateFields.push('salario_neto_pagar = ?');
        params.push(nuevoNeto);
        if (nuevoISR !== planillaActual.descuento_renta) {
          updateFields.push('descuento_renta = ?');
          params.push(nuevoISR);
        }
      }
    }

    params.push(id, organizacion_id);
    await pool.query(
      `UPDATE planillas_mensuales SET ${updateFields.join(', ')} WHERE id = ? AND organizacion_id = ?`,
      params
    );

    res.json({ message: 'Planilla actualizada correctamente' });
  } catch (error) {
    console.error('❌ [actualizarPlanilla] Error:', error);
    res.status(500).json({
      message: 'Error al actualizar planilla',
      error: error.message
    });
  }
};

// ============================================================
// 4. ELIMINAR PLANILLA
// ============================================================

exports.eliminarPlanilla = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizacion_id } = req;

    const [planilla] = await pool.query(
      'SELECT estado FROM planillas_mensuales WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    if (planilla.length === 0) {
      return res.status(404).json({ message: 'Planilla no encontrada' });
    }

    if (planilla[0].estado === 'Pagado') {
      return res.status(400).json({ message: 'No se puede eliminar una planilla que ya está pagada' });
    }

    await pool.query(
      'DELETE FROM planillas_mensuales WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );

    res.json({ message: 'Planilla eliminada correctamente' });
  } catch (error) {
    console.error('❌ [eliminarPlanilla] Error:', error);
    res.status(500).json({
      message: 'Error al eliminar planilla',
      error: error.message
    });
  }
};

// ============================================================
// 5. GENERAR PLANILLA MASIVA
// ============================================================

exports.generarPlanillaMasiva = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { organizacion_id } = req;
    const { mes, anio } = req.body;

    if (!mes || !anio) {
      return res.status(400).json({ message: 'Mes y año son obligatorios' });
    }

    const empleados = await Empleado.findAll(organizacion_id);
    if (empleados.length === 0) {
      return res.status(404).json({ message: 'No hay empleados para generar planilla' });
    }

    const resultados = [];
    let totalNeto = 0, totalISSS = 0, totalAFP = 0, totalRenta = 0;

    for (const emp of empleados) {
      const [existing] = await connection.query(
        'SELECT id FROM planillas_mensuales WHERE empleado_id = ? AND mes = ? AND anio = ?',
        [emp.id, mes, anio]
      );
      if (existing.length > 0) {
        resultados.push({ empleado: emp.nombre, status: 'Ya existe' });
        continue;
      }

      let salarioBase = parseFloat(emp.salario_base);
      let descuento_isss = 0, descuento_afp = 0, salarioGravable = salarioBase;

      if (emp.cotiza_isss) {
        const topeISSS = 1000;
        const baseISSS = Math.min(salarioBase, topeISSS);
        descuento_isss = baseISSS * 0.03;
        descuento_isss = Math.round(descuento_isss * 100) / 100;
      }

      if (emp.cotiza_afp) {
        descuento_afp = salarioBase * 0.0725;
        descuento_afp = Math.round(descuento_afp * 100) / 100;
      }

      if (emp.cotiza_isss || emp.cotiza_afp) {
        salarioGravable = salarioBase - descuento_isss - descuento_afp;
      }

      const descuento_renta = calcularISR(salarioGravable);
      let salarioNeto = salarioBase - descuento_isss - descuento_afp - descuento_renta;
      salarioNeto = Math.round(salarioNeto * 100) / 100;

      await Planilla.create({
        organizacion_id,
        empleado_id: emp.id,
        mes,
        anio,
        dias_trabajados: 30,
        horas_extras_monto: 0,
        nocturnidad_monto: 0,
        descuento_isss,
        descuento_afp,
        descuento_renta,
        salario_neto_pagar: salarioNeto,
        estado: 'Pendiente'
      }, connection);

      totalNeto += salarioNeto;
      totalISSS += descuento_isss;
      totalAFP += descuento_afp;
      totalRenta += descuento_renta;
      resultados.push({
        empleado: emp.nombre,
        status: 'Creada',
        salario_neto: salarioNeto
      });
    }

    await connection.commit();

    res.status(201).json({
      message: 'Planillas masivas generadas',
      resultados,
      totales: {
        total_neto: Math.round(totalNeto * 100) / 100,
        total_isss: Math.round(totalISSS * 100) / 100,
        total_afp: Math.round(totalAFP * 100) / 100,
        total_renta: Math.round(totalRenta * 100) / 100
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [generarPlanillaMasiva] Error:', error);
    res.status(500).json({
      message: 'Error al generar planillas masivas',
      error: error.message
    });
  } finally {
    connection.release();
  }
};