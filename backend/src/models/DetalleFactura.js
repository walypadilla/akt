// backend/src/models/DetalleFactura.js
const { pool } = require('../config/db');

class DetalleFactura {
  static async createMany(factura_id, detalles, connection = null) {
    if (!detalles || detalles.length === 0) return;
    const db = connection || pool;
    const values = detalles.map(d => [
      factura_id,
      d.producto_id,
      d.cantidad,
      d.precio_unitario,
      d.subtotal,
      d.iva || 0
    ]);
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
    const flatValues = values.flat();
    await db.query(
      `INSERT INTO detalles_factura (factura_id, producto_id, cantidad, precio_unitario, subtotal, iva)
       VALUES ${placeholders}`,
      flatValues
    );
  }

  static async findByFacturaId(factura_id) {
    const [rows] = await pool.query(
        `SELECT df.*, p.nombre AS producto_nombre 
        FROM detalles_factura df
        JOIN productos p ON df.producto_id = p.id
        WHERE df.factura_id = ?`,
        [factura_id]
    );
    return rows;
  }
}



module.exports = DetalleFactura;