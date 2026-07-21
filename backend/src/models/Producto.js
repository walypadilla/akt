// backend/src/models/Producto.js
const { pool } = require('../config/db');

class Producto {
  static async findAll(organizacion_id, filters = {}) {
    let sql = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM movimientos_inventario m 
         WHERE m.producto_id = p.id AND m.tipo_movimiento = 'Entrada') AS total_entradas,
        (SELECT COUNT(*) FROM movimientos_inventario m 
         WHERE m.producto_id = p.id AND m.tipo_movimiento = 'Salida') AS total_salidas,
        GROUP_CONCAT(DISTINCT e.nombre) AS etiquetas,
        GROUP_CONCAT(DISTINCT e.color) AS etiquetas_colores,
        c.nombre AS categoria_nombre,
        m.nombre AS marca_nombre
      FROM productos p
      LEFT JOIN producto_etiquetas pe ON p.id = pe.producto_id
      LEFT JOIN etiquetas e ON pe.etiqueta_id = e.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      WHERE p.organizacion_id = ? AND p.activo = 1
    `;
    const params = [organizacion_id];

    if (filters.nombre) {
      sql += ' AND p.nombre LIKE ?';
      params.push(`%${filters.nombre}%`);
    }
    if (filters.codigo_sku) {
      sql += ' AND p.codigo_sku LIKE ?';
      params.push(`%${filters.codigo_sku}%`);
    }
    if (filters.codigo_barras) {
      sql += ' AND p.codigo_barras LIKE ?';
      params.push(`%${filters.codigo_barras}%`);
    }
    if (filters.tipo) {
      sql += ' AND p.tipo = ?';
      params.push(filters.tipo);
    }
    if (filters.categoria_id) {
      sql += ' AND p.categoria_id = ?';
      params.push(filters.categoria_id);
    }
    if (filters.marca_id) {
      sql += ' AND p.marca_id = ?';
      params.push(filters.marca_id);
    }
    if (filters.estado_stock) {
      if (filters.estado_stock === 'agotados') {
        sql += ' AND p.stock_actual <= 0';
      } else if (filters.estado_stock === 'minimo') {
        sql += ' AND p.stock_actual <= p.stock_minimo AND p.stock_actual > 0';
      } else if (filters.estado_stock === 'con_existencias') {
        sql += ' AND p.stock_actual > 0';
      }
    }
    if (filters.es_kit !== undefined) {
      sql += ' AND p.es_kit = ?';
      params.push(filters.es_kit);
    }

    sql += ' GROUP BY p.id ORDER BY p.nombre ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre, m.nombre AS marca_nombre,
        GROUP_CONCAT(DISTINCT e.nombre) AS etiquetas,
        GROUP_CONCAT(DISTINCT e.color) AS etiquetas_colores
       FROM productos p
       LEFT JOIN producto_etiquetas pe ON p.id = pe.producto_id
       LEFT JOIN etiquetas e ON pe.etiqueta_id = e.id
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN marcas m ON p.marca_id = m.id
       WHERE p.id = ? AND p.organizacion_id = ?
       GROUP BY p.id`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      organizacion_id, nombre, descripcion, precio_unitario,
      costo_unitario, stock_actual, stock_minimo, stock_maximo,
      tipo, unidad_medida, codigo_barras, codigo_sku,
      ubicacion, peso, dimensiones, imagen_url,
      categoria_id, marca_id, es_kit = false
    } = data;
    const [result] = await pool.query(
      `INSERT INTO productos 
       (organizacion_id, nombre, descripcion, precio_unitario, costo_unitario,
        stock_actual, stock_minimo, stock_maximo, tipo, unidad_medida,
        codigo_barras, codigo_sku, ubicacion, peso, dimensiones, imagen_url,
        categoria_id, marca_id, es_kit, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [organizacion_id, nombre, descripcion, precio_unitario, costo_unitario,
       stock_actual || 0, stock_minimo || 0, stock_maximo || 0,
       tipo || 'Producto', unidad_medida || 'Unidad',
       codigo_barras, codigo_sku, ubicacion, peso, dimensiones, imagen_url,
       categoria_id, marca_id, es_kit]
    );
    return result.insertId;
  }

  static async update(id, organizacion_id, data) {
    const {
      nombre, descripcion, precio_unitario, costo_unitario,
      stock_actual, stock_minimo, stock_maximo, tipo, unidad_medida,
      codigo_barras, codigo_sku, ubicacion, peso, dimensiones, imagen_url,
      categoria_id, marca_id, es_kit, activo
    } = data;
    const [result] = await pool.query(
      `UPDATE productos SET
        nombre = ?, descripcion = ?, precio_unitario = ?, costo_unitario = ?,
        stock_actual = ?, stock_minimo = ?, stock_maximo = ?,
        tipo = ?, unidad_medida = ?, codigo_barras = ?, codigo_sku = ?,
        ubicacion = ?, peso = ?, dimensiones = ?, imagen_url = ?,
        categoria_id = ?, marca_id = ?, es_kit = ?, activo = ?
       WHERE id = ? AND organizacion_id = ?`,
      [nombre, descripcion, precio_unitario, costo_unitario,
       stock_actual, stock_minimo, stock_maximo,
       tipo, unidad_medida, codigo_barras, codigo_sku,
       ubicacion, peso, dimensiones, imagen_url,
       categoria_id, marca_id, es_kit, activo,
       id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, organizacion_id) {
    const [result] = await pool.query(
      'DELETE FROM productos WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  static async incrementStock(producto_id, organizacion_id, cantidad) {
    await pool.query(
      'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ? AND organizacion_id = ?',
      [cantidad, producto_id, organizacion_id]
    );
  }

  static async decrementStock(producto_id, organizacion_id, cantidad) {
    await pool.query(
      'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ? AND organizacion_id = ? AND stock_actual >= ?',
      [cantidad, producto_id, organizacion_id, cantidad]
    );
  }

  static async getProductosConBajoStock(organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM productos WHERE organizacion_id = ? AND stock_actual <= stock_minimo AND stock_actual > 0',
      [organizacion_id]
    );
    return rows;
  }

  static async getProductosAgotados(organizacion_id) {
    const [rows] = await pool.query(
      'SELECT * FROM productos WHERE organizacion_id = ? AND stock_actual <= 0',
      [organizacion_id]
    );
    return rows;
  }

  // ============================================================
  // MÉTODOS PARA DASHBOARD DE INVENTARIO
  // ============================================================

  static async getCapitalInmovilizado(organizacion_id, bodega_id = null) {
    let sql = `
      SELECT SUM(p.stock_actual * p.costo_promedio) AS total_capital
      FROM productos p
      WHERE p.organizacion_id = ? AND p.activo = 1
    `;
    const params = [organizacion_id];
    if (bodega_id) {
      sql += ` AND p.id IN (SELECT producto_id FROM producto_bodega WHERE bodega_id = ?)`;
      params.push(bodega_id);
    }
    const [rows] = await pool.query(sql, params);
    return parseFloat(rows[0]?.total_capital) || 0;
  }

  static async getProductosConBajoStock(organizacion_id, bodega_id = null) {
    let sql = `
      SELECT p.*, pb.stock_actual AS stock_bodega
      FROM productos p
      LEFT JOIN producto_bodega pb ON p.id = pb.producto_id
      WHERE p.organizacion_id = ? AND p.activo = 1
        AND (p.stock_actual <= p.stock_minimo OR pb.stock_actual <= pb.stock_minimo)
    `;
    const params = [organizacion_id];
    if (bodega_id) {
      sql += ` AND pb.bodega_id = ?`;
      params.push(bodega_id);
    }
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getProductosAgotados(organizacion_id, bodega_id = null) {
    let sql = `
      SELECT p.*, pb.stock_actual AS stock_bodega
      FROM productos p
      LEFT JOIN producto_bodega pb ON p.id = pb.producto_id
      WHERE p.organizacion_id = ? AND p.activo = 1
        AND (p.stock_actual <= 0 OR pb.stock_actual <= 0)
    `;
    const params = [organizacion_id];
    if (bodega_id) {
      sql += ` AND pb.bodega_id = ?`;
      params.push(bodega_id);
    }
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getProyeccionAgotamiento(producto_id, organizacion_id, dias_historico = 30) {
    // Obtener ventas promedio diarias de los últimos N días
    const [ventas] = await pool.query(
      `SELECT 
        COALESCE(SUM(cantidad) / ?, 0) AS promedio_diario
       FROM detalles_factura df
       JOIN facturas f ON df.factura_id = f.id
       WHERE df.producto_id = ? 
         AND f.organizacion_id = ?
         AND f.estado = 'Pagada'
         AND f.creado_en >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)`,
      [dias_historico, producto_id, organizacion_id, dias_historico]
    );
    const promedioDiario = parseFloat(ventas[0]?.promedio_diario) || 0;

    // Obtener stock actual
    const [producto] = await pool.query(
      'SELECT stock_actual FROM productos WHERE id = ? AND organizacion_id = ?',
      [producto_id, organizacion_id]
    );
    const stockActual = parseFloat(producto[0]?.stock_actual) || 0;

    if (promedioDiario === 0) {
      return { dias: Infinity, mensaje: 'Sin ventas recientes' };
    }

    const dias = Math.floor(stockActual / promedioDiario);
    return { dias, promedio_diario: promedioDiario, stock_actual: stockActual };
  }

  static async getPareto(organizacion_id, bodega_id = null, limit = 10) {
    let sql = `
      SELECT 
        p.id,
        p.nombre,
        p.precio_unitario,
        p.costo_promedio,
        COALESCE(SUM(df.cantidad * df.precio_unitario), 0) AS total_ingresos,
        COALESCE(SUM(df.cantidad), 0) AS total_unidades_vendidas,
        (p.precio_unitario - p.costo_promedio) AS margen_unitario,
        ((p.precio_unitario - p.costo_promedio) / p.precio_unitario * 100) AS margen_porcentaje
      FROM productos p
      LEFT JOIN detalles_factura df ON p.id = df.producto_id
      LEFT JOIN facturas f ON df.factura_id = f.id
      WHERE p.organizacion_id = ? AND p.activo = 1
        AND f.estado = 'Pagada'
        AND f.eliminado_en IS NULL
    `;
    const params = [organizacion_id];
    if (bodega_id) {
      sql += ` AND f.bodega_id = ?`;
      params.push(bodega_id);
    }
    sql += `
      GROUP BY p.id, p.nombre, p.precio_unitario, p.costo_promedio
      ORDER BY total_ingresos DESC
      LIMIT ?
    `;
    params.push(limit);
    const [rows] = await pool.query(sql, params);

    // Calcular porcentaje acumulado para Pareto
    const totalIngresos = rows.reduce((acc, r) => acc + parseFloat(r.total_ingresos), 0);
    let acumulado = 0;
    return rows.map(r => {
      const ingresos = parseFloat(r.total_ingresos);
      acumulado += ingresos;
      return {
        ...r,
        total_ingresos: ingresos,
        porcentaje: totalIngresos > 0 ? (ingresos / totalIngresos) * 100 : 0,
        porcentaje_acumulado: totalIngresos > 0 ? (acumulado / totalIngresos) * 100 : 0,
      };
    });
  }

  static async getProyeccionAgotamientoMasiva(organizacion_id, limit = 5) {
  // Obtener productos con stock y ventas promedio
    const [rows] = await pool.query(`
      SELECT p.id, p.nombre, p.stock_actual,
        COALESCE(SUM(df.cantidad) / 30, 0) AS promedio_diario
      FROM productos p
      LEFT JOIN detalles_factura df ON p.id = df.producto_id
      LEFT JOIN facturas f ON df.factura_id = f.id
      WHERE p.organizacion_id = ? AND p.activo = 1
        AND f.estado = 'Pagada'
        AND f.creado_en >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY p.id, p.nombre, p.stock_actual
      HAVING promedio_diario > 0
      ORDER BY (p.stock_actual / promedio_diario) ASC
      LIMIT ?
    `, [organizacion_id, limit]);

    return rows.map(r => ({
      ...r,
      dias: r.promedio_diario > 0 ? Math.floor(r.stock_actual / r.promedio_diario) : Infinity,
    }));
  }

  static async getProyeccionAgotamientoMasiva(organizacion_id, limit = 5, dias_historico = 30) {
    const [rows] = await pool.query(`
      SELECT p.id, p.nombre, p.stock_actual,
        COALESCE(SUM(df.cantidad) / ?, 0) AS promedio_diario
      FROM productos p
      LEFT JOIN detalles_factura df ON p.id = df.producto_id
      LEFT JOIN facturas f ON df.factura_id = f.id
      WHERE p.organizacion_id = ? AND p.activo = 1
        AND (f.estado = 'Pagada' OR f.estado IS NULL)
        AND f.creado_en >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
      GROUP BY p.id, p.nombre, p.stock_actual
      HAVING promedio_diario > 0
      ORDER BY (p.stock_actual / promedio_diario) ASC
      LIMIT ?
    `, [dias_historico, organizacion_id, dias_historico, limit]);

    return rows.map(r => ({
      id: r.id,
      nombre: r.nombre,
      stock_actual: r.stock_actual,
      promedio_diario: parseFloat(r.promedio_diario),
      dias: r.promedio_diario > 0 ? Math.floor(r.stock_actual / r.promedio_diario) : Infinity,
    }));
  }

} 

module.exports = Producto;