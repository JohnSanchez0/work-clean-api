const express = require('express');
const { 
  obtenerTrabajadoresPendientes, 
  aprobarTrabajador, 
  rechazarTrabajador, 
  obtenerTrabajadoresAprobados,
  obtenerEstadisticas,
  obtenerSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  agregarComentario
} = require('../../controllers/Admin/adminController');
const { ClienteController } = require('../../controllers/Cliente');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// Aplicar autenticación JWT a todas las rutas de admin
router.use(authenticateToken);
router.use(requireAdmin);

// Rutas de administración
router.get('/trabajadores/pendientes', obtenerTrabajadoresPendientes);
router.get('/trabajadores/aprobados', obtenerTrabajadoresAprobados);
router.put('/trabajadores/:trabajadorId/aprobar', aprobarTrabajador);
router.put('/trabajadores/:trabajadorId/rechazar', rechazarTrabajador);
router.get('/estadisticas', obtenerEstadisticas);

// Rutas de solicitudes
router.get('/requests', obtenerSolicitudes);
router.put('/requests/:requestId/approve', aprobarSolicitud);
router.put('/requests/:requestId/reject', rechazarSolicitud);
router.post('/requests/:requestId/comments', agregarComentario);

// Rutas de clientes (para administradores)
router.get('/clientes', ClienteController.obtenerTodos);
router.get('/clientes/estadisticas', ClienteController.obtenerEstadisticas);
router.get('/clientes/:id', ClienteController.obtenerPorId);
router.put('/clientes/:id', ClienteController.actualizar);
router.put('/clientes/:id/estado', ClienteController.cambiarEstado);
router.delete('/clientes/:id', ClienteController.eliminar);

module.exports = router;
