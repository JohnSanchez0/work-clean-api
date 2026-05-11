const express = require('express');
const { SuperAdminController } = require('../../controllers/SuperAdmin');
const { ClienteController } = require('../../controllers/Cliente');
const { 
  validateSuperAdminRegistration, 
  validateSuperAdminUpdate 
} = require('../../middleware/validation');
const { authenticateToken, requireSuperAdmin } = require('../../middleware/auth');

const router = express.Router();

// Ruta pública para registro inicial de SuperAdmin (sin autenticación)
router.post('/register', validateSuperAdminRegistration, SuperAdminController.crearSuperAdmin);

// Aplicar autenticación JWT al resto de rutas de superadmin
router.use(authenticateToken);
router.use(requireSuperAdmin);
router.get('/', SuperAdminController.obtenerTodos);
router.get('/:id', SuperAdminController.obtenerPorId);
router.get('/usuario/:usuarioId', SuperAdminController.obtenerPorUsuarioId);
router.put('/:id', validateSuperAdminUpdate, SuperAdminController.actualizar);
router.delete('/:id', SuperAdminController.eliminar);
router.get('/check/:usuarioId', SuperAdminController.esSuperAdmin);
router.put('/ultimo-acceso/:usuarioId', SuperAdminController.actualizarUltimoAcceso);

// Rutas de clientes (para superadministradores)
router.get('/clientes', ClienteController.obtenerTodos);
router.get('/clientes/estadisticas', ClienteController.obtenerEstadisticas);
router.get('/clientes/:id', ClienteController.obtenerPorId);
router.put('/clientes/:id', ClienteController.actualizar);
router.put('/clientes/:id/estado', ClienteController.cambiarEstado);
router.delete('/clientes/:id', ClienteController.eliminar);

module.exports = router;
