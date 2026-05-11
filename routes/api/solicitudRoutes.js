const express = require('express');
const router = express.Router();
const SolicitudController = require('../../controllers/Cliente/solicitudController');
const { authenticateToken } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');

// Middleware para validar datos de solicitud
const validateSolicitud = (req, res, next) => {
  const { categoriaId, descripcion, telefono, direccion } = req.body;
  
  if (!categoriaId) {
    return res.status(400).json({
      success: false,
      message: 'La categoría es requerida'
    });
  }
  
  if (!descripcion || descripcion.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'La descripción debe tener al menos 10 caracteres'
    });
  }
  
  if (!telefono || telefono.trim().length < 7) {
    return res.status(400).json({
      success: false,
      message: 'El teléfono debe tener al menos 7 dígitos'
    });
  }
  
  if (!direccion || direccion.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'La dirección debe tener al menos 10 caracteres'
    });
  }
  
  next();
};

// Rutas para solicitudes del cliente
// Todas las rutas requieren autenticación de cliente

/**
 * @route POST /api/solicitudes
 * @desc Crear una nueva solicitud
 * @access Cliente
 */
router.post('/', authenticateToken, validateSolicitud, SolicitudController.crearSolicitud);

/**
 * @route GET /api/solicitudes
 * @desc Obtener todas las solicitudes del cliente autenticado
 * @access Cliente
 */
router.get('/', authenticateToken, SolicitudController.obtenerMisSolicitudes);

/**
 * @route GET /api/solicitudes/estadisticas
 * @desc Obtener estadísticas de solicitudes del cliente
 * @access Cliente
 */
router.get('/estadisticas', authenticateToken, SolicitudController.obtenerEstadisticas);

/**
 * @route GET /api/solicitudes/:id
 * @desc Obtener una solicitud específica del cliente
 * @access Cliente
 */
router.get('/:id', authenticateToken, SolicitudController.obtenerSolicitud);

/**
 * @route PUT /api/solicitudes/:id
 * @desc Actualizar una solicitud del cliente
 * @access Cliente
 */
router.put('/:id', authenticateToken, SolicitudController.actualizarSolicitud);

/**
 * @route PATCH /api/solicitudes/:id/cancelar
 * @desc Cancelar una solicitud del cliente
 * @access Cliente
 */
router.patch('/:id/cancelar', authenticateToken, SolicitudController.cancelarSolicitud);

module.exports = router;
