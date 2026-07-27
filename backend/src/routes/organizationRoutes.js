// backend/src/routes/organizationRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');

// Controladores
const clienteController = require('../controllers/clienteController');
const facturaController = require('../controllers/facturaController');
const compraController = require('../controllers/compraController');
const empleadoController = require('../controllers/empleadoController');
const planillaController = require('../controllers/planillaController');
const proveedorController = require('../controllers/proveedorController');
const inventoryController = require('../controllers/inventoryController');
const productoController = require('../controllers/productoController');

const router = express.Router();
router.use(authMiddleware);

// ========== CLIENTES ==========
router.get('/clientes', clienteController.obtenerClientes);
router.post('/clientes', clienteController.crearCliente);
router.get('/clientes/:id', clienteController.obtenerClientePorId);
router.put('/clientes/:id', clienteController.actualizarCliente);
router.delete('/clientes/:id', clienteController.eliminarCliente);

// ========== PROVEEDORES ==========
router.get('/proveedores', proveedorController.obtenerProveedores);
router.post('/proveedores', proveedorController.crearProveedor);
router.get('/proveedores/:id', proveedorController.obtenerProveedorPorId);
router.put('/proveedores/:id', proveedorController.actualizarProveedor);
router.delete('/proveedores/:id', proveedorController.eliminarProveedor);

// ========== FACTURAS ==========
router.get('/facturas', facturaController.obtenerFacturas);
router.post('/facturas', facturaController.crearFactura);
router.get('/facturas/:id', facturaController.obtenerFacturaPorId);
router.put('/facturas/:id', facturaController.editarFactura);
router.put('/facturas/:id/estado', facturaController.cambiarEstadoFactura);
router.put('/facturas/:id/anular', facturaController.anularFactura);
router.get('/facturas/:id/pdf', facturaController.generarPDF);


// ========== EMPLEADOS ==========
router.get('/empleados', empleadoController.obtenerEmpleados);
router.post('/empleados', empleadoController.crearEmpleado);
router.get('/empleados/exportar', empleadoController.exportarEmpleados); // Mover arriba
router.get('/empleados/:id', empleadoController.obtenerEmpleadoPorId);
router.put('/empleados/:id', empleadoController.actualizarEmpleado);
router.put('/empleados/:id/desactivar', empleadoController.desactivarEmpleado);
router.put('/empleados/:id/reactivar', empleadoController.reactivarEmpleado);

// ========== PLANILLAS ==========
router.get('/planillas', planillaController.obtenerPlanillas);
router.post('/planillas/individual', planillaController.generarPlanillaIndividual);
router.post('/planillas/masiva', planillaController.generarPlanillaMasiva);
// Rutas estáticas siempre antes de las dinámicas
router.get('/planillas/exportar', planillaController.exportarPlanillas);
router.get('/planillas/anios', planillaController.getAniosDisponibles);
router.put('/planillas/multiple/estado', planillaController.cambiarEstadoMultiple);
router.get('/planillas/estado-generacion', planillaController.obtenerEstadoGeneracion);
// Rutas dinámicas
router.put('/planillas/:id/estado', planillaController.cambiarEstadoPlanilla);
router.delete('/planillas/:id', planillaController.eliminarPlanilla);
router.get('/planillas/:id/pdf', planillaController.generarBoletaPDF);

// ========== AGUINALDOS Y VACACIONES ==========
router.get('/aguinaldos', planillaController.obtenerAguinaldos);
router.post('/aguinaldos', planillaController.generarAguinaldos);
router.put('/aguinaldos/multiple/estado', planillaController.cambiarEstadoAguinaldosMultiple);
router.get('/aguinaldos/exportar', planillaController.exportarAguinaldos); // Mover arriba
router.get('/aguinaldos/:id/pdf', planillaController.generarBoletaAguinaldoPDF);

// ========== AUSENCIAS ==========
router.post('/ausencias', planillaController.crearAusencia);
router.get('/ausencias', planillaController.obtenerAusencias);
router.get('/ausencias/exportar', planillaController.exportarAusencias);
router.delete('/ausencias/:id', planillaController.eliminarAusencia);

// ========== HORAS EXTRAS ==========
router.post('/horas-extras', planillaController.crearHoraExtra);
router.get('/horas-extras', planillaController.obtenerHorasExtras);
router.get('/horas-extras/exportar', planillaController.exportarHorasExtras);
router.delete('/horas-extras/:id', planillaController.eliminarHoraExtra);

