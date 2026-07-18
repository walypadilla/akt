// backend/src/controllers/reporteController.js
const { pool } = require('../config/db');
const Factura = require('../models/Factura');

// --------------------------------------------------------------------------
// 1. OBTENER DATOS PARA GRÁFICAS Y KPIs (con filtros de año/mes/periodo)
// --------------------------------------------------------------------------
exports.obtenerDatosGraficas = async (req, res) => {
  try {
    const { organizacion_id } = req;
    let { periodo = 'trimestre', anio, mes } = req.query;

    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    // Si no se envía año, usar el actual
    if (!anio) anio = añoActual;
    if (!mes) mes = mesActual; // por defecto el mes actual

    // Fechas para periodos
    let fechaInicio;
    let fechaFin = new Date(anio, mes - 1, 1); // primer día del mes seleccionado

    if (periodo === 'trimestre') {
      fechaInicio = new Date(anio, mes - 1 - 3, 1);
    } else if (periodo === 'semestre') {
      fechaInicio = new Date(anio, mes - 1 - 6, 1);
    } else { // anual
      fechaInicio = new Date(anio, 0, 1);
      fechaFin = new Date(anio, 11, 31);
    }

    if (periodo !== 'anual') {
      fechaFin = new Date(anio, mes, 0); // último día del mes seleccionado
    }

    // --- 1. Ventas por mes (gráfica de barras) ---
    const [ventasPorMes] = await pool.query(
      `SELECT DATE_FORMAT(creado_en, '%Y-%m') AS mes,
              SUM(total_pagar) AS total_ventas
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND creado_en >= ?
         AND creado_en <= ?
       GROUP BY mes
       ORDER BY mes ASC`,
      [organizacion_id, fechaInicio, fechaFin]
    );

    // --- 2. Ventas por día del mes seleccionado (opcional, para gráfica de líneas) ---
    const [ventasPorDia] = await pool.query(
      `SELECT DAY(creado_en) AS dia,
              COUNT(*) AS cantidad_clientes,
              SUM(total_pagar) AS total_dia
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?
       GROUP BY dia
       ORDER BY dia ASC`,
      [organizacion_id, mes, anio]
    );

    // --- 3. KPIs para el mes seleccionado ---

    // 3.1 Ventas del mes seleccionado
    const [ventasMesActual] = await pool.query(
      `SELECT SUM(total_pagar) AS total
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?`,
      [organizacion_id, mes, anio]
    );
    const totalVentasMes = parseFloat(ventasMesActual[0].total) || 0;

    // 3.2 Ventas del mes anterior (para comparación)
    let mesAnterior = mes - 1;
    let anioAnterior = anio;
    if (mesAnterior === 0) { mesAnterior = 12; anioAnterior = anio - 1; }
    const [ventasMesAnt] = await pool.query(
      `SELECT SUM(total_pagar) AS total
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?`,
      [organizacion_id, mesAnterior, anioAnterior]
    );
    const totalVentasMesAnt = parseFloat(ventasMesAnt[0].total) || 0;
    const variacionMes = totalVentasMesAnt > 0
      ? ((totalVentasMes - totalVentasMesAnt) / totalVentasMesAnt * 100)
      : 0;

    // 3.3 Cuentas por Cobrar (facturas en estado 'Emitida' no pagadas)
    const [cuentasCobrar] = await pool.query(
      `SELECT SUM(total_pagar) AS total
       FROM facturas
       WHERE organizacion_id = ?
         AND estado = 'Emitida'
         AND eliminado_en IS NULL`,
      [organizacion_id]
    );
    const totalCuentasCobrar = parseFloat(cuentasCobrar[0].total) || 0;

    // 3.4 Gastos del mes (desde compras_gastos)
    const [gastos] = await pool.query(
      `SELECT SUM(total) AS total
       FROM compras_gastos
       WHERE organizacion_id = ?
         AND MONTH(fecha_registro) = ?
         AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );
    const totalGastosMes = parseFloat(gastos[0].total) || 0;

    // 3.5 Clientes Activos (clientes con facturas en el mes)
    const [clientesActivos] = await pool.query(
      `SELECT COUNT(DISTINCT cliente_id) AS count
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?`,
      [organizacion_id, mes, anio]
    );
    const totalClientesActivos = parseInt(clientesActivos[0].count) || 0;

    // 3.6 Clientes activos del mes anterior (para comparación)
    const [clientesMesAnt] = await pool.query(
      `SELECT COUNT(DISTINCT cliente_id) AS count
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?`,
      [organizacion_id, mesAnterior, anioAnterior]
    );
    const totalClientesAnt = parseInt(clientesMesAnt[0].count) || 0;
    const variacionClientes = totalClientesAnt > 0
      ? ((totalClientesActivos - totalClientesAnt) / totalClientesAnt * 100)
      : 0;

    // 3.7 Facturas emitidas hoy (si el mes seleccionado es el actual)
    let facturasHoy = 0;
    if (parseInt(anio) === añoActual && parseInt(mes) === mesActual) {
      const [hoy] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM facturas
         WHERE organizacion_id = ?
           AND estado IN ('Emitida', 'Pagada')
           AND eliminado_en IS NULL
           AND DATE(creado_en) = CURRENT_DATE()`,
        [organizacion_id]
      );
      facturasHoy = parseInt(hoy[0].count) || 0;
    }

    // 3.8 Ticket Promedio (por cliente activo)
    const ticketPromedio = totalClientesActivos > 0 ? totalVentasMes / totalClientesActivos : 0;

    // 3.9 Tasa de Conversión (facturas pagadas vs emitidas) en el período
    const [tasas] = await pool.query(
      `SELECT 
         COUNT(CASE WHEN estado = 'Pagada' THEN 1 END) AS pagadas,
         COUNT(*) AS emitidas
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?`,
      [organizacion_id, mes, anio]
    );
    const pagadas = parseInt(tasas[0].pagadas) || 0;
    const emitidas = parseInt(tasas[0].emitidas) || 0;
    const tasaConversion = emitidas > 0 ? (pagadas / emitidas) * 100 : 0;

    // --- 4. Estado de facturas (gráfica de pastel) ---
    const [estadoFacturas] = await pool.query(
      `SELECT estado, COUNT(*) AS count
       FROM facturas
       WHERE organizacion_id = ?
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?
       GROUP BY estado`,
      [organizacion_id, mes, anio]
    );

    // --- 5. Últimas facturas ---
    const ultimasFacturas = await Factura.findLatestByOrganizacion(organizacion_id, 5);

    // --- 6. Próximos vencimientos (facturas emitidas con más de 25 días) ---
    const [proximosVencimientos] = await pool.query(
      `SELECT f.id, f.numero_correlativo, c.nombre AS cliente_nombre, f.total_pagar, f.creado_en
       FROM facturas f
       JOIN clientes c ON f.cliente_id = c.id
       WHERE f.organizacion_id = ?
         AND f.estado = 'Emitida'
         AND f.eliminado_en IS NULL
         AND f.creado_en < DATE_SUB(CURRENT_DATE(), INTERVAL 25 DAY)
       ORDER BY f.creado_en ASC
       LIMIT 5`,
      [organizacion_id]
    );

    // --- 7. Total de facturas en el período seleccionado (para métricas) ---
    const [totalFacturas] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?`,
      [organizacion_id, mes, anio]
    );

    res.json({
      ventasPorMes,
      ventasPorDia,
      kpis: {
        ventasMes: totalVentasMes,
        variacionMes: parseFloat(variacionMes.toFixed(2)),
        cuentasCobrar: totalCuentasCobrar,
        gastosMes: totalGastosMes,
        clientesActivos: totalClientesActivos,
        variacionClientes: parseFloat(variacionClientes.toFixed(2)),
        facturasHoy,
        ticketPromedio: parseFloat(ticketPromedio.toFixed(2)),
        tasaConversion: parseFloat(tasaConversion.toFixed(2)),
        totalFacturas: parseInt(totalFacturas[0].total) || 0,
      },
      estadoFacturas,
      ultimasFacturas,
      proximosVencimientos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener datos del dashboard' });
  }
};

// --------------------------------------------------------------------------
// 2. EXPORTAR LIBRO DE IVA (para ventas a contribuyentes y consumidor final)
// --------------------------------------------------------------------------
exports.exportarLibroIva = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { mes, anio } = req.query;

    if (!mes || !anio) {
      return res.status(400).json({ message: 'Faltan mes y año' });
    }

    // Facturas CCF (ventas a contribuyentes)
    const facturasCCF = await Factura.getForReport(organizacion_id, mes, anio, 'CCF');
    // Facturas FAF (ventas a consumidor final)
    const facturasFAF = await Factura.getForReport(organizacion_id, mes, anio, 'FAF');

    const libro = {
      ventasContribuyentes: facturasCCF.map(f => ({
        numero: f.numero_correlativo,
        fecha: f.creado_en,
        nit: f.nit,
        nombre: f.cliente_nombre,
        nrc: f.nrc,
        giro: f.giro,
        subtotal: f.subtotal_sumas,
        iva: f.iva_13,
        retencion: f.retencion_1,
        total: f.total_pagar
      })),
      ventasConsumidor: facturasFAF.map(f => ({
        numero: f.numero_correlativo,
        fecha: f.creado_en,
        dui: f.dui || 'N/A',
        nombre: f.cliente_nombre,
        subtotal: f.subtotal_sumas,
        iva: f.iva_13,
        total: f.total_pagar
      }))
    };

    res.json(libro);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al exportar libro IVA' });
  }
};

// --------------------------------------------------------------------------
// 3. OBTENER KPIs (métricas rápidas para tarjetas, sin gráficas)
// --------------------------------------------------------------------------
exports.obtenerKPIs = async (req, res) => {
  try {
    const { organizacion_id } = req;
    const { anio, mes } = req.query;

    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    // Si no se envía año/mes, usar el mes actual
    const anioSel = anio || añoActual;
    const mesSel = mes || mesActual;

    // Ventas del mes seleccionado
    const [ventas] = await pool.query(
      `SELECT SUM(total_pagar) AS total
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?`,
      [organizacion_id, mesSel, anioSel]
    );
    const ventasMes = parseFloat(ventas[0].total) || 0;

    // Cuentas por cobrar
    const [cobrar] = await pool.query(
      `SELECT SUM(total_pagar) AS total
       FROM facturas
       WHERE organizacion_id = ?
         AND estado = 'Emitida'
         AND eliminado_en IS NULL`,
      [organizacion_id]
    );
    const cuentasCobrar = parseFloat(cobrar[0].total) || 0;

    // Gastos del mes
    const [gastos] = await pool.query(
      `SELECT SUM(total) AS total
       FROM compras_gastos
       WHERE organizacion_id = ?
         AND MONTH(fecha_registro) = ?
         AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mesSel, anioSel]
    );
    const gastosMes = parseFloat(gastos[0].total) || 0;

    // Clientes activos
    const [clientes] = await pool.query(
      `SELECT COUNT(DISTINCT cliente_id) AS count
       FROM facturas
       WHERE organizacion_id = ?
         AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL
         AND MONTH(creado_en) = ?
         AND YEAR(creado_en) = ?`,
      [organizacion_id, mesSel, anioSel]
    );
    const clientesActivos = parseInt(clientes[0].count) || 0;

    // Facturas hoy
    let facturasHoy = 0;
    if (parseInt(anioSel) === añoActual && parseInt(mesSel) === mesActual) {
      const [hoy] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM facturas
         WHERE organizacion_id = ?
           AND estado IN ('Emitida', 'Pagada')
           AND eliminado_en IS NULL
           AND DATE(creado_en) = CURRENT_DATE()`,
        [organizacion_id]
      );
      facturasHoy = parseInt(hoy[0].count) || 0;
    }

    // Facturas vencidas (más de 30 días en estado Emitida)
    const [vencidas] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM facturas
       WHERE organizacion_id = ?
         AND estado = 'Emitida'
         AND eliminado_en IS NULL
         AND creado_en < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`,
      [organizacion_id]
    );
    const facturasVencidas = parseInt(vencidas[0].count) || 0;

    res.json({
      ventasMes,
      cuentasCobrar,
      gastosMes,
      clientesActivos,
      facturasHoy,
      facturasVencidas,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener KPIs' });
  }
};

// --------------------------------------------------------------------------
// 4. OBTENER AÑOS DISPONIBLES (para los selectores de año)
// --------------------------------------------------------------------------
exports.obtenerAñosDisponibles = async (req, res) => {
  try {
    const { organizacion_id } = req;

    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(creado_en) AS anio
       FROM facturas
       WHERE organizacion_id = ?
         AND eliminado_en IS NULL
       ORDER BY anio DESC`,
      [organizacion_id]
    );

    const años = rows.map(r => r.anio);
    res.json(años);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener años disponibles' });
  }
};