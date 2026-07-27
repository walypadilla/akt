// backend/src/models/Compra.js
const { pool } = require('../config/db');

class Compra {
  // ============================================================
  // OBTENER TODAS LAS COMPRAS CON FILTROS Y PAGINACIÓN
  // ============================================================
  static async findAll(organizacion_id, filters = {}, page = 1, limit = 10) {
    let sql = `
      SELECT cg.*, 
             p.razon_social AS proveedor_nombre,
             p.numero_documento AS proveedor_nit
      FROM compras_gastos cg
      LEFT JOIN proveedores p ON cg.proveedor_id = p.id
      WHERE cg.organizacion_id = ?
    `;
    const params = [organizacion_id];

    if (filters.search) {
      sql += ` AND (cg.numero_comprobante LIKE ? OR p.razon_social LIKE ? OR p.numero_documento LIKE ?)`;
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    if (filters.mes) {
      sql += ' AND MONTH(cg.fecha_registro) = ?';
      params.push(parseInt(filters.mes));
    }
    if (filters.anio) {
      sql += ' AND YEAR(cg.fecha_registro) = ?';
      params.push(parseInt(filters.anio));
    }
    if (filters.proveedor_id) {
      sql += ' AND cg.proveedor_id = ?';
      params.push(parseInt(filters.proveedor_id));
    }
    if (filters.estado_comprobante) {
      sql += ' AND cg.estado_comprobante = ?';
      params.push(filters.estado_comprobante);
    }
    if (filters.tipo_documento) {
      sql += ' AND cg.tipo_documento = ?';
      params.push(filters.tipo_documento);
    }
    if (filters.tipo_egreso) {
      sql += ' AND cg.tipo_egreso = ?';
      params.push(filters.tipo_egreso);
    }
    if (filters.condicion_operacion) {
      sql += ' AND cg.condicion_operacion = ?';
      params.push(filters.condicion_operacion);
    }
    if (filters.solo_con_vencimiento) {
      sql += ' AND cg.fecha_vencimiento IS NOT NULL';
    }

    sql += ' ORDER BY cg.fecha_registro DESC, cg.id DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(sql, params);

    let countSql = `
      SELECT COUNT(*) AS total
      FROM compras_gastos cg
      LEFT JOIN proveedores p ON cg.proveedor_id = p.id
      WHERE cg.organizacion_id = ?
    `;
    const countParams = [organizacion_id];
    if (filters.search) {
      countSql += ` AND (cg.numero_comprobante LIKE ? OR p.razon_social LIKE ? OR p.numero_documento LIKE ?)`;
      countParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.mes) {
      countSql += ' AND MONTH(cg.fecha_registro) = ?';
      countParams.push(parseInt(filters.mes));
    }
    if (filters.anio) {
      countSql += ' AND YEAR(cg.fecha_registro) = ?';
      countParams.push(parseInt(filters.anio));
    }
    if (filters.proveedor_id) {
      countSql += ' AND cg.proveedor_id = ?';
      countParams.push(parseInt(filters.proveedor_id));
    }
    if (filters.estado_comprobante) {
      countSql += ' AND cg.estado_comprobante = ?';
      countParams.push(filters.estado_comprobante);
    }
    if (filters.tipo_documento) {
      countSql += ' AND cg.tipo_documento = ?';
      countParams.push(filters.tipo_documento);
    }
    if (filters.tipo_egreso) {
      countSql += ' AND cg.tipo_egreso = ?';
      countParams.push(filters.tipo_egreso);
    }
    if (filters.condicion_operacion) {
      countSql += ' AND cg.condicion_operacion = ?';
      countParams.push(filters.condicion_operacion);
    }

    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return {
      compras: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  }


  // ============================================================
  // OBTENER UNA COMPRA POR ID
  // ============================================================
  static async findById(id, organizacion_id) {
    const [rows] = await pool.query(
      `SELECT cg.*, p.razon_social AS proveedor_nombre, p.numero_documento AS proveedor_nit
       FROM compras_gastos cg
       LEFT JOIN proveedores p ON cg.proveedor_id = p.id
       WHERE cg.id = ? AND cg.organizacion_id = ?`,
      [id, organizacion_id]
    );
    return rows[0];
  }

  // ============================================================
  // CREAR COMPRA
  // ============================================================
  static async create(data) {
    const {
      organizacion_id,
      proveedor_id,
      proveedor_nombre,
      tipo_documento,
      numero_comprobante,
      uuid_dte,
      numero_control,
      tipo_egreso,
      descripcion,
      monto_subtotal,
      iva_credito_fiscal,
      total,
      url_comprobante_foto,
      fecha_registro,
      tipo_comprobante,
      estado_comprobante,
      condicion_operacion,
      fecha_vencimiento,
      retencion_iva,
      percepcion_iva,
      es_importacion,
    } = data;

    const [result] = await pool.query(
      `INSERT INTO compras_gastos 
       (organizacion_id, proveedor_id, proveedor_nombre, tipo_documento,
        numero_comprobante, uuid_dte, numero_control, tipo_egreso, descripcion,
        monto_subtotal, iva_credito_fiscal, total, url_comprobante_foto,
        fecha_registro, tipo_comprobante, estado_comprobante, condicion_operacion,
        fecha_vencimiento, retencion_iva, percepcion_iva, es_importacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizacion_id,
        proveedor_id || null,
        proveedor_nombre || 'Proveedor sin nombre',
        tipo_documento || 'Credito_Fiscal',
        numero_comprobante,
        uuid_dte || null,
        numero_control || null,
        tipo_egreso || 'Compra',
        descripcion || null,
        monto_subtotal || 0,
        iva_credito_fiscal || 0,
        total || 0,
        url_comprobante_foto || null,
        fecha_registro,
        tipo_comprobante || 'Factura',
        estado_comprobante || 'Pendiente',
        condicion_operacion || 'Contado',
        fecha_vencimiento || null,
        retencion_iva || 0,
        percepcion_iva || 0,
        es_importacion ? 1 : 0,
      ]
    );
    return result.insertId;
  }

  // ============================================================
  // ACTUALIZAR COMPRA
  // ============================================================
  static async update(id, organizacion_id, data) {
    const {
      proveedor_id,
      proveedor_nombre,
      tipo_documento,
      numero_comprobante,
      uuid_dte,
      numero_control,
      tipo_egreso,
      descripcion,
      monto_subtotal,
      iva_credito_fiscal,
      total,
      url_comprobante_foto,
      fecha_registro,
      tipo_comprobante,
      estado_comprobante,
      condicion_operacion,
      fecha_vencimiento,
      retencion_iva,
      percepcion_iva,
      es_importacion,
    } = data;

    const [result] = await pool.query(
      `UPDATE compras_gastos SET
        proveedor_id = ?,
        proveedor_nombre = ?,
        tipo_documento = ?,
        numero_comprobante = ?,
        uuid_dte = ?,
        numero_control = ?,
        tipo_egreso = ?,
        descripcion = ?,
        monto_subtotal = ?,
        iva_credito_fiscal = ?,
        total = ?,
        url_comprobante_foto = ?,
        fecha_registro = ?,
        tipo_comprobante = ?,
        estado_comprobante = ?,
        condicion_operacion = ?,
        fecha_vencimiento = ?,
        retencion_iva = ?,
        percepcion_iva = ?,
        es_importacion = ?
       WHERE id = ? AND organizacion_id = ?`,
      [
        proveedor_id || null,
        proveedor_nombre,
        tipo_documento,
        numero_comprobante,
        uuid_dte || null,
        numero_control || null,
        tipo_egreso,
        descripcion || null,
        monto_subtotal,
        iva_credito_fiscal || 0,
        total,
        url_comprobante_foto || null,
        fecha_registro,
        tipo_comprobante,
        estado_comprobante,
        condicion_operacion,
        fecha_vencimiento || null,
        retencion_iva || 0,
        percepcion_iva || 0,
        es_importacion ? 1 : 0,
        id,
        organizacion_id,
      ]
    );
    return result.affectedRows > 0;
  }


  // ============================================================
  // CANCELAR COMPRA
  // ============================================================
  static async cancel(id, organizacion_id) {
    const [result] = await pool.query(
      'UPDATE compras_gastos SET estado_comprobante = "Cancelado" WHERE id = ? AND organizacion_id = ?',
      [id, organizacion_id]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // KPIs
  // ============================================================
  static async getKPIs(organizacion_id, mes, anio) {
    const [egresos] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );

    const [cuentas] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND estado_comprobante = 'Pendiente' AND condicion_operacion = 'Credito'`,
      [organizacion_id]
    );

    const [iva] = await pool.query(
      `SELECT COALESCE(SUM(iva_credito_fiscal), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND tipo_documento = 'Credito_Fiscal' AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );

    const [compras] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND tipo_egreso = 'Compra' AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );

    const [gastos] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND tipo_egreso = 'Gasto_Operativo' AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?`,
      [organizacion_id, mes, anio]
    );

    return {
      total_egresos: parseFloat(egresos[0]?.total || 0),
      cuentas_por_pagar: parseFloat(cuentas[0]?.total || 0),
      iva_credito_fiscal: parseFloat(iva[0]?.total || 0),
      total_compras: parseFloat(compras[0]?.total || 0),
      total_gastos: parseFloat(gastos[0]?.total || 0),
    };
  }


  // ============================================================
  // EVOLUCIÓN DE GASTOS POR MES
  // ============================================================
  static async getEvolucionGastos(organizacion_id, anio) {
    const [rows] = await pool.query(
      `SELECT 
         MONTH(fecha_registro) AS mes,
         COALESCE(SUM(CASE WHEN tipo_egreso = 'Compra' THEN total ELSE 0 END), 0) AS compras,
         COALESCE(SUM(CASE WHEN tipo_egreso = 'Gasto_Operativo' THEN total ELSE 0 END), 0) AS gastos,
         COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND estado_comprobante != 'Cancelado'
         AND YEAR(fecha_registro) = ?
       GROUP BY MONTH(fecha_registro)
       ORDER BY mes ASC`,
      [organizacion_id, anio]
    );

    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      compras: 0,
      gastos: 0,
      total: 0,
    }));
    for (const row of rows) {
      const idx = meses.findIndex(m => m.mes === row.mes);
      if (idx !== -1) {
        meses[idx].compras = parseFloat(row.compras);
        meses[idx].gastos = parseFloat(row.gastos);
        meses[idx].total = parseFloat(row.total);
      }
    }
    return meses;
  }

  // ============================================================
  // DISTRIBUCIÓN DE EGRESOS
  // ============================================================
  static async getDistribucionEgresos(organizacion_id, mes, anio) {
    const [rows] = await pool.query(
      `SELECT 
         tipo_egreso,
         COALESCE(SUM(total), 0) AS total
       FROM compras_gastos
       WHERE organizacion_id = ? AND estado_comprobante != 'Cancelado'
         AND MONTH(fecha_registro) = ? AND YEAR(fecha_registro) = ?
       GROUP BY tipo_egreso`,
      [organizacion_id, mes, anio]
    );

    const totalCompras = rows.find(r => r.tipo_egreso === 'Compra')?.total || 0;
    const totalGastos = rows.find(r => r.tipo_egreso === 'Gasto_Operativo')?.total || 0;
    return [
      { name: 'Compras', value: parseFloat(totalCompras) },
      { name: 'Gastos Operativos', value: parseFloat(totalGastos) },
    ];
  }

  // ============================================================
  // ALERTAS DE VENCIMIENTO
  // ============================================================
  static async getAlertasVencimiento(organizacion_id) {
    const [rows] = await pool.query(
      `SELECT cg.id, cg.numero_comprobante, cg.total, cg.fecha_vencimiento,
              p.razon_social AS proveedor_nombre
       FROM compras_gastos cg
       LEFT JOIN proveedores p ON cg.proveedor_id = p.id
       WHERE cg.organizacion_id = ?
         AND cg.estado_comprobante = 'Pendiente'
         AND cg.condicion_operacion = 'Credito'
         AND cg.fecha_vencimiento IS NOT NULL
         AND cg.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 5 DAY)
       ORDER BY cg.fecha_vencimiento ASC
       LIMIT 20`,
      [organizacion_id]
    );
    return rows;
  }

  // ============================================================
  // TOP 5 PROVEEDORES
  // ============================================================
  static async getTopProveedores(organizacion_id, anio) {
    const [rows] = await pool.query(
      `SELECT 
         p.id AS proveedor_id,
         p.razon_social,
         p.numero_documento,
         COALESCE(SUM(cg.total), 0) AS total_compras
       FROM proveedores p
       JOIN compras_gastos cg ON p.id = cg.proveedor_id
       WHERE cg.organizacion_id = ?
         AND cg.estado_comprobante != 'Cancelado'
         AND YEAR(cg.fecha_registro) = ?
       GROUP BY p.id, p.razon_social, p.numero_documento
       ORDER BY total_compras DESC
       LIMIT 5`,
      [organizacion_id, anio]
    );
    return rows;
  }

}

module.exports = Compra;