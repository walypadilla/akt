const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const pacienteController = require('../controllers/clinica/pacienteController');
const citaController = require('../controllers/clinica/citaController');
const consultaController = require('../controllers/clinica/consultaController');
const odontogramaController = require('../controllers/clinica/odontogramaController');
const examenController = require('../controllers/clinica/examenController');
const medicoController = require('../controllers/clinica/medicoController');
const vacunaController = require('../controllers/clinica/vacunaController');
const { uploadExamen } = require('../middleware/uploadExamenes');

const router = express.Router();
router.use(authMiddleware);

// ========== MÉDICOS ==========
router.get('/medicos/usuarios-disponibles', medicoController.getMedicosDisponibles);
router.get('/medicos/anios', medicoController.getAniosDisponibles);
router.get('/medicos/:id/anios', medicoController.getAniosDisponibles);
router.get('/medicos', medicoController.listar);
router.post('/medicos', requireRole('Admin', 'SUPER_ADMIN'), medicoController.crear);
router.put('/medicos/:id', requireRole('Admin', 'SUPER_ADMIN'), medicoController.actualizar);
router.delete('/medicos/:id', requireRole('Admin', 'SUPER_ADMIN'), medicoController.eliminar);
router.put('/medicos/:id/reactivar', requireRole('Admin', 'SUPER_ADMIN'), medicoController.reactivar);

// Exportaciones
router.get('/medicos/exportar/todos', medicoController.exportarTodos);
router.get('/medicos/exportar/filtrados', medicoController.exportarFiltrados);
router.get('/medicos/:id/exportar-consultas', medicoController.exportarDetalleConsultas);
// Detalle con consultas y facturas
router.get('/medicos/:id/detalle', medicoController.obtenerDetalle);


// ========== PACIENTES ==========
router.get('/pacientes', pacienteController.listar);
router.post('/pacientes', pacienteController.crear);
router.get('/pacientes/exportar/todos', pacienteController.exportarTodos);
router.get('/pacientes/exportar/filtrados', pacienteController.exportarFiltrados);
router.get('/pacientes/:id', pacienteController.obtener);
router.put('/pacientes/:id', pacienteController.actualizar);
router.delete('/pacientes/:id', pacienteController.eliminar);
router.put('/pacientes/:id/reactivar', pacienteController.reactivarPaciente);

// ========== CITAS ==========
router.get('/citas', citaController.listar);
router.post('/citas', citaController.crear);
router.get('/citas/:id', citaController.obtener);
router.put('/citas/:id', citaController.actualizar);
router.put('/citas/:id/estado', citaController.cambiarEstado);

// ========== CONSULTAS ==========
router.get('/consultas/anios', consultaController.getAniosDisponibles);
router.get('/consultas/exportar/todos', consultaController.exportarTodos);
router.get('/consultas/exportar/filtrados', consultaController.exportarFiltrados);
// Generales
router.get('/consultas', consultaController.listar);
router.post('/consultas', consultaController.crear);
// ⚠️ Rutas paramétricas AL FINAL
router.get('/consultas/:id', consultaController.obtener);
router.put('/consultas/:id', consultaController.actualizar);
router.post('/consultas/:id/facturar', consultaController.facturar);
router.get('/consultas/:id/examenes-internos', consultaController.getExamenesInternos);
router.get('/consultas/:id/vacunas-aplicadas', consultaController.getVacunasAplicadasConsulta);

// ========== ODONTOGRAMA (solo dental) ==========
router.get('/odontograma/:paciente_id', odontogramaController.obtener);
router.post('/odontograma', odontogramaController.guardar);

// ========== EXÁMENES ==========
router.get('/examenes/anios', examenController.getAniosDisponibles);
router.get('/examenes/dashboard', examenController.getDashboard);
router.get('/examenes/whatsapp-estado', examenController.getEstadoWhatsApp);
router.get('/examenes/exportar/catalogo', examenController.exportarCatalogos);
router.get('/solicitudes-examen/exportar/filtrados', examenController.exportarSolicitudesFiltradas);
router.get('/solicitudes-examen/pendientes', examenController.getPendientes);
// Rutas CRUD
router.get('/examenes', examenController.listarCatalogos);
router.post('/examenes', examenController.crearCatalogo);
// Rutas paramétricas al final
router.put('/examenes/:id/reactivar', examenController.reactivarCatalogo);
router.put('/examenes/:id', examenController.actualizarCatalogo);
router.delete('/examenes/:id', examenController.eliminarCatalogo);

router.get('/solicitudes-examen', examenController.listarSolicitudes);
router.post('/solicitudes-examen', examenController.solicitar);
router.get('/solicitudes-examen/:id/pdf', examenController.generarPDFResultado);
router.put('/solicitudes-examen/:id/completar', examenController.completar);
router.put('/solicitudes-examen/:id/cancelar', examenController.cancelar);
router.post('/solicitudes-examen/:id/whatsapp', examenController.enviarResultadoWhatsApp);
router.post(
  '/solicitudes-examen/:id/archivo',
  uploadExamen.single('archivo'),
  examenController.subirArchivoResultado
);

// ========== VACUNAS (veterinaria) ==========
// ========== VACUNAS (veterinaria) ==========
// ✅ Rutas específicas primero
router.get('/vacunas/anios', vacunaController.getAniosDisponibles);
router.get('/vacunas/dashboard', vacunaController.getDashboard);
router.get('/vacunas/proximas', vacunaController.getProximasVacunas);
router.get('/vacunas/exportar/filtrados', vacunaController.exportarHistorial);
router.get('/vacunas/exportar/top5', vacunaController.exportarTopVacunas);

// Catálogo
router.get('/vacunas', vacunaController.listarVacunas);
router.post('/vacunas', vacunaController.crearVacuna);
router.get('/vacunas/historial-global', vacunaController.listarHistorialGlobal);

// Rutas paramétricas al final
router.put('/vacunas/:id/reactivar', vacunaController.reactivarVacuna);
router.put('/vacunas/:id', vacunaController.actualizarVacuna);
router.delete('/vacunas/:id', vacunaController.eliminarVacuna);

// Historial y aplicación
router.get('/vacunas/historial/:paciente_id', vacunaController.listarHistorialPorPaciente);
router.get('/vacunas/cartilla/:paciente_id', vacunaController.getCartilla);
router.get('/vacunas/cartilla/:paciente_id/pdf', vacunaController.generarPDFCartillaPrivada);
router.post('/vacunas/aplicar', vacunaController.aplicarVacuna);
router.post('/vacunas/cartilla/:paciente_id/token', vacunaController.generarTokenCartilla);

module.exports = router;