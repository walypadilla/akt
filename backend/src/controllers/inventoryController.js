const Producto = require('../models/Producto');
const Warehouse = require('../models/Warehouse');
const InventoryMovement = require('../models/InventoryMovement');
const { pool } = require('../config/db');

// ============================================================
// FUNCIONES AUXILIARES (reutilizables)
// ============================================================

async function getProductosConFiltros(organizacion_id, filters = {}) {
  const {
    search = '',
    tipo = '',
    estado_stock = '',
    bodega_id = '',
    categoria_id = '',
    marca_id = '',
    etiqueta_id = '',
    incluir_desactivados = false,
    page = 1,
    limit = 12,
  } = filters;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `
    SELECT p.*, 
           COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Entrada' THEN m.cantidad ELSE 0 END), 0) AS total_entradas,
           COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Salida' THEN m.cantidad ELSE 0 END), 0) AS total_salidas,
           c.nombre AS categoria_nombre,
           mar.nombre AS marca_nombre,
           (SELECT GROUP_CONCAT(e.nombre) FROM producto_etiquetas pe JOIN etiquetas e ON pe.etiqueta_id = e.id WHERE pe.producto_id = p.id) AS etiquetas
    FROM productos p
    LEFT JOIN movimientos_inventario m ON p.id = m.producto_id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    LEFT JOIN marcas mar ON p.marca_id = mar.id
    WHERE p.organizacion_id = ?
  `;
  const params = [organizacion_id];

  if (!incluir_desactivados) {
    sql += ` AND p.activo = 1`;
  }

  if (search) {
    sql += ` AND (p.nombre LIKE ? OR p.codigo_sku LIKE ? OR p.codigo_barras LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }
  if (tipo) {
    sql += ` AND p.tipo = ?`;
    params.push(tipo);
  }
  if (estado_stock) {
    if (estado_stock === 'agotados') {
      sql += ` AND p.stock_actual <= 0`;
    } else if (estado_stock === 'minimo') {
      sql += ` AND p.stock_actual <= p.stock_minimo AND p.stock_actual > 0`;
    } else if (estado_stock === 'con_existencias') {
      sql += ` AND p.stock_actual > 0`;
    }
  }
  if (bodega_id) {
    sql += ` AND p.id IN (SELECT producto_id FROM producto_bodega WHERE bodega_id = ?)`;
    params.push(bodega_id);
  }
  if (categoria_id) {
    sql += ` AND p.categoria_id = ?`;
    params.push(categoria_id);
  }
  if (marca_id) {
    sql += ` AND p.marca_id = ?`;
    params.push(marca_id);
  }
  if (etiqueta_id) {
    sql += ` AND p.id IN (SELECT producto_id FROM producto_etiquetas WHERE etiqueta_id = ?)`;
    params.push(etiqueta_id);
  }

  sql += ` GROUP BY p.id ORDER BY p.nombre ASC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const [rows] = await pool.query(sql, params);

  let countSql = `
    SELECT COUNT(DISTINCT p.id) AS total
    FROM productos p
    WHERE p.organizacion_id = ? AND p.activo = 1
  `;
  const countParams = [organizacion_id];
  if (search) {
    countSql += ` AND (p.nombre LIKE ? OR p.codigo_sku LIKE ? OR p.codigo_barras LIKE ?)`;
    const searchParam = `%${search}%`;
    countParams.push(searchParam, searchParam, searchParam);
  }
  if (tipo) {
    countSql += ` AND p.tipo = ?`;
    countParams.push(tipo);
  }
  if (estado_stock) {
    if (estado_stock === 'agotados') {
      countSql += ` AND p.stock_actual <= 0`;
    } else if (estado_stock === 'minimo') {
      countSql += ` AND p.stock_actual <= p.stock_minimo AND p.stock_actual > 0`;
    } else if (estado_stock === 'con_existencias') {
      countSql += ` AND p.stock_actual > 0`;
    }
  }
  if (bodega_id) {
    countSql += ` AND p.id IN (SELECT producto_id FROM producto_bodega WHERE bodega_id = ?)`;
    countParams.push(bodega_id);
  }
  if (categoria_id) {
    countSql += ` AND p.categoria_id = ?`;
    countParams.push(categoria_id);
  }
  if (marca_id) {
    countSql += ` AND p.marca_id = ?`;
    countParams.push(marca_id);
  }
  if (etiqueta_id) {
    countSql += ` AND p.id IN (SELECT producto_id FROM producto_etiquetas WHERE etiqueta_id = ?)`;
    countParams.push(etiqueta_id);
  }

  const [countResult] = await pool.query(countSql, countParams);
  const total = countResult[0]?.total || 0;

  return {
    productos: rows,
    paginacion: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

// ============================================================
// 1. DASHBOARD
// ============================================================

exports.getInventoryDashboard = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { bodega_id, periodo = 'mes', anio = null, mes = null } = req.query;

    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;
    const anioSeleccionado = anio ? parseInt(anio) : añoActual;
    const mesSeleccionado = mes ? parseInt(mes) : mesActual;

    const [capitalResult] = await pool.query(
      `SELECT COALESCE(SUM(stock_actual * costo_promedio), 0) AS total
       FROM productos
       WHERE organizacion_id = ? AND activo = 1`,
      [organizacion_id]
    );
    const capitalInmovilizado = parseFloat(capitalResult[0]?.total) || 0;

    const [bajoStock] = await pool.query(
      `SELECT COUNT(*) AS total FROM productos 
       WHERE organizacion_id = ? AND activo = 1 AND stock_actual <= stock_minimo AND stock_actual > 0`,
      [organizacion_id]
    );
    const [agotados] = await pool.query(
      `SELECT COUNT(*) AS total FROM productos 
       WHERE organizacion_id = ? AND activo = 1 AND stock_actual <= 0`,
      [organizacion_id]
    );
    const [bajoStockDetalle] = await pool.query(
      `SELECT id, nombre, stock_actual, stock_minimo FROM productos 
       WHERE organizacion_id = ? AND activo = 1 AND stock_actual <= stock_minimo AND stock_actual > 0
       ORDER BY (stock_minimo - stock_actual) DESC LIMIT 20`,
      [organizacion_id]
    );
    const [agotadosDetalle] = await pool.query(
      `SELECT id, nombre, stock_actual, stock_minimo FROM productos 
       WHERE organizacion_id = ? AND activo = 1 AND stock_actual <= 0
       ORDER BY nombre LIMIT 20`,
      [organizacion_id]
    );

    const [totalProductos] = await pool.query(
      'SELECT COUNT(*) AS total FROM productos WHERE organizacion_id = ? AND activo = 1',
      [organizacion_id]
    );

    let fechaInicio;
    let fechaFin = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
    switch (periodo) {
      case 'mes':
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
        fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);
        break;
      case 'trimestre':
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 3, 1);
        fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);
        break;
      case 'anual':
        fechaInicio = new Date(anioSeleccionado, 0, 1);
        fechaFin = new Date(anioSeleccionado, 11, 31, 23, 59, 59);
        break;
      default:
        fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1 - 6, 1);
    }

    const [entradas] = await pool.query(
      `SELECT COALESCE(SUM(cantidad), 0) AS total
       FROM movimientos_inventario
       WHERE organizacion_id = ? AND tipo_movimiento = 'Entrada'
         AND created_at >= ? AND created_at <= ?`,
      [organizacion_id, fechaInicio, fechaFin]
    );
    const totalEntradas = parseFloat(entradas[0]?.total) || 0;

    const [salidas] = await pool.query(
      `SELECT COALESCE(SUM(cantidad), 0) AS total
       FROM movimientos_inventario
       WHERE organizacion_id = ? AND tipo_movimiento = 'Salida'
         AND created_at >= ? AND created_at <= ?`,
      [organizacion_id, fechaInicio, fechaFin]
    );
    const totalSalidas = parseFloat(salidas[0]?.total) || 0;

    let fechaInicioAnual = new Date(anioSeleccionado, 0, 1);
    let fechaFinAnual = new Date(anioSeleccionado, 11, 31, 23, 59, 59);
    const [movMensuales] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes,
              SUM(CASE WHEN tipo_movimiento = 'Entrada' THEN cantidad ELSE 0 END) AS entradas,
              SUM(CASE WHEN tipo_movimiento = 'Salida' THEN cantidad ELSE 0 END) AS salidas
       FROM movimientos_inventario
       WHERE organizacion_id = ? AND created_at >= ? AND created_at <= ?
       GROUP BY mes
       ORDER BY mes ASC`,
      [organizacion_id, fechaInicioAnual, fechaFinAnual]
    );

    const [topProductos] = await pool.query(
      `SELECT p.id, p.nombre, p.stock_actual,
              COALESCE(SUM(df.cantidad), 0) AS total_vendido,
              COALESCE(SUM(df.subtotal), 0) AS total_ingresos
       FROM productos p
       LEFT JOIN detalles_factura df ON p.id = df.producto_id
       LEFT JOIN facturas f ON df.factura_id = f.id
       WHERE p.organizacion_id = ? AND p.activo = 1
         AND (f.estado = 'Pagada' OR f.estado IS NULL)
         AND (f.creado_en >= ? OR f.creado_en IS NULL)
       GROUP BY p.id, p.nombre, p.stock_actual
       ORDER BY total_vendido DESC
       LIMIT 5`,
      [organizacion_id, fechaInicioAnual]
    );

    const [movimientosRecientes] = await pool.query(
      `SELECT m.*, p.nombre AS producto_nombre, b.nombre AS bodega_nombre
       FROM movimientos_inventario m
       JOIN productos p ON m.producto_id = p.id
       LEFT JOIN bodegas b ON m.bodega_id = b.id
       WHERE m.organizacion_id = ? 
         AND m.created_at >= ? AND m.created_at <= ?
       ORDER BY m.created_at DESC
       LIMIT 20`,
      [organizacion_id, fechaInicioAnual, fechaFinAnual]
    );

    res.json({
      kpis: {
        capitalInmovilizado,
        productosBajoStock: bajoStock[0]?.total || 0,
        productosAgotados: agotados[0]?.total || 0,
        totalProductos: totalProductos[0]?.total || 0,
        totalEntradas,
        totalSalidas,
      },
      alertas: {
        bajoStock: bajoStockDetalle,
        agotados: agotadosDetalle,
      },
      datosMensuales: movMensuales,
      topProductos,
      movimientosRecientes,
      periodo: {
        tipo: periodo,
        label: `${periodo.charAt(0).toUpperCase() + periodo.slice(1)} ${anioSeleccionado}${mesSeleccionado ? `-${mesSeleccionado}` : ''}`,
      },
    });
  } catch (error) {
    console.error('❌ [getInventoryDashboard] Error:', error);
    res.status(500).json({ message: 'Error al obtener dashboard de inventario', error: error.message });
  }
};

// ============================================================
// 2. PRODUCTOS (CRUD)
// ============================================================

exports.getProductos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { 
      search, tipo, estado_stock, bodega_id, categoria_id, marca_id, etiqueta_id, 
      incluir_desactivados, 
      page = 1, limit = 12 
    } = req.query;
    const result = await getProductosConFiltros(organizacion_id, { 
      search, tipo, estado_stock, bodega_id, categoria_id, marca_id, etiqueta_id,
      incluir_desactivados: incluir_desactivados === 'true',
      page, limit 
    });
    res.json(result);
  } catch (error) {
    console.error('❌ [getProductos] Error:', error);
    res.status(500).json({ message: 'Error al obtener productos', error: error.message });
  }
};

exports.getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const producto = await Producto.findById(id, organizacion_id);
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error('❌ [getProductoById] Error:', error);
    res.status(500).json({ message: 'Error al obtener producto', error: error.message });
  }
};

exports.createProducto = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const data = { ...req.body, organizacion_id };
    const id = await Producto.create(data);
    res.status(201).json({ message: 'Producto creado', id });
  } catch (error) {
    console.error('❌ [createProducto] Error:', error);
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const data = req.body;
    await Producto.update(id, organizacion_id, data);
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    console.error('❌ [updateProducto] Error:', error);
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Producto.delete(id, organizacion_id);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('❌ [deleteProducto] Error:', error);
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
};

// ============================================================
// 3. MOVIMIENTOS
// ============================================================

exports.getMovimientos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { producto_id, bodega_id, tipo_movimiento, fecha_inicio, fecha_fin, limit = 50, offset = 0 } = req.query;
    const filters = { producto_id, bodega_id, tipo_movimiento, fecha_inicio, fecha_fin, limit, offset };
    const movimientos = await InventoryMovement.findAll(organizacion_id, filters);
    res.json(movimientos);
  } catch (error) {
    console.error('❌ [getMovimientos] Error:', error);
    res.status(500).json({ message: 'Error al obtener movimientos', error: error.message });
  }
};

// ============================================================
// 4. KARDEX
// ============================================================

exports.getKardex = async (req, res) => {
  try {
    const { producto_id } = req.params;
    const organizacion_id = req.organizacion_id;
    let { fecha_inicio, fecha_fin } = req.query;

    if (!fecha_inicio || !fecha_fin) {
      const hoy = new Date();
      fecha_fin = hoy.toISOString().split('T')[0];
      const inicio = new Date();
      inicio.setMonth(inicio.getMonth() - 3);
      fecha_inicio = inicio.toISOString().split('T')[0];
    }

    if (new Date(fecha_inicio) > new Date(fecha_fin)) {
      return res.status(400).json({ message: 'La fecha de inicio no puede ser mayor a la fecha final' });
    }

    const movimientos = await InventoryMovement.getKardex(
      producto_id,
      organizacion_id,
      `${fecha_inicio} 00:00:00`,
      `${fecha_fin} 23:59:59`
    );

    let saldo = 0;
    const movimientosConSaldo = movimientos.map(m => {
      if (m.tipo_movimiento === 'Entrada') saldo += parseFloat(m.cantidad);
      else if (m.tipo_movimiento === 'Salida' || m.tipo_movimiento === 'Ajuste') saldo -= parseFloat(m.cantidad);
      return { ...m, saldo_acumulado: saldo };
    });

    res.json({
      producto_id,
      fecha_inicio,
      fecha_fin,
      movimientos: movimientosConSaldo,
    });
  } catch (error) {
    console.error('❌ [getKardex] Error:', error);
    res.status(500).json({ message: 'Error al obtener kardex', error: error.message });
  }
};

// ============================================================
// 5. AJUSTES DE INVENTARIO
// ============================================================

exports.createAjuste = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const organizacion_id = req.organizacion_id;
    const usuario_id = req.usuario_id || req.user?.id;

    const {
      producto_id,
      bodega_id = null,
      tipo_ajuste,
      cantidad,
      motivo,
      descripcion = null,
      costo_unitario = 0
    } = req.body;

    if (!producto_id || !tipo_ajuste || !cantidad) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Los campos producto_id, tipo_ajuste y cantidad son obligatorios.'
      });
    }

    const motivosValidosENUM = {
      'merma': 'Merma',
      'vencimiento': 'Vencimiento',
      'robo': 'Robo',
      'devolucion': 'Devolucion_Proveedor',
      'devolucion_proveedor': 'Devolucion_Proveedor',
      'devolucion de cliente': 'Otro',
      'inventario_inicial': 'Inventario_Inicial',
      'inventario inicial': 'Inventario_Inicial',
      'ajuste manual': 'Otro',
      'otro': 'Otro'
    };

    const motivoKey = (motivo || '').toLowerCase().trim();
    const motivoFinal = motivosValidosENUM[motivoKey] || 'Otro';

    const tipoAjusteFinal = tipo_ajuste.toLowerCase() === 'entrada' ? 'Entrada' : 'Salida';
    const cantidadNum = parseFloat(cantidad);

    const sqlInsert = `
      INSERT INTO ajustes_inventario 
        (organizacion_id, producto_id, bodega_id, tipo_ajuste, cantidad, motivo, descripcion, costo_unitario, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [resultInsert] = await connection.query(sqlInsert, [
      organizacion_id,
      producto_id,
      bodega_id || null,
      tipoAjusteFinal,
      cantidadNum,
      motivoFinal,
      descripcion,
      parseFloat(costo_unitario) || 0,
      usuario_id
    ]);

    const operador = tipoAjusteFinal === 'Entrada' ? '+' : '-';
    const sqlUpdateStock = `
      UPDATE productos 
      SET stock_actual = stock_actual ${operador} ? 
      WHERE id = ? AND organizacion_id = ?
    `;

    await connection.query(sqlUpdateStock, [cantidadNum, producto_id, organizacion_id]);

    await connection.commit();

    return res.status(201).json({
      message: 'Ajuste de inventario registrado correctamente',
      ajuste_id: resultInsert.insertId
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ [createAjuste] Error:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Error al registrar el ajuste de inventario',
        error: error.message
      });
    }
  } finally {
    connection.release();
  }
};