// ========== PROVEEDORES ==========
router.get('/proveedores', proveedorController.obtenerProveedores);
router.get('/proveedores/:id', proveedorController.obtenerProveedorPorId);
router.get('/proveedores/exportar/todos', proveedorController.exportarTodosProveedores);
router.get('/proveedores/exportar/filtrados', proveedorController.exportarProveedoresFiltrados);
router.post('/proveedores', proveedorController.crearProveedor);
router.put('/proveedores/:id', proveedorController.actualizarProveedor);
router.delete('/proveedores/:id', proveedorController.eliminarProveedor);
router.put('/proveedores/:id/reactivar', proveedorController.reactivarProveedor);
router.get('/proveedores/:id/pdf', proveedorController.generarProveedorPDF);

// ========== CLIENTES ==========
router.get('/clientes', clienteController.obtenerClientes);
router.get('/clientes/:id', clienteController.obtenerClientePorId);
router.post('/clientes', clienteController.crearCliente);
router.put('/clientes/:id', clienteController.actualizarCliente);
router.delete('/clientes/:id', clienteController.eliminarCliente);
router.put('/clientes/:id/reactivar', clienteController.reactivarCliente);
router.get('/clientes/exportar/todos', clienteController.exportarTodosClientes);
router.get('/clientes/exportar/filtrados', clienteController.exportarClientesFiltrados);
router.get('/clientes/:id/pdf', clienteController.generarClientePDF);
// Gráficas
router.get('/clientes/grafica/por-mes', clienteController.getClientesPorMes);
router.get('/clientes/grafica/top', clienteController.getTopClientes);
router.get('/clientes/grafica/por-mes/exportar', clienteController.exportarGraficaClientesPorMes);
router.get('/clientes/grafica/top/exportar', clienteController.exportarTopClientes);
// Años disponibles
router.get('/clientes/anios', clienteController.getAniosDisponibles);

// ============================================================
// INVENTARIO
// ============================================================

// ---------- DASHBOARD ----------
router.get('/inventario/dashboard', inventoryController.getInventoryDashboard);
router.get('/inventario/dashboard/anios', inventoryController.getAniosDisponibles);

// ---------- BODEGAS ----------
router.get('/inventario/bodegas', inventoryController.findAllWarehouses);
router.post('/inventario/bodegas', inventoryController.createWarehouse);
router.put('/inventario/bodegas/:id', inventoryController.updateWarehouse);
router.delete('/inventario/bodegas/:id', inventoryController.deleteWarehouse);

// ---------- CATEGORÍAS ----------
router.get('/inventario/categorias', inventoryController.getCategorias);
router.post('/inventario/categorias', inventoryController.createCategoria);
router.put('/inventario/categorias/:id', inventoryController.updateCategoria);
router.delete('/inventario/categorias/:id', inventoryController.deleteCategoria);

// ---------- MARCAS ----------
router.get('/inventario/marcas', inventoryController.getMarcas);
router.post('/inventario/marcas', inventoryController.createMarca);
router.put('/inventario/marcas/:id', inventoryController.updateMarca);
router.delete('/inventario/marcas/:id', inventoryController.deleteMarca);

// ---------- ETIQUETAS ----------
router.get('/inventario/etiquetas', inventoryController.getEtiquetas);
router.post('/inventario/etiquetas', inventoryController.createEtiqueta);
router.put('/inventario/etiquetas/:id', inventoryController.updateEtiqueta);
router.delete('/inventario/etiquetas/:id', inventoryController.deleteEtiqueta);
router.post('/inventario/productos/etiquetas', inventoryController.asignarEtiquetaAProducto);
router.delete('/inventario/productos/etiquetas', inventoryController.eliminarEtiquetaDeProducto);
router.get('/inventario/productos/:producto_id/etiquetas', inventoryController.getEtiquetasDeProducto);

// ---------- PRODUCTOS ----------
router.get('/inventario/productos', inventoryController.getProductos);
router.get('/inventario/productos/:id', inventoryController.getProductoById);
router.post('/inventario/productos', inventoryController.createProducto);
router.put('/inventario/productos/:id', inventoryController.updateProducto);
router.delete('/inventario/productos/:id', inventoryController.deleteProducto);

// ---------- MOVIMIENTOS ----------
router.get('/inventario/movimientos', inventoryController.getMovimientos);
router.get('/inventario/kardex/:producto_id', inventoryController.getKardex);

