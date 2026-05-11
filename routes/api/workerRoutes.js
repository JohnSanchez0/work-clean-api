const express = require('express');
const { TrabajadorController } = require('../../controllers/Trabajador');
const { authenticateToken, requireWorker } = require('../../middleware/auth');

const router = express.Router();

// Ruta pública para creación de trabajador (sin autenticación)
router.post('/', TrabajadorController.crearTrabajador);

// Aplicar autenticación JWT al resto de rutas de trabajador
router.use(authenticateToken);
router.use(requireWorker);
router.get('/', TrabajadorController.obtenerTodos);
router.get('/pendientes', TrabajadorController.obtenerPendientes);
router.get('/estadisticas', TrabajadorController.obtenerEstadisticas);
router.get('/solicitudes', TrabajadorController.obtenerSolicitudesDisponibles);
router.get('/:id', TrabajadorController.obtenerPorId);
router.get('/usuario/:usuarioId', TrabajadorController.obtenerPorUsuarioId);
router.get('/check/:usuarioId', TrabajadorController.esTrabajador);
router.put('/:id', TrabajadorController.actualizar);
router.put('/:id/estado', TrabajadorController.cambiarEstado);
router.put('/:id/aprobar', TrabajadorController.aprobar);
router.put('/:id/rechazar', TrabajadorController.rechazar);
router.delete('/:id', TrabajadorController.eliminar);

// Rutas para asignaciones de trabajadores
router.post('/solicitudes/:solicitudId/aceptar', TrabajadorController.aceptarSolicitud);
router.get('/:trabajadorId/asignaciones', TrabajadorController.obtenerAsignaciones);
router.put('/asignaciones/:id/estado', TrabajadorController.actualizarEstadoAsignacion);
router.get('/:trabajadorId/asignaciones/estadisticas', TrabajadorController.obtenerEstadisticasAsignaciones);

module.exports = router;