exports.getAjustes = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { producto_id, bodega_id, motivo, fecha_inicio, fecha_fin } = req.query;
    let sql = `
      SELECT a.*, p.nombre AS producto_nombre, u.nombre AS usuario_nombre, b.nombre AS bodega_nombre
      FROM ajustes_inventario a
      JOIN productos p ON a.producto_id = p.id
      LEFT JOIN bodegas b ON a.bodega_id = b.id
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.organizacion_id = ?
    `;
    const params = [organizacion_id];
    if (producto_id) {
      sql += ' AND a.producto_id = ?';
      params.push(producto_id);
    }
    if (bodega_id) {
      sql += ' AND a.bodega_id = ?';
      params.push(bodega_id);
    }
    if (motivo) {
      sql += ' AND a.motivo = ?';
      params.push(motivo);
    }
    if (fecha_inicio && fecha_fin) {
      sql += ' AND a.created_at >= ? AND a.created_at <= ?';
      params.push(fecha_inicio, fecha_fin);
    }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('❌ [getAjustes] Error:', error);
    res.status(500).json({ message: 'Error al obtener ajustes', error: error.message });
  }
};

// ============================================================
// 6. REPORTES
// ============================================================

exports.getPareto = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { bodega_id, periodo = 'mes' } = req.query;

    const hoy = new Date();
    const fechaFin = hoy.toISOString().split('T')[0];
    let fechaInicio = new Date();
    if (periodo === 'mes') fechaInicio.setMonth(fechaInicio.getMonth() - 1);
    else if (periodo === 'trimestre') fechaInicio.setMonth(fechaInicio.getMonth() - 3);
    else if (periodo === 'anual') fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
    else fechaInicio.setMonth(fechaInicio.getMonth() - 6);

    const [rows] = await pool.query(
      `SELECT p.id, p.nombre, p.stock_actual, p.costo_promedio, p.precio_unitario,
              COALESCE(SUM(df.cantidad), 0) AS total_vendido,
              COALESCE(SUM(df.subtotal), 0) AS total_ingresos
       FROM productos p
       LEFT JOIN detalles_factura df ON p.id = df.producto_id
       LEFT JOIN facturas f ON df.factura_id = f.id
       WHERE p.organizacion_id = ? AND p.activo = 1
         AND (f.estado = 'Pagada' OR f.estado IS NULL)
         AND (f.creado_en >= ? OR f.creado_en IS NULL)
       GROUP BY p.id, p.nombre, p.stock_actual, p.costo_promedio, p.precio_unitario
       ORDER BY total_ingresos DESC
       LIMIT 20`,
      [organizacion_id, fechaInicio]
    );

    const totalIngresos = rows.reduce((acc, r) => acc + parseFloat(r.total_ingresos), 0);
    let acumulado = 0;
    const resultado = rows.map(r => {
      const ingresos = parseFloat(r.total_ingresos);
      acumulado += ingresos;
      return {
        ...r,
        total_ingresos: ingresos,
        porcentaje: totalIngresos > 0 ? (ingresos / totalIngresos) * 100 : 0,
        porcentaje_acumulado: totalIngresos > 0 ? (acumulado / totalIngresos) * 100 : 0,
        margen_unitario: parseFloat(r.precio_unitario) - parseFloat(r.costo_promedio),
        margen_porcentaje: parseFloat(r.precio_unitario) > 0 
          ? ((parseFloat(r.precio_unitario) - parseFloat(r.costo_promedio)) / parseFloat(r.precio_unitario) * 100)
          : 0,
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('❌ [getPareto] Error:', error);
    res.status(500).json({ message: 'Error al obtener Pareto', error: error.message });
  }
};

exports.getLentoMovimiento = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { dias = 90 } = req.query;

    const [rows] = await pool.query(
      `SELECT p.id, p.nombre, p.stock_actual, p.costo_promedio, p.precio_unitario,
              (SELECT MAX(created_at) FROM detalles_factura df 
               JOIN facturas f ON df.factura_id = f.id 
               WHERE df.producto_id = p.id AND f.estado = 'Pagada') AS ultima_venta,
              COALESCE((
                SELECT COUNT(*) FROM detalles_factura df 
                JOIN facturas f ON df.factura_id = f.id 
                WHERE df.producto_id = p.id AND f.estado = 'Pagada'
              ), 0) AS total_ventas
       FROM productos p
       WHERE p.organizacion_id = ? AND p.activo = 1
         AND p.id NOT IN (
           SELECT DISTINCT df.producto_id FROM detalles_factura df
           JOIN facturas f ON df.factura_id = f.id
           WHERE f.estado = 'Pagada' AND f.creado_en >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
         )
       ORDER BY total_ventas ASC, stock_actual DESC`,
      [organizacion_id, dias]
    );

    res.json(rows);
  } catch (error) {
    console.error('❌ [getLentoMovimiento] Error:', error);
    res.status(500).json({ message: 'Error al obtener lento movimiento', error: error.message });
  }
};