// ---------- AJUSTES ----------
router.post('/inventario/ajustes', inventoryController.createAjuste);
router.get('/inventario/ajustes', inventoryController.getAjustes);

// ---------- REPORTES ----------
router.get('/inventario/reportes/pareto', inventoryController.getPareto);
router.get('/inventario/reportes/lento-movimiento', inventoryController.getLentoMovimiento);
router.get('/inventario/reportes/valoracion', inventoryController.getValoracionInventario);
router.get('/inventario/reportes/toma-fisica', inventoryController.getTomaFisica);
router.get('/inventario/reportes/exportar/:tipo', inventoryController.exportarReporte);
router.get('/inventario/reportes/exportar-tabla', inventoryController.exportarTabla);
router.get('/inventario/reportes/top-cambios-precio', inventoryController.getTopCambiosPrecio);

// ---------- KITS ----------
router.get('/inventario/kits/:producto_kit_id', inventoryController.getKitComponentes);
router.post('/inventario/kits', inventoryController.addKitComponente);
router.delete('/inventario/kits/:id', inventoryController.removeKitComponente);

// ---------- COSTOS ----------
router.get('/inventario/costos/:producto_id', inventoryController.getCostosHistoricos);
router.post('/inventario/costos', inventoryController.registrarCostoHistorico);

// ---------- ALERTAS Y KPIs ----------
router.get('/inventario/alertas', inventoryController.getAlertasStock);
router.get('/inventario/kpis', inventoryController.getKPIsInventario);
router.get('/inventario/proyeccion/:producto_id', inventoryController.getProyeccionAgotamiento);
router.get('/inventario/proyeccion-masiva', inventoryController.getProyeccionAgotamientoMasiva);

// ============================================================
// COMPRAS
// ============================================================
// ========== COMPRAS ==========
router.get('/compras/dashboard', compraController.obtenerDashboardCompras);
router.get('/compras/exportar/todas', compraController.exportarTodasCompras);
router.get('/compras/exportar/filtradas', compraController.exportarComprasFiltradas);
router.get('/compras/grafica/evolucion', compraController.getEvolucionGastos);
router.get('/compras/grafica/comparacion-pagos', compraController.getComparacionPagosPorMes);
router.get('/compras/grafica/top-productos', compraController.getTopProductosMes);
router.get('/compras/grafica/evolucion/exportar', compraController.exportarEvolucionGastos);
router.get('/compras/grafica/comparacion-pagos/exportar', compraController.exportarComparacionPagos);
router.get('/compras/grafica/top-productos/exportar', compraController.exportarTopProductos);
router.get('/compras/pendientes-vencimiento', compraController.getComprasPendientesConVencimiento);
router.get('/compras/pendientes', compraController.getComprasPendientes);

router.get('/compras/anios', compraController.getAniosDisponibles);
router.put('/compras/:id/pagar', compraController.marcarComoPagada);
router.get('/compras', compraController.obtenerCompras);
router.get('/compras/:id', compraController.obtenerCompraPorId);
router.post('/compras', compraController.crearCompra);
router.put('/compras/:id', compraController.actualizarCompra);
router.delete('/compras/:id', compraController.cancelarCompra);
router.get('/compras/:id/pdf', compraController.generarPDFCompra);
// Dashboard individuales (opcionales)
router.get('/compras/dashboard/kpis', compraController.getKPIs);
router.get('/compras/dashboard/evolucion', compraController.getEvolucionGastos);
router.get('/compras/dashboard/distribucion', compraController.getDistribucionEgresos);
router.get('/compras/dashboard/alertas-vencimiento', compraController.getAlertasVencimiento);
router.get('/compras/dashboard/top-proveedores', compraController.getTopProveedores);

// ============================================================
// PRODUCTOS
// ============================================================
// ---------- PRODUCTOS ----------
router.get('/productos', productoController.obtenerProductos);
router.post('/productos', productoController.crearProducto);
router.put('/productos/:id', productoController.actualizarProducto);
router.delete('/productos/:id', productoController.eliminarProducto);
router.put('/productos/:id/reactivar', productoController.reactivarProducto);
router.post('/productos/increment-stock', productoController.incrementStock);
router.post('/productos/decrement-stock', productoController.decrementStock);
router.get('/productos/exportar-todos', productoController.exportarTodos);
router.get('/productos/exportar-filtrados', productoController.exportarFiltrados);


module.exports = router;