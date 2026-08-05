const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const pacienteController = require('../controllers/clinica/pacienteController');
const citaController = require('../controllers/clinica/citaController');
const consultaController = require('../controllers/clinica/consultaController');
const odontogramaController = require('../controllers/clinica/odontogramaController');
const examenController = require('../controllers/clinica/examenController');
const medicoController = require('../controllers/clinica/medicoController');
const vacunaController = require('../controllers/clinica/vacunaController');

const router = express.Router();
router.use(authMiddleware);

// ========== MÉDICOS ==========
router.get('/medicos/:id/anios', medicoController.getAniosDisponibles);
router.get('/medicos', medicoController.listar);
router.post('/medicos', medicoController.crear);
router.put('/medicos/:id', medicoController.actualizar);
router.delete('/medicos/:id', medicoController.eliminar);
router.put('/medicos/:id/reactivar', medicoController.reactivar);

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
router.get('/consultas', consultaController.listar);
router.post('/consultas', consultaController.crear);
router.get('/consultas/:id', consultaController.obtener);
router.put('/consultas/:id', consultaController.actualizar);
router.post('/consultas/:id/facturar', consultaController.facturar);
router.get('/consultas/exportar/todos', consultaController.exportarTodos);
router.get('/consultas/exportar/filtrados', consultaController.exportarFiltrados);

// ========== ODONTOGRAMA (solo dental) ==========
router.get('/odontograma/:paciente_id', odontogramaController.obtener);
router.post('/odontograma', odontogramaController.guardar);

// ========== EXÁMENES ==========
router.get('/examenes', examenController.listarCatalogos);
router.post('/examenes', examenController.crearCatalogo);
router.put('/examenes/:id', examenController.actualizarCatalogo);
router.delete('/examenes/:id', examenController.eliminarCatalogo);

router.get('/solicitudes-examen', examenController.listarSolicitudes);
router.post('/solicitudes-examen', examenController.solicitar);
router.put('/solicitudes-examen/:id/completar', examenController.completar);
router.put('/solicitudes-examen/:id/cancelar', examenController.cancelar);
router.get('/solicitudes-examen/pendientes', examenController.getPendientes);

// ========== VACUNAS (veterinaria) ==========
router.get('/vacunas', vacunaController.listarVacunas);
router.post('/vacunas', vacunaController.crearVacuna);
router.put('/vacunas/:id', vacunaController.actualizarVacuna);
router.delete('/vacunas/:id', vacunaController.eliminarVacuna);
router.get('/vacunas/historial/:paciente_id', vacunaController.listarHistorialPorPaciente);
router.post('/vacunas/aplicar', vacunaController.aplicarVacuna);
router.get('/vacunas/proximas', vacunaController.getProximasVacunas);

module.exports = router;