exports.getValoracionInventario = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { bodega_id } = req.query;

    let sql = `
      SELECT p.id, p.nombre, p.stock_actual, p.costo_promedio, 
             (p.stock_actual * p.costo_promedio) AS valor_total,
             p.precio_unitario, 
             ((p.precio_unitario - p.costo_promedio) / p.precio_unitario * 100) AS margen
      FROM productos p
      WHERE p.organizacion_id = ? AND p.activo = 1 AND p.stock_actual > 0
    `;
    const params = [organizacion_id];
    if (bodega_id) {
      sql += ` AND p.id IN (SELECT producto_id FROM producto_bodega WHERE bodega_id = ?)`;
      params.push(bodega_id);
    }
    sql += ` ORDER BY valor_total DESC`;

    const [rows] = await pool.query(sql, params);
    const totalValor = rows.reduce((acc, r) => acc + parseFloat(r.valor_total), 0);

    res.json({
      productos: rows,
      total_valor: totalValor,
      total_productos: rows.length,
    });
  } catch (error) {
    console.error('❌ [getValoracionInventario] Error:', error);
    res.status(500).json({ message: 'Error al obtener valoración', error: error.message });
  }
};

exports.getTomaFisica = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { bodega_id } = req.query;

    let sql = `
      SELECT p.id, p.nombre, p.stock_actual AS stock_sistema, p.ubicacion, 
             p.codigo_sku, p.codigo_barras, '' AS stock_fisico
      FROM productos p
      WHERE p.organizacion_id = ? AND p.activo = 1 AND p.tipo = 'Producto'
    `;
    const params = [organizacion_id];
    if (bodega_id) {
      sql += ` AND p.id IN (SELECT producto_id FROM producto_bodega WHERE bodega_id = ?)`;
      params.push(bodega_id);
    }
    sql += ` ORDER BY p.nombre ASC`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('❌ [getTomaFisica] Error:', error);
    res.status(500).json({ message: 'Error al obtener toma física', error: error.message });
  }
};

