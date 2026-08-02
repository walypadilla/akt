// backend/src/controllers/organizationDashboardController.js
const { pool } = require('../config/db');

// ============================================================
// 1. OBTENER KPIs DE LA ORGANIZACIÓN
// ============================================================
exports.getKPIs = async (req, res) => {
  try {
    const organizacionId = req.organizacion_id;
    if (!organizacionId) {
      return res.status(400).json({ message: 'Usuario no pertenece a una organización' });
    }

    // Ingresos (facturas Emitida o Pagada)
    const [ingresos] = await pool.query(
      `SELECT COALESCE(SUM(total_pagar), 0) AS total 
       FROM facturas 
       WHERE organizacion_id = ? AND estado IN ('Emitida', 'Pagada') AND eliminado_en IS NULL`,
      [organizacionId]
    );

    // Gastos (compras_gastos)
    const [gastos] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total 
       FROM compras_gastos 
       WHERE organizacion_id = ?`,
      [organizacionId]
    );

    // Cuentas por cobrar (facturas Emitida no pagadas)
    const [cxc] = await pool.query(
      `SELECT COALESCE(SUM(total_pagar), 0) AS total 
       FROM facturas 
       WHERE organizacion_id = ? AND estado = 'Emitida' AND eliminado_en IS NULL`,
      [organizacionId]
    );

    // Total clientes
    const [clientes] = await pool.query(
      `SELECT COUNT(*) AS total FROM clientes WHERE organizacion_id = ?`,
      [organizacionId]
    );

    // Total facturas emitidas (no anuladas)
    const [facturas] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM facturas 
       WHERE organizacion_id = ? AND estado != 'Anulada' AND eliminado_en IS NULL`,
      [organizacionId]
    );

    // Total empleados
    const [empleados] = await pool.query(
      `SELECT COUNT(*) AS total FROM empleados_nomina WHERE organizacion_id = ?`,
      [organizacionId]
    );

    res.json({
      totalIngresos: ingresos[0]?.total || 0,
      totalGastos: gastos[0]?.total || 0,
      totalCxC: cxc[0]?.total || 0,
      totalClientes: clientes[0]?.total || 0,
      totalFacturas: facturas[0]?.total || 0,
      totalEmpleados: empleados[0]?.total || 0,
    });
  } catch (error) {
    console.error('❌ [getKPIs] Error:', error);
    res.status(500).json({ message: 'Error al obtener KPIs', error: error.message });
  }
};

// ============================================================
// 2. OBTENER DATOS MENSUALES (ingresos y gastos por mes)
// ============================================================
exports.getMonthlyData = async (req, res) => {
  try {
    const organizacionId = req.organizacion_id;
    if (!organizacionId) {
      return res.status(400).json({ message: 'Usuario no pertenece a una organización' });
    }

    // Ingresos mensuales
    const [ingresosMensuales] = await pool.query(
      `SELECT DATE_FORMAT(creado_en, '%Y-%m') AS mes, 
              COALESCE(SUM(total_pagar), 0) AS total
       FROM facturas
       WHERE organizacion_id = ? AND estado IN ('Emitida', 'Pagada') AND eliminado_en IS NULL
       GROUP BY mes
       ORDER BY mes ASC`,
      [organizacionId]
    );

    // Gastos mensuales
    const [gastosMensuales] = await pool.query(
      `SELECT DATE_FORMAT(fecha_registro, '%Y-%m') AS mes, 
              COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ?
       GROUP BY mes
       ORDER BY mes ASC`,
      [organizacionId]
    );

    // Combinar datos
    const mesesMap = {};
    ingresosMensuales.forEach(item => {
      mesesMap[item.mes] = { mes: item.mes, ingresos: item.total, gastos: 0 };
    });
    gastosMensuales.forEach(item => {
      if (mesesMap[item.mes]) {
        mesesMap[item.mes].gastos = item.total;
      } else {
        mesesMap[item.mes] = { mes: item.mes, ingresos: 0, gastos: item.total };
      }
    });

    const result = Object.values(mesesMap).sort((a, b) => a.mes.localeCompare(b.mes));
    res.json(result);
  } catch (error) {
    console.error('❌ [getMonthlyData] Error:', error);
    res.status(500).json({ message: 'Error al obtener datos mensuales', error: error.message });
  }
};

