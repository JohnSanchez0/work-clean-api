const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación JWT
 * Verifica que el token JWT sea válido
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Agregar información del usuario al request
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(403).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * @param {Array} allowedRoles - Roles permitidos
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar si es SuperAdmin
 */
const requireSuperAdmin = requireRole(['superadmin']);

/**
 * Middleware para verificar si es Admin o SuperAdmin
 */
const requireAdmin = requireRole(['admin', 'superadmin']);

/**
 * Middleware para verificar si es trabajador
 */
const requireWorker = requireRole(['worker']);

/**
 * Middleware para verificar si es cliente
 */
const requireClient = requireRole(['client']);

module.exports = {
  authenticateToken,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireWorker,
  requireClient
};