exports.exportarReporte = async (req, res) => {
  try {
    const { tipo } = req.params;
    const organizacion_id = req.organizacion_id;
    const {
      producto_id,
      fecha_inicio,
      fecha_fin,
      dias,
      estado_stock,
      tipo_producto,
      bodega_id,
      categoria_id,
      marca_id,
      etiqueta_id,
    } = req.query;

    let data = [];
    let filename = '';

    const validarFechas = (inicio, fin) => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const dInicio = new Date(inicio);
      const dFin = new Date(fin);
      if (isNaN(dInicio) || isNaN(dFin)) {
        throw new Error('Formato de fecha inválido');
      }
      if (dInicio > dFin) {
        throw new Error('La fecha de inicio no puede ser mayor a la fecha final');
      }
      if (dInicio > hoy) {
        throw new Error('La fecha de inicio no puede ser mayor a la fecha actual');
      }
      if (dFin > hoy) {
        throw new Error('La fecha final no puede ser mayor a la fecha actual');
      }
    };

    // ========== KARDEX ==========
    if (tipo === 'kardex') {
      let inicio = fecha_inicio || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0];
      let fin = fecha_fin || new Date().toISOString().split('T')[0];
      validarFechas(inicio, fin);

      let sql = `
        SELECT 
          m.id,
          m.created_at AS fecha,
          m.referencia_tipo AS documento,
          m.tipo_movimiento AS tipo,
          m.cantidad,
          m.stock_anterior,
          m.stock_nuevo,
          p.nombre AS producto_nombre,
          p.codigo_sku AS sku,
          b.nombre AS bodega_nombre
        FROM movimientos_inventario m
        JOIN productos p ON m.producto_id = p.id
        LEFT JOIN bodegas b ON m.bodega_id = b.id
        WHERE m.organizacion_id = ?
          AND m.created_at BETWEEN ? AND ?
      `;
      const params = [organizacion_id, `${inicio} 00:00:00`, `${fin} 23:59:59`];

      if (producto_id) {
        sql += ' AND m.producto_id = ?';
        params.push(producto_id);
      }

      sql += ' ORDER BY m.created_at ASC, m.id ASC';

      const [rows] = await pool.query(sql, params);

      const saldos = {};
      data = rows.map(row => {
        const key = row.producto_nombre + row.sku;
        if (!saldos[key]) saldos[key] = 0;
        const saldoActual = saldos[key];
        let nuevoSaldo = saldoActual;
        if (row.tipo === 'Entrada') nuevoSaldo += parseFloat(row.cantidad);
        else if (row.tipo === 'Salida' || row.tipo === 'Ajuste') nuevoSaldo -= parseFloat(row.cantidad);
        saldos[key] = nuevoSaldo;

        return {
          Fecha: row.fecha,
          Producto: row.producto_nombre,
          SKU: row.sku || '',
          Documento: row.documento || '',
          Tipo: row.tipo,
          Cantidad: row.cantidad,
          'Saldo Acumulado': nuevoSaldo,
          Bodega: row.bodega_nombre || 'N/A',
        };
      });

      filename = `kardex_${producto_id || 'todos'}_${inicio}_${fin}.csv`;
    }

    // ========== RENTABILIDAD ==========
    else if (tipo === 'rentabilidad') {
      let inicio = fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      let fin = fecha_fin || new Date().toISOString().split('T')[0];
      validarFechas(inicio, fin);

      let sql = `
        SELECT 
          p.id,
          p.nombre AS producto,
          p.codigo_sku AS sku,
          p.costo_promedio,
          p.precio_unitario,
          COALESCE(SUM(df.cantidad), 0) AS total_vendido,
          COALESCE(SUM(df.subtotal), 0) AS total_ingresos,
          COALESCE(SUM(df.cantidad * p.costo_promedio), 0) AS total_costo
        FROM productos p
        LEFT JOIN detalles_factura df ON p.id = df.producto_id
        LEFT JOIN facturas f ON df.factura_id = f.id
        WHERE p.organizacion_id = ? AND p.activo = 1
          AND (f.estado = 'Pagada' OR f.estado IS NULL)
          AND (f.creado_en BETWEEN ? AND ? OR f.creado_en IS NULL)
      `;
      const params = [organizacion_id, `${inicio} 00:00:00`, `${fin} 23:59:59`];

      if (producto_id) {
        sql += ' AND p.id = ?';
        params.push(producto_id);
      }

      sql += ' GROUP BY p.id ORDER BY total_ingresos DESC';

      const [rows] = await pool.query(sql, params);

      data = rows.map(r => ({
        Producto: r.producto,
        SKU: r.sku || '',
        'Costo Promedio': parseFloat(r.costo_promedio).toFixed(2),
        'Precio Venta': parseFloat(r.precio_unitario).toFixed(2),
        'Unidades Vendidas': r.total_vendido,
        'Ingresos Totales': parseFloat(r.total_ingresos).toFixed(2),
        'Costo Total': parseFloat(r.total_costo).toFixed(2),
        'Margen $': (parseFloat(r.total_ingresos) - parseFloat(r.total_costo)).toFixed(2),
        'Margen %': parseFloat(r.total_ingresos) > 0
          ? (((parseFloat(r.total_ingresos) - parseFloat(r.total_costo)) / parseFloat(r.total_ingresos)) * 100).toFixed(2)
          : '0.00',
      }));

      filename = `rentabilidad_${inicio}_${fin}.csv`;
    }

    // ========== TOMA FÍSICA ==========
    else if (tipo === 'toma-fisica') {
      let sql = `
        SELECT 
          p.id,
          p.nombre AS producto,
          p.codigo_sku AS sku,
          p.ubicacion,
          p.stock_actual AS stock_sistema,
          '' AS stock_fisico
        FROM productos p
        WHERE p.organizacion_id = ? AND p.activo = 1 AND p.tipo = 'Producto'
      `;
      const params = [organizacion_id];
      if (bodega_id) {
        sql += ' AND p.id IN (SELECT producto_id FROM producto_bodega WHERE bodega_id = ?)';
        params.push(bodega_id);
      }
      sql += ' ORDER BY p.nombre ASC';

      const [rows] = await pool.query(sql, params);
      data = rows.map(r => ({
        Producto: r.producto,
        SKU: r.sku || '',
        Ubicación: r.ubicacion || '',
        'Stock Sistema': r.stock_sistema,
        'Stock Físico': r.stock_fisico,
      }));
      filename = 'toma_fisica.csv';
    }

    // ========== LENTO MOVIMIENTO ==========
    else if (tipo === 'lento-movimiento') {
      const diasFiltro = parseInt(dias) || 5; 
      let sql = `
        SELECT 
          p.id,
          p.nombre AS producto,
          p.codigo_sku AS sku,
          p.stock_actual,
          p.costo_promedio,
          (p.stock_actual * p.costo_promedio) AS valor_stock
        FROM productos p
        WHERE p.organizacion_id = ? AND p.activo = 1
          AND p.id NOT IN (
            SELECT DISTINCT df.producto_id 
            FROM detalles_factura df
            JOIN facturas f ON df.factura_id = f.id
            WHERE f.estado = 'Pagada' 
              AND f.creado_en >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
          )
      `;
      const params = [organizacion_id, diasFiltro];

      if (estado_stock) {
        if (estado_stock === 'agotados') sql += ' AND p.stock_actual <= 0';
        else if (estado_stock === 'minimo') sql += ' AND p.stock_actual <= p.stock_minimo AND p.stock_actual > 0';
        else if (estado_stock === 'con_existencias') sql += ' AND p.stock_actual > 0';
      }
      if (tipo_producto) {
        sql += ' AND p.tipo = ?';
        params.push(tipo_producto);
      }
      if (bodega_id) {
        sql += ' AND p.id IN (SELECT producto_id FROM producto_bodega WHERE bodega_id = ?)';
        params.push(bodega_id);
      }
      if (categoria_id) {
        sql += ' AND p.categoria_id = ?';
        params.push(categoria_id);
      }
      if (marca_id) {
        sql += ' AND p.marca_id = ?';
        params.push(marca_id);
      }
      if (etiqueta_id) {
        sql += ' AND p.id IN (SELECT producto_id FROM producto_etiquetas WHERE etiqueta_id = ?)';
        params.push(etiqueta_id);
      }

      sql += ' ORDER BY p.nombre ASC';

      const [rows] = await pool.query(sql, params);
      data = rows.map(r => ({
        Producto: r.producto,
        SKU: r.sku || '',
        Stock: r.stock_actual,
        'Costo Unitario': parseFloat(r.costo_promedio).toFixed(2),
        'Valor Stock': parseFloat(r.valor_stock).toFixed(2),
      }));
      filename = `lento_movimiento_${diasFiltro}dias.csv`;
    }

    // ========== VALORACIÓN ==========
    else if (tipo === 'valoracion') {
      let sql = `
        SELECT 
          p.id,
          p.nombre AS producto,
          p.codigo_sku AS sku,
          p.stock_actual,
          p.costo_promedio,
          (p.stock_actual * p.costo_promedio) AS valor_total
        FROM productos p
        WHERE p.organizacion_id = ? AND p.activo = 1 AND p.stock_actual > 0
      `;
      const params = [organizacion_id];

      if (estado_stock) {
        if (estado_stock === 'agotados') sql += ' AND p.stock_actual <= 0';
        else if (estado_stock === 'minimo') sql += ' AND p.stock_actual <= p.stock_minimo AND p.stock_actual > 0';
        else if (estado_stock === 'con_existencias') sql += ' AND p.stock_actual > 0';
      }
      if (tipo_producto) {
        sql += ' AND p.tipo = ?';
        params.push(tipo_producto);
      }
      if (bodega_id) {
        sql += ' AND p.id IN (SELECT producto_id FROM producto_bodega WHERE bodega_id = ?)';
        params.push(bodega_id);
      }
      if (categoria_id) {
        sql += ' AND p.categoria_id = ?';
        params.push(categoria_id);
      }
      if (marca_id) {
        sql += ' AND p.marca_id = ?';
        params.push(marca_id);
      }
      if (etiqueta_id) {
        sql += ' AND p.id IN (SELECT producto_id FROM producto_etiquetas WHERE etiqueta_id = ?)';
        params.push(etiqueta_id);
      }

      sql += ' ORDER BY valor_total DESC';

      const [rows] = await pool.query(sql, params);
      data = rows.map(r => ({
        Producto: r.producto,
        SKU: r.sku || '',
        Stock: r.stock_actual,
        'Costo Promedio': parseFloat(r.costo_promedio).toFixed(2),
        'Valor Total': parseFloat(r.valor_total).toFixed(2),
      }));
      filename = 'valoracion_inventario.csv';
    }

    // ========== TOP 30 CAMBIOS DE PRECIO (AHORA FILA POR FILA Y ÚLTIMOS 6 MESES) ==========
    else if (tipo === 'top-cambios-precio') {
      const [rows] = await pool.query(`
        SELECT 
          p.nombre AS Producto,
          p.codigo_sku AS SKU,
          p.costo_promedio AS Costo_Actual,
          DATE_FORMAT(ch.created_at, '%Y-%m-%d %H:%i:%s') AS Fecha_Cambio,
          ch.costo_anterior AS Precio_Anterior,
          IFNULL(prov.razon_social, 'N/A') AS Proveedor,
          ch.motivo AS Motivo,
          IFNULL(ch.comentario, '') AS Comentario
        FROM costos_historicos ch
        JOIN productos p ON ch.producto_id = p.id
        LEFT JOIN proveedores prov ON ch.proveedor_id = prov.id
        WHERE p.organizacion_id = ? 
          AND p.activo = 1
          AND ch.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
        ORDER BY ch.created_at DESC
        LIMIT 30
      `, [organizacion_id]);

      data = rows.map(r => ({
        Producto: r.Producto,
        SKU: r.SKU || '',
        'Costo Actual': parseFloat(r.Costo_Actual).toFixed(2),
        'Fecha de cambio': r.Fecha_Cambio,
        'Precio Anterior': parseFloat(r.Precio_Anterior).toFixed(2),
        Proveedor: r.Proveedor,
        Motivo: r.Motivo,
        Comentario: r.Comentario,
      }));
      filename = 'top_cambios_precio.csv';
    }

    // ========== MOVIMIENTOS PRODUCTO (ENTRADAS/SALIDAS) ==========
    else if (tipo === 'movimientos-producto') {
      let sql = `
        SELECT 
          p.nombre AS producto,
          p.codigo_sku AS sku,
          COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Entrada' THEN m.cantidad ELSE 0 END), 0) AS total_entradas,
          COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Salida' THEN m.cantidad ELSE 0 END), 0) AS total_salidas,
          COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Entrada' THEN m.cantidad ELSE 0 END) - SUM(CASE WHEN m.tipo_movimiento = 'Salida' THEN m.cantidad ELSE 0 END), 0) AS saldo
        FROM movimientos_inventario m
        JOIN productos p ON m.producto_id = p.id
        WHERE m.organizacion_id = ?
      `;
      const params = [organizacion_id];

      // Si vienen ambas fechas válidas, filtra por rango; si no, consulta todo el historial
      if (fecha_inicio && fecha_fin) {
        const dInicio = new Date(fecha_inicio);
        const dFin = new Date(fecha_fin);
        if (isNaN(dInicio) || isNaN(dFin)) {
          throw new Error('Fechas inválidas');
        }
        if (dInicio > dFin) {
          throw new Error('La fecha de inicio no puede ser mayor a la fecha final');
        }
        sql += ` AND m.created_at BETWEEN ? AND ?`;
        params.push(`${fecha_inicio} 00:00:00`, `${fecha_fin} 23:59:59`);
      }

      sql += `
        GROUP BY p.id, p.nombre, p.codigo_sku
        HAVING total_entradas > 0 OR total_salidas > 0
        ORDER BY p.nombre
      `;

      const [rows] = await pool.query(sql, params);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'No hay movimientos registrados para mostrar' });
      }

      data = rows.map(r => ({
        Producto: r.producto,
        SKU: r.sku || '',
        'Total Entradas': r.total_entradas,
        'Total Salidas': r.total_salidas,
        Saldo: r.saldo,
      }));

      const sufijoFecha = (fecha_inicio && fecha_fin) ? `_${fecha_inicio}_${fecha_fin}` : '_historico_completo';
      filename = `movimientos_producto${sufijoFecha}.csv`;
      tituloReporte = 'ENTRADAS Y SALIDAS POR PRODUCTO';
    }

    else {
      return res.status(400).json({ message: 'Tipo de reporte inválido' });
    }

    if (data.length === 0) {
      return res.status(404).json({ message: 'No hay datos para exportar' });
    }

    let tituloReporte = 'REPORTE GENERAL';
    if (tipo === 'kardex') tituloReporte = 'KARDEX DETALLADO';
    else if (tipo === 'rentabilidad') tituloReporte = 'RENTABILIDAD POR PRODUCTO';
    else if (tipo === 'toma-fisica') tituloReporte = 'HOJA DE TOMA FÍSICA';
    else if (tipo === 'lento-movimiento') tituloReporte = 'MERCANCÍA DE LENTO MOVIMIENTO';
    else if (tipo === 'valoracion') tituloReporte = 'VALORACIÓN DE INVENTARIO';
    else if (tipo === 'top-cambios-precio') tituloReporte = 'TOP 30 CAMBIOS DE PRECIO';
    else if (tipo === 'movimientos-producto') tituloReporte = 'ENTRADAS SALIDAS'

    const headers = Object.keys(data[0]);
    let csv = '\uFEFF'; 
    csv += tituloReporte +'\n';   
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

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ [exportarReporte] Error:', error);
    res.status(500).json({ message: 'Error al exportar reporte', error: error.message });
  }
};