// ============================================================
// 3. OBTENER TOP 5 CLIENTES POR FACTURACIÓN
// ============================================================
exports.getTopClients = async (req, res) => {
  try {
    const organizacionId = req.organizacion_id;
    if (!organizacionId) {
      return res.status(400).json({ message: 'Usuario no pertenece a una organización' });
    }

    const [topClients] = await pool.query(
      `SELECT c.id, c.nombre, COALESCE(SUM(f.total_pagar), 0) AS total_facturado
       FROM clientes c
       LEFT JOIN facturas f ON f.cliente_id = c.id 
           AND f.organizacion_id = c.organizacion_id 
           AND f.estado IN ('Emitida', 'Pagada') 
           AND f.eliminado_en IS NULL
       WHERE c.organizacion_id = ?
       GROUP BY c.id, c.nombre
       ORDER BY total_facturado DESC
       LIMIT 5`,
      [organizacionId]
    );

    res.json(topClients);
  } catch (error) {
    console.error('❌ [getTopClients] Error:', error);
    res.status(500).json({ message: 'Error al obtener top clientes', error: error.message });
  }
};

// ============================================================
// 4. DASHBOARD COMPLETO CON FILTROS (periodo, año, mes)
// ============================================================
exports.getDashboardCompleto = async (req, res) => {
  try {
    const organizacionId = req.organizacion_id;
    if (!organizacionId) {
      return res.status(400).json({ message: 'Usuario no pertenece a una organización' });
    }

    const { periodo = 'mes', anio, mes } = req.query;
    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;
    const anioSeleccionado = anio ? parseInt(anio) : añoActual;
    const mesSeleccionado = mes ? parseInt(mes) : mesActual;

    let fechaInicio;
    let fechaFin = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
    let labelPeriodo = '';
    let periodoAnteriorInicio;
    let periodoAnteriorFin;

    switch (periodo) {
      case '6meses':
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 1);
        fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);
        labelPeriodo = `Últimos 6 meses (${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()})`;
        periodoAnteriorInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 12, 1);
        periodoAnteriorFin = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 0);
        break;
      case 'trimestre':
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 3, 1);
        fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);
        labelPeriodo = `Último trimestre (${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()})`;
        periodoAnteriorInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 1);
        periodoAnteriorFin = new Date(anioSeleccionado, mesSeleccionado - 1 - 3, 0);
        break;
      case 'anual':
        fechaInicio = new Date(anioSeleccionado, 0, 1);
        fechaFin = new Date(anioSeleccionado, 11, 31);
        labelPeriodo = `Año ${anioSeleccionado}`;
        periodoAnteriorInicio = new Date(anioSeleccionado - 1, 0, 1);
        periodoAnteriorFin = new Date(anioSeleccionado - 1, 11, 31);
        break;
      case 'mes':
      default:
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
        fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);
        labelPeriodo = `Mes ${mesSeleccionado}/${anioSeleccionado}`;
        let mesAnterior = mesSeleccionado - 1;
        let anioAnterior = anioSeleccionado;
        if (mesAnterior === 0) { mesAnterior = 12; anioAnterior = anioSeleccionado - 1; }
        periodoAnteriorInicio = new Date(anioAnterior, mesAnterior - 1, 1);
        periodoAnteriorFin = new Date(anioAnterior, mesAnterior, 0);
    }

    // ===== KPIs =====
    // Ingresos en el periodo
    const [ingresosPeriodo] = await pool.query(
      `SELECT COALESCE(SUM(total_pagar), 0) AS total
       FROM facturas
       WHERE organizacion_id = ? AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL AND creado_en >= ? AND creado_en <= ?`,
      [organizacionId, fechaInicio, fechaFin]
    );
    const totalIngresosPeriodo = ingresosPeriodo[0]?.total || 0;

    // Gastos en el periodo
    const [gastosPeriodo] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND fecha_registro >= ? AND fecha_registro <= ?`,
      [organizacionId, fechaInicio, fechaFin]
    );
    const totalGastosPeriodo = gastosPeriodo[0]?.total || 0;

    // Cuentas por cobrar (global)
    const [cxc] = await pool.query(
      `SELECT COALESCE(SUM(total_pagar), 0) AS total
       FROM facturas
       WHERE organizacion_id = ? AND estado = 'Emitida' AND eliminado_en IS NULL`,
      [organizacionId]
    );
    const totalCxC = cxc[0]?.total || 0;

    // Clientes activos (con facturas en el periodo)
    const [clientesActivos] = await pool.query(
      `SELECT COUNT(DISTINCT cliente_id) AS total
       FROM facturas
       WHERE organizacion_id = ? AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL AND creado_en >= ? AND creado_en <= ?`,
      [organizacionId, fechaInicio, fechaFin]
    );
    const totalClientesActivos = clientesActivos[0]?.total || 0;

    // Total empleados
    const [empleados] = await pool.query(
      `SELECT COUNT(*) AS total FROM empleados_nomina WHERE organizacion_id = ?`,
      [organizacionId]
    );
    const totalEmpleados = empleados[0]?.total || 0;

    // Comparación con periodo anterior (variación de ingresos)
    const [ingresosAnterior] = await pool.query(
      `SELECT COALESCE(SUM(total_pagar), 0) AS total
       FROM facturas
       WHERE organizacion_id = ? AND estado IN ('Emitida', 'Pagada')
         AND eliminado_en IS NULL AND creado_en >= ? AND creado_en <= ?`,
      [organizacionId, periodoAnteriorInicio, periodoAnteriorFin]
    );
    const totalIngresosAnterior = ingresosAnterior[0]?.total || 0;
    const variacion = totalIngresosAnterior > 0
      ? ((totalIngresosPeriodo - totalIngresosAnterior) / totalIngresosAnterior * 100)
      : 0;

    // ===== DATOS PARA GRÁFICAS =====
    let datosMensuales = [];
    let datosDiarios = [];

    if (periodo === 'mes') {
      // Datos diarios
      const [ventasDiarias] = await pool.query(
        `SELECT DAY(creado_en) AS dia, SUM(total_pagar) AS total_ventas
         FROM facturas
         WHERE organizacion_id = ? AND estado IN ('Emitida', 'Pagada')
           AND eliminado_en IS NULL
           AND YEAR(creado_en) = ? AND MONTH(creado_en) = ?
         GROUP BY dia ORDER BY dia ASC`,
        [organizacionId, anioSeleccionado, mesSeleccionado]
      );
      const [gastosDiarios] = await pool.query(
        `SELECT DAY(fecha_registro) AS dia, SUM(total) AS total_gastos
         FROM compras_gastos
         WHERE organizacion_id = ? AND YEAR(fecha_registro) = ? AND MONTH(fecha_registro) = ?
         GROUP BY dia ORDER BY dia ASC`,
        [organizacionId, anioSeleccionado, mesSeleccionado]
      );
      const diasMap = {};
      for (let d = 1; d <= 31; d++) diasMap[d] = { dia: d, ingresos: 0, gastos: 0 };
      ventasDiarias.forEach(item => { if (diasMap[item.dia]) diasMap[item.dia].ingresos = item.total_ventas || 0; });
      gastosDiarios.forEach(item => { if (diasMap[item.dia]) diasMap[item.dia].gastos = item.total_gastos || 0; });
      datosDiarios = Object.values(diasMap).filter(d => d.ingresos > 0 || d.gastos > 0);
    } else {
      // Datos mensuales
      const [ventasPorMes] = await pool.query(
        `SELECT DATE_FORMAT(creado_en, '%Y-%m') AS mes, SUM(total_pagar) AS total_ventas
         FROM facturas
         WHERE organizacion_id = ? AND estado IN ('Emitida', 'Pagada')
           AND eliminado_en IS NULL AND creado_en >= ? AND creado_en <= ?
         GROUP BY mes ORDER BY mes ASC`,
        [organizacionId, fechaInicio, fechaFin]
      );
      const [gastosPorMes] = await pool.query(
        `SELECT DATE_FORMAT(fecha_registro, '%Y-%m') AS mes, SUM(total) AS total_gastos
         FROM compras_gastos
         WHERE organizacion_id = ? AND fecha_registro >= ? AND fecha_registro <= ?
         GROUP BY mes ORDER BY mes ASC`,
        [organizacionId, fechaInicio, fechaFin]
      );
      const mesesMap = {};
      ventasPorMes.forEach(item => { mesesMap[item.mes] = { mes: item.mes, ingresos: item.total_ventas, gastos: 0 }; });
      gastosPorMes.forEach(item => {
        if (mesesMap[item.mes]) mesesMap[item.mes].gastos = item.total_gastos;
        else mesesMap[item.mes] = { mes: item.mes, ingresos: 0, gastos: item.total_gastos };
      });
      datosMensuales = Object.values(mesesMap).sort((a, b) => a.mes.localeCompare(b.mes));
    }

    // ===== TOP CLIENTES =====
    const [topClients] = await pool.query(
      `SELECT c.id, c.nombre, COALESCE(SUM(f.total_pagar), 0) AS total_facturado
       FROM clientes c
       LEFT JOIN facturas f ON f.cliente_id = c.id
         AND f.organizacion_id = c.organizacion_id
         AND f.estado IN ('Emitida', 'Pagada')
         AND f.eliminado_en IS NULL
         AND f.creado_en >= ? AND f.creado_en <= ?
       WHERE c.organizacion_id = ?
       GROUP BY c.id, c.nombre
       ORDER BY total_facturado DESC
       LIMIT 5`,
      [fechaInicio, fechaFin, organizacionId]
    );

    res.json({
      periodo: { tipo: periodo, label: labelPeriodo, anio: anioSeleccionado, mes: mesSeleccionado },
      kpis: {
        ingresosPeriodo: totalIngresosPeriodo,
        gastosPeriodo: totalGastosPeriodo,
        cuentasCobrar: totalCxC,
        clientesActivos: totalClientesActivos,
        totalEmpleados,
        variacion: parseFloat(variacion.toFixed(2)),
      },
      datosMensuales,
      datosDiarios,
      topClientes: topClients,
    });
  } catch (error) {
    console.error('❌ [getDashboardCompleto] Error:', error);
    res.status(500).json({ message: 'Error al obtener dashboard completo', error: error.message });
  }
};

exports.obtenerMiOrganizacion = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT id, nombre_empresa, nombre_comercial, nit, nrc, 
              direccion, telefono, telefono_whatsapp, correo_contacto, 
              tipo_contribuyente, ambiente, logo_url, estado
       FROM organizaciones WHERE id = ?`,
      [organizacion_id]
    );
    console.log(organizacion_id);
    console.log(rows);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('❌ Error al obtener organización:', error);
    res.status(500).json({ message: 'Error al obtener organización', error: error.message });
  }
};

