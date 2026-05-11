const authSchemas = require('../schemas/authSchemas');
const Logger = require('../utils/logger');

/**
 * Middleware genérico de validación usando Joi
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      Logger.warn(`Error de validación en ${req.originalUrl}: ${errorMessages.join(', ')}`);
      
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada no válidos',
        errors: errorMessages
      });
    }

    // Reemplazar el body con los datos validados (con campos desconocidos eliminados)
    req.body = value;
    next();
  };
};

module.exports = {
  validateWorkerRegistration: validate(authSchemas.registrarTrabajador),
  validateLogin: validate(authSchemas.iniciarSesion),
  validateClienteRegistration: validate(authSchemas.registrarCliente),
  validateSuperAdminRegistration: validate(authSchemas.registrarSuperAdmin),
  validateSuperAdminUpdate: validate(authSchemas.actualizarSuperAdmin),
};