// ============================================================
// EXPORTAR TABLA FILTRADA (todos los productos)
// ============================================================
exports.exportarTabla = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const {
      search,
      tipo,
      estado_stock,
      bodega_id,
      categoria_id,
      marca_id,
      etiqueta_id,
    } = req.query;

    const result = await getProductosConFiltros(organizacion_id, {
      search,
      tipo,
      estado_stock,
      bodega_id,
      categoria_id,
      marca_id,
      etiqueta_id,
      page: 1,
      limit: 99999,
    });

    const productos = result.productos || [];

    if (productos.length === 0) {
      return res.status(404).json({ message: 'No hay productos para exportar' });
    }

    const data = productos.map(p => ({
      Nombre: p.nombre,
      SKU: p.codigo_sku || '',
      'Código Barras': p.codigo_barras || '',
      Tipo: p.tipo || 'Producto',
      Stock: p.stock_actual,
      'Stock Mínimo': p.stock_minimo,
      'Precio Unitario': parseFloat(p.precio_unitario).toFixed(2),
      'Costo Promedio': parseFloat(p.costo_promedio).toFixed(2),
      'Valor Inventario': (parseFloat(p.stock_actual) * parseFloat(p.costo_promedio)).toFixed(2),
      Categoría: p.categoria_nombre || '',
      Marca: p.marca_nombre || '',
      Etiquetas: p.etiquetas || '',
    }));

    let parteEstado = 'Inventario General';
    if (estado_stock === 'minimo' || estado_stock === 'punto_reorden') {
      parteEstado = 'Productos en Punto de Reorden';
    } else if (estado_stock === 'con_existencias') {
      parteEstado = 'Productos con Existencias';
    } else if (estado_stock === 'agotados') {
      parteEstado = 'Productos Agotados';
    }

    let parteTipo = tipo ? `Tipo: ${tipo}` : 'Tipo: Todos';
    let tituloDinamico = `${parteEstado} | ${parteTipo}`;

    const headers = Object.keys(data[0]);
    let csv = '\uFEFF';
    let sepChar = ';';
    csv += `sep=${sepChar}\n`;
    csv += `"${tituloDinamico}";;\n\n`; 
    csv += headers.join(sepChar) + '\n'; 

    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val); 
        if (val.includes(sepChar) || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(sepChar) + '\n';
    }

    const filename = `productos_${estado_stock || 'general'}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ [exportarTabla] Error:', error);
    res.status(500).json({ message: 'Error al exportar tabla', error: error.message });
  }
};

// ============================================================
// 7. KITS (COMBOS)
// ============================================================

exports.getKitComponentes = async (req, res) => {
  try {
    const { producto_kit_id } = req.params;
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT pc.*, p.nombre AS componente_nombre, p.precio_unitario
       FROM producto_componentes pc
       JOIN productos p ON pc.producto_componente_id = p.id
       WHERE pc.producto_kit_id = ? AND p.organizacion_id = ?`,
      [producto_kit_id, organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ [getKitComponentes] Error:', error);
    res.status(500).json({ message: 'Error al obtener componentes del kit', error: error.message });
  }
};