exports.obtenerMiConsumo = async (req, res) => {
  const organizacion_id = req.organizacion_id;
  try {
    // Obtener límites de la organización
    const [org] = await pool.query(
      'SELECT limite_facturas, limite_whatsapp, whatsapp_activado FROM organizaciones WHERE id = ?',
      [organizacion_id]
    );
    if (!org || org.length === 0) {
      return res.status(404).json({ message: 'Organización no encontrada' });
    }

    // Obtener consumo actual
    const mes = new Date().getMonth() + 1;
    const anio = new Date().getFullYear();
    const [consumo] = await pool.query(
      'SELECT facturas_generadas, whatsapp_enviados FROM consumo_mensual_organizacion WHERE organizacion_id = ? AND mes = ? AND anio = ?',
      [organizacion_id, mes, anio]
    );

    const facturas = {
      total: consumo && consumo.length > 0 ? parseInt(consumo[0].facturas_generadas) : 0,
      limite: parseInt(org[0].limite_facturas) || 40,
    };
    const whatsapp = {
      total: consumo && consumo.length > 0 ? parseInt(consumo[0].whatsapp_enviados) : 0,
      limite: parseInt(org[0].limite_whatsapp) || 200,
      activado: org[0].whatsapp_activado === 1,
    };

    res.json({ factura: facturas, whatsapp });
  } catch (error) {
    console.error('Error al obtener consumo:', error);
    res.status(500).json({ message: 'Error al obtener consumo' });
  }
};