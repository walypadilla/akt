// backend/src/models/DetalleCompra.js
const { pool } = require('../config/db');

class DetalleCompra {
  static async createMany(compra_gasto_id, detalles) {
    if (!detalles || detalles.length === 0) return;
    const values = detalles.map(d => [
      compra_gasto_id,
      d.producto_id,
      d.cantidad,
      d.precio_unitario,
      d.subtotal
    ]);
    const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(',');
    const flatValues = values.flat();
    await pool.query(
      `INSERT INTO detalles_compra (compra_gasto_id, producto_id, cantidad, precio_unitario, subtotal)
       VALUES ${placeholders}`,
      flatValues
    );
  }

  static async findByCompraId(compra_gasto_id) {
    const [rows] = await pool.query(
      `SELECT dc.*, p.nombre AS producto_nombre
       FROM detalles_compra dc
       JOIN productos p ON dc.producto_id = p.id
       WHERE dc.compra_gasto_id = ?`,
      [compra_gasto_id]
    );
    return rows;
  }

  static async deleteByCompraId(compra_gasto_id) {
    await pool.query(
      'DELETE FROM detalles_compra WHERE compra_gasto_id = ?',
      [compra_gasto_id]
    );
  }
}

module.exports = DetalleCompra;