exports.addKitComponente = async (req, res) => {
  try {
    const { producto_kit_id, producto_componente_id, cantidad } = req.body;
    const organizacion_id = req.organizacion_id;
    const [kit] = await pool.query(
      'SELECT id FROM productos WHERE id = ? AND organizacion_id = ? AND es_kit = 1',
      [producto_kit_id, organizacion_id]
    );
    if (kit.length === 0) {
      return res.status(404).json({ message: 'Kit no encontrado' });
    }
    await pool.query(
      `INSERT INTO producto_componentes (producto_kit_id, producto_componente_id, cantidad)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)`,
      [producto_kit_id, producto_componente_id, cantidad]
    );
    res.status(201).json({ message: 'Componente agregado al kit' });
  } catch (error) {
    console.error('❌ [addKitComponente] Error:', error);
    res.status(500).json({ message: 'Error al agregar componente', error: error.message });
  }
};

exports.removeKitComponente = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const [componente] = await pool.query(
      `SELECT pc.id FROM producto_componentes pc
       JOIN productos p ON pc.producto_kit_id = p.id
       WHERE pc.id = ? AND p.organizacion_id = ?`,
      [id, organizacion_id]
    );
    if (componente.length === 0) {
      return res.status(404).json({ message: 'Componente no encontrado' });
    }
    await pool.query('DELETE FROM producto_componentes WHERE id = ?', [id]);
    res.json({ message: 'Componente eliminado del kit' });
  } catch (error) {
    console.error('❌ [removeKitComponente] Error:', error);
    res.status(500).json({ message: 'Error al eliminar componente', error: error.message });
  }
};

// ============================================================
// 8. COSTOS HISTÓRICOS (CON VALIDACIÓN DE MOTIVO Y LÓGICA DE PRECIOS)
// ============================================================

exports.registrarCostoHistorico = async (req, res) => {
  let connection;
  
  try {
    const organizacion_id = req.organizacion_id;
    const usuario_id = req.usuario_id || req.user?.id;
    const { producto_id, proveedor_id, costo_nuevo, motivo, comentario } = req.body;

    // 1. Validar campos obligatorios (proveedor_id queda excluido para permitir cambios internos)
    if (!producto_id || costo_nuevo === undefined || costo_nuevo === null || !motivo) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    // Validar motivo estrictamente a "Aumento" o "Rebaja"
    const motivoTrim = motivo.trim().toLowerCase();
    let motivoFinal = '';
    if (motivoTrim === 'aumento') {
      motivoFinal = 'Aumento';
    } else if (motivoTrim === 'rebaja') {
      motivoFinal = 'Rebaja';
    } else {
      return res.status(400).json({ message: 'El motivo debe ser estrictamente "Aumento" o "Rebaja".' });
    }

    // 2. Iniciar Transacción de Base de Datos para asegurar atomicidad
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Buscar producto bloqueando la fila (FOR UPDATE)
    const [producto] = await connection.query(
      'SELECT costo_promedio FROM productos WHERE id = ? AND organizacion_id = ? FOR UPDATE',
      [producto_id, organizacion_id]
    );
    
    if (producto.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const costoAnterior = parseFloat(producto[0].costo_promedio);
    const costoNuevo = parseFloat(costo_nuevo);

    if (costoAnterior === costoNuevo) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: 'El nuevo costo es igual al actual' });
    }

    // Reglas de validación según el motivo:
    if (motivoFinal === 'Rebaja' && costoNuevo > costoAnterior) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: 'Si es rebaja el precio no puede ser mayor al actual.' });
    }
    if (motivoFinal === 'Aumento' && costoNuevo < costoAnterior) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: 'Si es aumento no debe ser menor al actual de ajuste de precio.' });
    }

    // 3. Actualizar el costo del producto
    await connection.query(
      'UPDATE productos SET costo_promedio = ? WHERE id = ? AND organizacion_id = ?',
      [costoNuevo, producto_id, organizacion_id]
    );

    // 4. Insertar el histórico (si no hay proveedor, se guarda como null de forma segura)
    await connection.query(
      `INSERT INTO costos_historicos 
       (producto_id, proveedor_id, costo_anterior, costo_nuevo, motivo, comentario, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [producto_id, proveedor_id || null, costoAnterior, costoNuevo, motivoFinal, comentario || '', usuario_id]
    );

    // 5. Confirmar transacción
    await connection.commit();
    connection.release();

    res.json({
      message: 'Costo actualizado correctamente',
      costo_anterior: costoAnterior,
      costo_nuevo: costoNuevo,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('❌ [registrarCostoHistorico] Error:', error);
    res.status(500).json({ message: 'Error al registrar costo histórico', error: error.message });
  }
};

exports.getCostosHistoricos = async (req, res) => {
  try {
    const { producto_id } = req.params;
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT ch.*, p.nombre AS producto_nombre, prov.razon_social AS proveedor_nombre
       FROM costos_historicos ch
       JOIN productos p ON ch.producto_id = p.id
       LEFT JOIN proveedores prov ON ch.proveedor_id = prov.id
       WHERE ch.producto_id = ? AND p.organizacion_id = ?
       ORDER BY ch.created_at DESC`,
      [producto_id, organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ [getCostosHistoricos] Error:', error);
    res.status(500).json({ message: 'Error al obtener costos históricos', error: error.message });
  }
};

