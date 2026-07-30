// backend/src/controllers/productoController.js
const Producto = require('../models/Producto');

exports.obtenerProductos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id || 1;
    const {
      search,
      tipo,
      estado_stock,
      categoria_id,
      marca_id,
      es_kit,
      incluir_desactivados,
      page = 1,
      limit = 12,
    } = req.query;

    const result = await Producto.findAll(organizacion_id, {
      search,
      tipo,
      estado_stock,
      categoria_id,
      marca_id,
      es_kit,
      incluir_desactivados: incluir_desactivados === 'true',
      page,
      limit,
    });

    res.json({
      productos: result.productos || [],
      paginacion: {
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 12,
        totalPages: result.totalPages || 0,
      },
    });
  } catch (error) {
    console.error('❌ [obtenerProductos] Error:', error);
    res.status(500).json({
      productos: [],
      paginacion: { total: 0, page: 1, limit: 12, totalPages: 0 },
      message: 'Error al obtener productos',
      error: error.message,
    });
  }
};

exports.crearProducto = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id || 1;
    const data = { ...req.body, organizacion_id };
    const id = await Producto.create(data);
    res.status(201).json({ message: 'Producto creado', id });
  } catch (error) {
    console.error('❌ [crearProducto] Error:', error);
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id || 1;
    const data = req.body;
    const updated = await Producto.update(id, organizacion_id, data);
    if (!updated) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    console.error('❌ [actualizarProducto] Error:', error);
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id || 1;
    const deleted = await Producto.delete(id, organizacion_id);
    if (!deleted) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto desactivado' });
  } catch (error) {
    console.error('❌ [eliminarProducto] Error:', error);
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
};

// Método para incrementar stock (usado en compras o devoluciones)
exports.incrementStock = async (req, res) => {
  try {
    const { producto_id, cantidad } = req.body;
    const organizacion_id = req.organizacion_id || 1;
    await Producto.incrementStock(producto_id, organizacion_id, cantidad);
    res.json({ message: 'Stock incrementado' });
  } catch (error) {
    console.error('❌ [incrementStock] Error:', error);
    res.status(500).json({ message: 'Error al incrementar stock', error: error.message });
  }
};

// Método para decrementar stock (usado en ventas o ajustes)
exports.decrementStock = async (req, res) => {
  try {
    const { producto_id, cantidad } = req.body;
    const organizacion_id = req.organizacion_id || 1;
    await Producto.decrementStock(producto_id, organizacion_id, cantidad, connection);
    res.json({ message: 'Stock decrementado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al decrementar stock', error: error.message });
  }
};

// Reactivar producto
exports.reactivarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id || 1;
    const reactivated = await Producto.reactivar(id, organizacion_id);
    if (!reactivated) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto reactivado' });
  } catch (error) {
    console.error('❌ [reactivarProducto] Error:', error);
    res.status(500).json({ message: 'Error al reactivar producto', error: error.message });
  }
};

// ============================================================
// REPORTES DE PRODUCTOS (CSV)
// ============================================================

/**
 * Exporta TODOS los productos activos de la organización
 */
