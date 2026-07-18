// backend/src/controllers/nominaController.js
const Planilla = require('../models/Planilla');
const { pool } = require('../config/db');

// Tablas de ISR mensual (El Salvador 2024 - valores aproximados)
// Fuente: Ministerio de Hacienda (rangos y porcentajes)
function calcularISR(salarioGravable) {
    // Escala mensual (en USD)
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
    return Math.round(isr * 100) / 100; // redondear a 2 decimales
}

// Calcular planilla mensual
exports.calcularPlanillaMensual = async (req, res) => {
    try {
        const { organizacion_id } = req;
        const { empleado_id, mes, anio, dias_trabajados = 30, horas_extras_monto = 0, nocturnidad_monto = 0 } = req.body;

        // Obtener empleado
        const empleado = await Planilla.findEmpleadoById(empleado_id, organizacion_id);
        if (!empleado) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        let salarioBase = parseFloat(empleado.salario_base);
        let descuento_isss = 0;
        let descuento_afp = 0;
        let salarioGravable = salarioBase;

        // ISSS: 3% (con tope máximo ~ $1000 de salario, tope = $30)
        if (empleado.cotiza_isss) {
            const topeISSS = 1000; // tope salarial para ISSS (aprox)
            const baseISSS = Math.min(salarioBase, topeISSS);
            descuento_isss = baseISSS * 0.03;
            descuento_isss = Math.round(descuento_isss * 100) / 100;
        }

        // AFP: 7.25% (sin tope específico, pero se aplica sobre salario completo)
        if (empleado.cotiza_afp) {
            descuento_afp = salarioBase * 0.0725;
            descuento_afp = Math.round(descuento_afp * 100) / 100;
        }

        // Salario gravable para ISR = salarioBase - descuentos (si cotiza)
        if (empleado.cotiza_isss || empleado.cotiza_afp) {
            salarioGravable = salarioBase - descuento_isss - descuento_afp;
        } else {
            salarioGravable = salarioBase;
        }

        // Cálculo de ISR
        const descuento_renta = calcularISR(salarioGravable);

        // Salario neto a pagar
        let salarioNeto = salarioBase + horas_extras_monto + nocturnidad_monto 
                          - descuento_isss - descuento_afp - descuento_renta;
        salarioNeto = Math.round(salarioNeto * 100) / 100;

        // Crear registro en planillas_mensuales
        const planillaId = await Planilla.create({
            organizacion_id,
            empleado_id,
            mes,
            anio,
            dias_trabajados,
            horas_extras_monto,
            nocturnidad_monto,
            descuento_isss,
            descuento_afp,
            descuento_renta,
            salario_neto_pagar: salarioNeto,
            estado: 'Pendiente'
        });

        res.status(201).json({
            message: 'Planilla calculada y guardada',
            planilla_id: planillaId,
            empleado: empleado.nombre,
            salario_neto: salarioNeto,
            descuentos: { isss: descuento_isss, afp: descuento_afp, renta: descuento_renta }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al calcular planilla', error: error.message });
    }
};

// obtener las planillas
exports.obtenerPlanillas = async (req, res) => {
    try {
        const { organizacion_id } = req;
        const planillas = await Planilla.findByOrganizacion(organizacion_id);
        res.json(planillas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener planillas' });
    }
};