// ============================================================
// 9. BODEGAS (WAREHOUSES)
// ============================================================

exports.findAllWarehouses = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const warehouses = await Warehouse.findAll(organizacion_id);
    res.json(warehouses);
  } catch (error) {
    console.error('❌ [findAllWarehouses] Error:', error);
    res.status(500).json({ message: 'Error al obtener bodegas', error: error.message });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre, direccion, responsable } = req.body;
    const id = await Warehouse.create({ organizacion_id, nombre, direccion, responsable });
    res.status(201).json({ message: 'Bodega creada', id });
  } catch (error) {
    console.error('❌ [createWarehouse] Error:', error);
    res.status(500).json({ message: 'Error al crear bodega', error: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { nombre, direccion, responsable } = req.body;
    await Warehouse.update(id, organizacion_id, { nombre, direccion, responsable });
    res.json({ message: 'Bodega actualizada' });
  } catch (error) {
    console.error('❌ [updateWarehouse] Error:', error);
    res.status(500).json({ message: 'Error al actualizar bodega', error: error.message });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await Warehouse.delete(id, organizacion_id);
    res.json({ message: 'Bodega eliminada' });
  } catch (error) {
    console.error('❌ [deleteWarehouse] Error:', error);
    res.status(500).json({ message: 'Error al eliminar bodega', error: error.message });
  }
};

// ============================================================
// 10. ALERTAS Y KPIs
// ============================================================

exports.getAlertasStock = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { bodega_id } = req.query;
    const bajoStock = await Producto.getProductosConBajoStock(organizacion_id, bodega_id);
    const agotados = await Producto.getProductosAgotados(organizacion_id, bodega_id);
    res.json({ bajoStock, agotados });
  } catch (error) {
    console.error('❌ [getAlertasStock] Error:', error);
    res.status(500).json({ message: 'Error al obtener alertas', error: error.message });
  }
};

exports.getKPIsInventario = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { bodega_id } = req.query;
    const capital = await Producto.getCapitalInmovilizado(organizacion_id, bodega_id);
    const bajoStock = await Producto.getProductosConBajoStock(organizacion_id, bodega_id);
    const agotados = await Producto.getProductosAgotados(organizacion_id, bodega_id);
    const [total] = await pool.query(
      'SELECT COUNT(*) AS total FROM productos WHERE organizacion_id = ? AND activo = 1',
      [organizacion_id]
    );
    res.json({
      capitalInmovilizado: capital,
      productosBajoStock: bajoStock.length,
      productosAgotados: agotados.length,
      totalProductos: total[0]?.total || 0,
    });
  } catch (error) {
    console.error('❌ [getKPIsInventario] Error:', error);
    res.status(500).json({ message: 'Error al obtener KPIs', error: error.message });
  }
};

// ============================================================
// 11. PROYECCIONES
// ============================================================

exports.getProyeccionAgotamiento = async (req, res) => {
  try {
    const { producto_id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { dias_historico = 30 } = req.query;
    const proyeccion = await Producto.getProyeccionAgotamiento(producto_id, organizacion_id, parseInt(dias_historico));
    res.json(proyeccion);
  } catch (error) {
    console.error(' [getProyeccionAgotamiento] Error:', error);
    res.status(500).json({ message: 'Error al obtener proyección', error: error.message });
  }
};

exports.getProyeccionAgotamientoMasiva = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { limit = 5, dias_historico = 30 } = req.query;
    const productos = await Producto.getProyeccionAgotamientoMasiva(organizacion_id, parseInt(limit), parseInt(dias_historico));
    res.json(productos);
  } catch (error) {
    console.error('❌ [getProyeccionAgotamientoMasiva] Error:', error);
    res.status(500).json({ message: 'Error al obtener proyección masiva', error: error.message });
  }
};

// ============================================================
// CATEGORÍAS
// ============================================================

exports.getCategorias = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      'SELECT * FROM categorias WHERE organizacion_id = ? AND activo = 1 ORDER BY nombre',
      [organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ [getCategorias] Error:', error);
    res.status(500).json({ message: 'Error al obtener categorías', error: error.message });
  }
};

exports.createCategoria = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre, descripcion, icono } = req.body;
    const [result] = await pool.query(
      'INSERT INTO categorias (organizacion_id, nombre, descripcion, icono) VALUES (?, ?, ?, ?)',
      [organizacion_id, nombre, descripcion, icono]
    );
    res.status(201).json({ message: 'Categoría creada', id: result.insertId });
  } catch (error) {
    console.error('❌ [createCategoria] Error:', error);
    res.status(500).json({ message: 'Error al crear categoría', error: error.message });
  }
};

exports.updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { nombre, descripcion, icono, activo } = req.body;
    await pool.query(
      'UPDATE categorias SET nombre = ?, descripcion = ?, icono = ?, activo = ? WHERE id = ? AND organizacion_id = ?',
      [nombre, descripcion, icono, activo, id, organizacion_id]
    );
    res.json({ message: 'Categoría actualizada' });
  } catch (error) {
    console.error('❌ [updateCategoria] Error:', error);
    res.status(500).json({ message: 'Error al actualizar categoría', error: error.message });
  }
};

exports.deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await pool.query(
      'UPDATE categorias SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    res.json({ message: 'Categoría desactivada' });
  } catch (error) {
    console.error('❌ [deleteCategoria] Error:', error);
    res.status(500).json({ message: 'Error al eliminar categoría', error: error.message });
  }
};

// ============================================================
// MARCAS
// ============================================================

exports.getMarcas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      'SELECT * FROM marcas WHERE organizacion_id = ? AND activo = 1 ORDER BY nombre',
      [organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ [getMarcas] Error:', error);
    res.status(500).json({ message: 'Error al obtener marcas', error: error.message });
  }
};

exports.createMarca = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre } = req.body;
    const [result] = await pool.query(
      'INSERT INTO marcas (organizacion_id, nombre) VALUES (?, ?)',
      [organizacion_id, nombre]
    );
    res.status(201).json({ message: 'Marca creada', id: result.insertId });
  } catch (error) {
    console.error('❌ [createMarca] Error:', error);
    res.status(500).json({ message: 'Error al crear marca', error: error.message });
  }
};

exports.updateMarca = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { nombre, activo } = req.body;
    await pool.query(
      'UPDATE marcas SET nombre = ?, activo = ? WHERE id = ? AND organizacion_id = ?',
      [nombre, activo, id, organizacion_id]
    );
    res.json({ message: 'Marca actualizada' });
  } catch (error) {
    console.error('❌ [updateMarca] Error:', error);
    res.status(500).json({ message: 'Error al actualizar marca', error: error.message });
  }
};

exports.deleteMarca = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await pool.query(
      'UPDATE marcas SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    res.json({ message: 'Marca desactivada' });
  } catch (error) {
    console.error('❌ [deleteMarca] Error:', error);
    res.status(500).json({ message: 'Error al eliminar marca', error: error.message });
  }
};

// ============================================================
// ETIQUETAS
// ============================================================