exports.exportarTodos = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id || 1;

    // Obtener todos los productos (sin filtros, sin paginación)
    const result = await Producto.findAll(organizacion_id, {
      page: 1,
      limit: 99999, // Número grande para obtener todos
    });

    const productos = result.productos || [];

    if (productos.length === 0) {
      return res.status(404).json({ message: 'No hay productos para exportar' });
    }

    // Construir CSV con columnas claras
    const data = productos.map(p => ({
      'Nombre': p.nombre,
      'SKU': p.codigo_sku || '',
      'Código Barras': p.codigo_barras || '',
      'Tipo': p.tipo || 'Producto',
      'Stock': p.stock_actual,
      'Stock Mínimo': p.stock_minimo,
      'Precio Unitario': parseFloat(p.precio_unitario).toFixed(2),
      'Costo Promedio': parseFloat(p.costo_promedio).toFixed(2),
      'Valor Inventario': (parseFloat(p.stock_actual) * parseFloat(p.costo_promedio)).toFixed(2),
      'Categoría': p.categoria_nombre || '',
      'Marca': p.marca_nombre || '',
      'Etiquetas': p.etiquetas || '',
      'Es Kit': p.es_kit ? 'Sí' : 'No',
    }));

    const headers = Object.keys(data[0]);
    
    // 1. BOM para los acentos (\uFEFF)
    let csv = '\uFEFF'; 
    // 2. Truco definitivo para obligar a Excel a usar el punto y coma
    csv += 'sep=;\n'; 
    // 3. Unimos los encabezados con punto y coma
    csv += headers.join(';') + '\n'; 
    
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val); // Forzamos a string para evaluar caracteres
        
        // Verificamos si incluye punto y coma, saltos de línea o comillas
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }

    const filename = `todos_productos_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ [exportarTodos] Error:', error);
    res.status(500).json({ message: 'Error al exportar productos', error: error.message });
  }
};

/**
 * Exporta productos con los filtros aplicados
 */
exports.exportarFiltrados = async (req, res) => {
  try {
    const organizacion_id = req.organizacion_id || 1;
    const { search, tipo, estado_stock, categoria_id, marca_id, es_kit } = req.query;

    // Obtener productos con filtros (sin paginación)
    const result = await Producto.findAll(organizacion_id, {
      search,
      tipo,
      estado_stock,
      categoria_id,
      marca_id,
      es_kit,
      page: 1,
      limit: 99999, // Número grande para obtener todos
    });

    const productos = result.productos || [];

    if (productos.length === 0) {
      return res.status(404).json({ message: 'No hay productos para exportar con estos filtros' });
    }

    // Construir CSV con columnas claras (misma estructura)
    const data = productos.map(p => ({
      'Nombre': p.nombre,
      'SKU': p.codigo_sku || '',
      'Código Barras': p.codigo_barras || '',
      'Tipo': p.tipo || 'Producto',
      'Stock': p.stock_actual,
      'Stock Mínimo': p.stock_minimo,
      'Precio Unitario': parseFloat(p.precio_unitario).toFixed(2),
      'Costo Promedio': parseFloat(p.costo_promedio).toFixed(2),
      'Valor Inventario': (parseFloat(p.stock_actual) * parseFloat(p.costo_promedio)).toFixed(2),
      'Categoría': p.categoria_nombre || '',
      'Marca': p.marca_nombre || '',
      'Etiquetas': p.etiquetas || '',
      'Es Kit': p.es_kit ? 'Sí' : 'No',
    }));

    const headers = Object.keys(data[0]);
    
    // 1. BOM para los acentos (\uFEFF)
    let csv = '\uFEFF'; 
    // 2. Truco definitivo para obligar a Excel a usar el punto y coma
    csv += 'sep=;\n'; 
    // 3. Unimos los encabezados con punto y coma
    csv += headers.join(';') + '\n'; 
    
    for (const row of data) {
      csv += headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
        val = String(val); // Forzamos a string para evaluar caracteres
        
        // Verificamos si incluye punto y coma, saltos de línea o comillas
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';') + '\n';
    }

    const filename = `productos_filtrados_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('❌ [exportarFiltrados] Error:', error);
    res.status(500).json({ message: 'Error al exportar productos filtrados', error: error.message });
  }
};

exports.obtenerComponentesKit = async (req, res) => {
  try {
    const { id } = req.params;
    const organizacion_id = req.organizacion_id;
    const componentes = await Producto.getComponentes(id, organizacion_id);
    res.json(componentes);
  } catch (error) {
    console.error('❌ Error al obtener componentes del kit:', error);
    res.status(500).json({ message: 'Error al obtener componentes', error: error.message });
  }
};
