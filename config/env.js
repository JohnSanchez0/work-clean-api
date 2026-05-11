const Joi = require('joi');
const Logger = require('../utils/logger');
require('dotenv').config();

/**
 * Esquema de validación para las variables de entorno
 */
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  BACKEND_URL: Joi.string().uri().required().messages({
    'any.required': 'Falta la variable BACKEND_URL (URL de tu servidor en Koyeb/Render)'
  }),
  MONGODB_URI: Joi.string().required().messages({
  }),
  JWT_SECRET: Joi.string().min(10).required(),
  CORS_ORIGINS: Joi.string().required(),
  MERCADOPAGO_ACCESS_TOKEN: Joi.string().required(),
  CLOUDINARY_URL: Joi.string().required(),
}).unknown(true); // Permitir otras variables de entorno no definidas aquí

/**
 * Validar variables de entorno al iniciar
 */
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  Logger.error('Fallo en la validación de variables de entorno:', error.message);
  Logger.divider();
  Logger.warn('Asegúrate de que tu archivo .env esté completo.');
  // En producción, es mejor detener el servidor si faltan variables críticas
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
} else {
  Logger.success('Variables de entorno validadas correctamente');
}

module.exports = envVars;