exports.getEtiquetas = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      'SELECT * FROM etiquetas WHERE organizacion_id = ? AND activo = 1 ORDER BY nombre',
      [organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ [getEtiquetas] Error:', error);
    res.status(500).json({ message: 'Error al obtener etiquetas', error: error.message });
  }
};

exports.createEtiqueta = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { nombre, color } = req.body;
    const [result] = await pool.query(
      'INSERT INTO etiquetas (organizacion_id, nombre, color) VALUES (?, ?, ?)',
      [organizacion_id, nombre, color || '#6b7280']
    );
    res.status(201).json({ message: 'Etiqueta creada', id: result.insertId });
  } catch (error) {
    console.error('❌ [createEtiqueta] Error:', error);
    res.status(500).json({ message: 'Error al crear etiqueta', error: error.message });
  }
};

exports.updateEtiqueta = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const { nombre, color, activo } = req.body;
    await pool.query(
      'UPDATE etiquetas SET nombre = ?, color = ?, activo = ? WHERE id = ? AND organizacion_id = ?',
      [nombre, color, activo, id, organizacion_id]
    );
    res.json({ message: 'Etiqueta actualizada' });
  } catch (error) {
    console.error('❌ [updateEtiqueta] Error:', error);
    res.status(500).json({ message: 'Error al actualizar etiqueta', error: error.message });
  }
};

exports.deleteEtiqueta = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    await pool.query(
      'UPDATE etiquetas SET activo = 0 WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    res.json({ message: 'Etiqueta desactivada' });
  } catch (error) {
    console.error('❌ [deleteEtiqueta] Error:', error);
    res.status(500).json({ message: 'Error al eliminar etiqueta', error: error.message });
  }
};

// ============================================================
// ASIGNAR ETIQUETAS A PRODUCTOS
// ============================================================

exports.asignarEtiquetaAProducto = async (req, res) => {
  try {
    const { producto_id, etiqueta_id } = req.body;
    const organizacion_id = req.organizacion_id;
    const [producto] = await pool.query(
      'SELECT id FROM productos WHERE id = ? AND organizacion_id = ?',
      [producto_id, organizacion_id]
    );
    if (producto.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    await pool.query(
      'INSERT INTO producto_etiquetas (producto_id, etiqueta_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE etiqueta_id = etiqueta_id',
      [producto_id, etiqueta_id]
    );
    res.json({ message: 'Etiqueta asignada' });
  } catch (error) {
    console.error('❌ [asignarEtiquetaAProducto] Error:', error);
    res.status(500).json({ message: 'Error al asignar etiqueta', error: error.message });
  }
};

exports.eliminarEtiquetaDeProducto = async (req, res) => {
  try {
    const { producto_id, etiqueta_id } = req.body;
    const organizacion_id = req.organizacion_id;
    const [producto] = await pool.query(
      'SELECT id FROM productos WHERE id = ? AND organizacion_id = ?',
      [producto_id, organizacion_id]
    );
    if (producto.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    await pool.query(
      'DELETE FROM producto_etiquetas WHERE producto_id = ? AND etiqueta_id = ?',
      [producto_id, etiqueta_id]
    );
    res.json({ message: 'Etiqueta removida' });
  } catch (error) {
    console.error('❌ [eliminarEtiquetaDeProducto] Error:', error);
    res.status(500).json({ message: 'Error al remover etiqueta', error: error.message });
  }
};

exports.getEtiquetasDeProducto = async (req, res) => {
  try {
    const { producto_id } = req.params;
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT e.* FROM etiquetas e
       JOIN producto_etiquetas pe ON e.id = pe.etiqueta_id
       WHERE pe.producto_id = ? AND e.organizacion_id = ?`,
      [producto_id, organizacion_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ [getEtiquetasDeProducto] Error:', error);
    res.status(500).json({ message: 'Error al obtener etiquetas del producto', error: error.message });
  }
};

// ============================================================
// REPORTE: TOP CAMBIOS DE PRECIO (FILA POR FILA Y 6 MESES)
// ============================================================
exports.getTopCambiosPrecio = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;

    const [rows] = await pool.query(
      `SELECT 
        p.nombre AS producto,
        p.codigo_sku AS sku,
        p.costo_promedio AS costo_actual,
        DATE_FORMAT(ch.created_at, '%Y-%m-%d %H:%i:%s') AS fecha_cambio,
        ch.costo_anterior AS precio_anterior,
        prov.razon_social AS proveedor,
        ch.motivo,
        ch.comentario
      FROM costos_historicos ch
      JOIN productos p ON ch.producto_id = p.id
      LEFT JOIN proveedores prov ON ch.proveedor_id = prov.id
      WHERE p.organizacion_id = ?
        AND p.activo = 1
        AND ch.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      ORDER BY ch.created_at DESC
      LIMIT 30`, 
      [organizacion_id]
    );

    return res.json(rows);

  } catch (error) {
    console.error('❌ [getTopCambiosPrecio] Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        message: 'Error al obtener cambios de precio', 
        error: error.message 
      });
    }
  }
};

exports.getAniosDisponibles = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const [rows] = await pool.query(
      `SELECT DISTINCT YEAR(created_at) AS anio
       FROM movimientos_inventario
       WHERE organizacion_id = ?
       ORDER BY anio DESC`,
      [organizacion_id]
    );
    if (rows.length === 0) {
      return res.json([]);
    }
    res.json(rows.map(r => r.anio));
  } catch (error) {
    console.error('❌ [getAniosDisponibles] Error:', error);
    res.status(500).json({ message: 'Error al obtener años disponibles', error: error.message });
  }
};

exports.exportarMovimientosProducto = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const { fecha_inicio, fecha_fin } = req.query;

    let sql = `
      SELECT 
        p.nombre AS producto,
        p.codigo_sku AS sku,
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Entrada' THEN m.cantidad ELSE 0 END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Salida' THEN m.cantidad ELSE 0 END), 0) AS total_salidas,
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Entrada' THEN m.cantidad ELSE 0 END) - SUM(CASE WHEN m.tipo_movimiento = 'Salida' THEN m.cantidad ELSE 0 END), 0) AS saldo
      FROM movimientos_inventario m
      JOIN productos p ON m.producto_id = p.id
      WHERE m.organizacion_id = ?
    `;
    const params = [organizacion_id];

    // Si vienen ambas fechas válidas, filtra por rango; si no, consulta todo el historial
    if (fecha_inicio && fecha_fin) {
      const dInicio = new Date(fecha_inicio);
      const dFin = new Date(fecha_fin);
      if (isNaN(dInicio) || isNaN(dFin)) {
        return res.status(400).json({ message: 'Fechas inválidas' });
      }
      if (dInicio > dFin) {
        return res.status(400).json({ message: 'La fecha de inicio no puede ser mayor a la fecha final' });
      }
      sql += ` AND m.created_at BETWEEN ? AND ?`;
      params.push(`${fecha_inicio} 00:00:00`, `${fecha_fin} 23:59:59`);
    }

    sql += `
      GROUP BY p.id, p.nombre, p.codigo_sku
      HAVING total_entradas > 0 OR total_salidas > 0
      ORDER BY p.nombre
    `;

    const [rows] = await pool.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay movimientos registrados para mostrar' });
    }

    const headers = ['Producto', 'SKU', 'Total Entradas', 'Total Salidas', 'Saldo'];
    let csv = '\uFEFFsep=;\n' + headers.join(';') + '\n';
    for (const row of rows) {
      csv += `${row.producto};${row.sku || ''};${row.total_entradas};${row.total_salidas};${row.saldo}\n`;
    }

    const sufijoFecha = (fecha_inicio && fecha_fin) ? `_${fecha_inicio}_${fecha_fin}` : '_historico_completo';
    const filename = `movimientos_producto${sufijoFecha}.csv`;
    
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);

  } catch (error) {
    console.error('❌ [exportarMovimientosProducto] Error:', error);
    res.status(500).json({ message: 'Error al exportar', error: error.message });
  }
};

module.exports = exports;