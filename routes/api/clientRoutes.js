const express = require('express');
const { ClienteController } = require('../../controllers/Cliente');
const { authenticateToken, requireClient } = require('../../middleware/auth');

const router = express.Router();

// Ruta pública para creación de cliente (sin autenticación)
router.post('/', ClienteController.crearCliente);

// Aplicar autenticación JWT al resto de rutas de cliente
router.use(authenticateToken);
router.use(requireClient);
router.get('/', ClienteController.obtenerTodos);
router.get('/estadisticas', ClienteController.obtenerEstadisticas);
router.get('/:id', ClienteController.obtenerPorId);
router.get('/usuario/:usuarioId', ClienteController.obtenerPorUsuarioId);
router.get('/check/:usuarioId', ClienteController.esCliente);
router.put('/:id', ClienteController.actualizar);
router.put('/:id/estado', ClienteController.cambiarEstado);
router.put('/:id/ultimo-acceso', ClienteController.actualizarUltimoAcceso);
router.delete('/:id', ClienteController.eliminar);

module.exports = router;
