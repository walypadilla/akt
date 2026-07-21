// backend/src/controllers/inventoryController.js
const Producto = require('../models/Producto');
const Warehouse = require('../models/Warehouse');
const InventoryMovement = require('../models/InventoryMovement');
const { pool } = require('../config/db');

// ============================================================
// FUNCIONES AUXILIARES (reutilizables)
// ============================================================

/**
 * Obtiene productos con filtros y paginación (usado internamente)
 */
async function getProductosConFiltros(organizacion_id, filters = {}) {
  const {
    search = '',
    tipo = '',
    estado_stock = '',
    bodega_id = '',
    categoria_id = '',
    marca_id = '',
    etiqueta_id = '',
    page = 1,
    limit = 20,
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
    WHERE p.organizacion_id = ? AND p.activo = 1
  `;
  const params = [organizacion_id];

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

  // Contar total
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

    // 1. Capital inmovilizado
    const [capitalResult] = await pool.query(
      `SELECT COALESCE(SUM(stock_actual * costo_promedio), 0) AS total
       FROM productos
       WHERE organizacion_id = ? AND activo = 1`,
      [organizacion_id]
    );
    const capitalInmovilizado = parseFloat(capitalResult[0]?.total) || 0;

    // 2. Alertas de stock
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

    // 3. Total de productos activos
    const [totalProductos] = await pool.query(
      'SELECT COUNT(*) AS total FROM productos WHERE organizacion_id = ? AND activo = 1',
      [organizacion_id]
    );

    // 4. Movimientos del periodo
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
        fechaFin = new Date(anioSeleccionado, 11, 31);
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

    // 5. Datos para gráficas
    let datosMensuales = [];
    let datosDiarios = [];

    if (periodo === 'mes') {
      const [movDiarios] = await pool.query(
        `SELECT DAY(created_at) AS dia,
                SUM(CASE WHEN tipo_movimiento = 'Entrada' THEN cantidad ELSE 0 END) AS entradas,
                SUM(CASE WHEN tipo_movimiento = 'Salida' THEN cantidad ELSE 0 END) AS salidas
         FROM movimientos_inventario
         WHERE organizacion_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY dia
         ORDER BY dia ASC`,
        [organizacion_id, fechaInicio, fechaFin]
      );
      datosDiarios = movDiarios;
    } else {
      const [movMensuales] = await pool.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes,
                SUM(CASE WHEN tipo_movimiento = 'Entrada' THEN cantidad ELSE 0 END) AS entradas,
                SUM(CASE WHEN tipo_movimiento = 'Salida' THEN cantidad ELSE 0 END) AS salidas
         FROM movimientos_inventario
         WHERE organizacion_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY mes
         ORDER BY mes ASC`,
        [organizacion_id, fechaInicio, fechaFin]
      );
      datosMensuales = movMensuales;
    }

    // 6. Top 5 productos por rotación
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
      [organizacion_id, fechaInicio]
    );

    // 7. Movimientos recientes
    const [movimientosRecientes] = await pool.query(
      `SELECT m.*, p.nombre AS producto_nombre, b.nombre AS bodega_nombre
       FROM movimientos_inventario m
       JOIN productos p ON m.producto_id = p.id
       LEFT JOIN bodegas b ON m.bodega_id = b.id
       WHERE m.organizacion_id = ?
       ORDER BY m.created_at DESC
       LIMIT 20`,
      [organizacion_id]
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
      datosMensuales,
      datosDiarios,
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
    const { search, tipo, estado_stock, bodega_id, categoria_id, marca_id, etiqueta_id, page = 1, limit = 20 } = req.query;
    const result = await getProductosConFiltros(organizacion_id, { search, tipo, estado_stock, bodega_id, categoria_id, marca_id, etiqueta_id, page, limit });
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
    const usuario_id = req.usuario_id;
    const { producto_id, bodega_id, tipo_ajuste, cantidad, motivo, descripcion } = req.body;

    if (!producto_id || !tipo_ajuste || !cantidad || cantidad <= 0 || !motivo) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const [producto] = await connection.query(
      'SELECT stock_actual, costo_promedio FROM productos WHERE id = ? AND organizacion_id = ?',
      [producto_id, organizacion_id]
    );
    if (producto.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const stockAnterior = parseFloat(producto[0].stock_actual);
    const costoUnitario = parseFloat(producto[0].costo_promedio);
    let stockNuevo = stockAnterior;

    if (tipo_ajuste === 'Entrada') {
      stockNuevo += parseFloat(cantidad);
    } else if (tipo_ajuste === 'Salida') {
      if (stockAnterior < cantidad) {
        await connection.rollback();
        return res.status(400).json({ message: 'Stock insuficiente para realizar el ajuste' });
      }
      stockNuevo -= parseFloat(cantidad);
    } else {
      await connection.rollback();
      return res.status(400).json({ message: 'Tipo de ajuste inválido' });
    }

    await connection.query(
      'UPDATE productos SET stock_actual = ? WHERE id = ? AND organizacion_id = ?',
      [stockNuevo, producto_id, organizacion_id]
    );

    await connection.query(
      `INSERT INTO ajustes_inventario 
       (organizacion_id, producto_id, bodega_id, tipo_ajuste, cantidad, motivo, descripcion, costo_unitario, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, producto_id, bodega_id || null, tipo_ajuste, cantidad, motivo, descripcion || '', costoUnitario, usuario_id]
    );

    await connection.query(
      `INSERT INTO movimientos_inventario 
       (organizacion_id, producto_id, bodega_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
        referencia_tipo, referencia_id, costo_unitario, observacion, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizacion_id, producto_id, bodega_id || null, 'Ajuste', cantidad, stockAnterior, stockNuevo,
       'Ajuste', 0, costoUnitario, descripcion || '', usuario_id]
    );

    await connection.commit();
    res.status(201).json({ message: 'Ajuste de inventario realizado', stock_nuevo: stockNuevo });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [createAjuste] Error:', error);
    res.status(500).json({ message: 'Error al crear ajuste', error: error.message });
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

    // Validar fechas para kardex
    if (tipo === 'kardex') {
      if (!producto_id) {
        return res.status(400).json({ message: 'producto_id es obligatorio para Kardex' });
      }
      let inicio = fecha_inicio || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0];
      let fin = fecha_fin || new Date().toISOString().split('T')[0];
      if (new Date(inicio) > new Date(fin)) {
        return res.status(400).json({ message: 'La fecha de inicio no puede ser mayor a la fecha final' });
      }
      const movimientos = await InventoryMovement.getKardex(
        producto_id,
        organizacion_id,
        `${inicio} 00:00:00`,
        `${fin} 23:59:59`
      );
      let saldo = 0;
      data = movimientos.map(m => {
        if (m.tipo_movimiento === 'Entrada') saldo += parseFloat(m.cantidad);
        else saldo -= parseFloat(m.cantidad);
        return {
          Fecha: m.created_at,
          Documento: m.referencia_tipo,
          Tipo: m.tipo_movimiento,
          Cantidad: m.cantidad,
          Saldo: saldo,
          Bodega: m.bodega_nombre || 'N/A',
        };
      });
      filename = `kardex_${producto_id}.csv`;
    } else {
      // Construir filtros base para los otros reportes
      let sql = `
        SELECT p.id, p.nombre, p.stock_actual, p.costo_promedio, p.precio_unitario,
               p.codigo_sku, p.ubicacion,
               c.nombre AS categoria_nombre,
               mar.nombre AS marca_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN marcas mar ON p.marca_id = mar.id
        WHERE p.organizacion_id = ? AND p.activo = 1
      `;
      const params = [organizacion_id];

      // Aplicar filtros
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

      switch (tipo) {
        case 'rentabilidad':
          sql += ' ORDER BY (p.precio_unitario - p.costo_promedio) DESC';
          const [rowsRent] = await pool.query(sql, params);
          data = rowsRent.map(r => ({
            Producto: r.nombre,
            SKU: r.codigo_sku,
            'Precio Venta': r.precio_unitario,
            'Costo Promedio': r.costo_promedio,
            'Margen $': parseFloat(r.precio_unitario) - parseFloat(r.costo_promedio),
            'Margen %': parseFloat(r.precio_unitario) > 0
              ? ((parseFloat(r.precio_unitario) - parseFloat(r.costo_promedio)) / parseFloat(r.precio_unitario) * 100).toFixed(2)
              : 0,
          }));
          filename = 'rentabilidad_productos.csv';
          break;

        case 'toma-fisica':
          sql += ' AND p.tipo = "Producto" ORDER BY p.nombre ASC';
          const [rowsFisica] = await pool.query(sql, params);
          data = rowsFisica.map(r => ({
            'Código SKU': r.codigo_sku,
            Producto: r.nombre,
            Ubicación: r.ubicacion || '',
            'Stock Sistema': r.stock_actual,
            'Stock Físico': '',
          }));
          filename = 'toma_fisica.csv';
          break;

        case 'lento-movimiento':
          const diasFiltro = parseInt(dias) || 90;
          sql += ` AND p.id NOT IN (
            SELECT DISTINCT df.producto_id FROM detalles_factura df
            JOIN facturas f ON df.factura_id = f.id
            WHERE f.estado = 'Pagada' AND f.creado_en >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
          )`;
          params.push(diasFiltro);
          sql += ' ORDER BY p.nombre ASC';
          const [rowsLento] = await pool.query(sql, params);
          data = rowsLento.map(r => ({
            Producto: r.nombre,
            SKU: r.codigo_sku,
            Stock: r.stock_actual,
            'Costo Unitario': r.costo_promedio,
            'Valor Stock': (parseFloat(r.stock_actual) * parseFloat(r.costo_promedio)).toFixed(2),
          }));
          filename = `lento_movimiento_${diasFiltro}dias.csv`;
          break;

        case 'valoracion':
          sql += ' AND p.stock_actual > 0 ORDER BY (p.stock_actual * p.costo_promedio) DESC';
          const [rowsVal] = await pool.query(sql, params);
          data = rowsVal.map(r => ({
            Producto: r.nombre,
            SKU: r.codigo_sku,
            Stock: r.stock_actual,
            'Costo Promedio': r.costo_promedio,
            'Valor Total': (parseFloat(r.stock_actual) * parseFloat(r.costo_promedio)).toFixed(2),
          }));
          filename = 'valoracion_inventario.csv';
          break;

        default:
          return res.status(400).json({ message: 'Tipo de reporte inválido' });
      }
    }

    if (data.length === 0) {
      return res.status(404).json({ message: 'No hay datos para exportar' });
    }

    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    for (const row of data) {
      csv += headers.map(h => `"${row[h] || ''}"`).join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ [exportarReporte] Error:', error);
    res.status(500).json({ message: 'Error al exportar reporte', error: error.message });
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
// 8. COSTOS HISTÓRICOS
// ============================================================

exports.registrarCostoHistorico = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id;
    const usuario_id = req.usuario_id;
    const { producto_id, proveedor_id, costo_nuevo, motivo } = req.body;

    if (!producto_id || !costo_nuevo || costo_nuevo <= 0) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const [producto] = await pool.query(
      'SELECT costo_promedio FROM productos WHERE id = ? AND organizacion_id = ?',
      [producto_id, organizacion_id]
    );
    if (producto.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const costoAnterior = parseFloat(producto[0].costo_promedio);
    const costoNuevo = parseFloat(costo_nuevo);

    if (costoAnterior === costoNuevo) {
      return res.status(400).json({ message: 'El nuevo costo es igual al actual' });
    }

    await pool.query(
      'UPDATE productos SET costo_promedio = ? WHERE id = ? AND organizacion_id = ?',
      [costoNuevo, producto_id, organizacion_id]
    );

    await pool.query(
      `INSERT INTO costos_historicos 
       (producto_id, proveedor_id, costo_anterior, costo_nuevo, motivo, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [producto_id, proveedor_id || null, costoAnterior, costoNuevo, motivo || '', usuario_id]
    );

    res.json({
      message: 'Costo actualizado correctamente',
      costo_anterior: costoAnterior,
      costo_nuevo: costoNuevo,
    });
  } catch (error) {
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
    // Verificar que el producto pertenezca a la organización
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

module.exports = exports;