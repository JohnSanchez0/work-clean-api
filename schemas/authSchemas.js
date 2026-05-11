const Joi = require('joi');

const authSchemas = {
  // Esquema para el registro de trabajadores
  registrarTrabajador: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName1: Joi.string().min(2).max(50).required(),
    lastName2: Joi.string().min(2).max(50).allow('', null),
    phoneNumber: Joi.string().pattern(/^[0-9]+$/).min(7).max(15).required(),
    documentType: Joi.string().uppercase().valid('CC', 'CE', 'NIT', 'PP').required(),
    documentNumber: Joi.string().alphanum().min(5).max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Las contraseñas no coinciden'
    })
  }),

  // Esquema para el registro de clientes
  registrarCliente: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName1: Joi.string().min(2).max(50).required(),
    lastName2: Joi.string().min(2).max(50).allow('', null),
    phoneNumber: Joi.string().pattern(/^[0-9]+$/).min(7).max(15).required(),
    documentType: Joi.string().uppercase().valid('CC', 'CE', 'NIT', 'PP').required(),
    documentNumber: Joi.string().alphanum().min(5).max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Las contraseñas no coinciden'
    })
  }),

  // Esquema para el login
  iniciarSesion: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Esquema para el registro de SuperAdmin
  registrarSuperAdmin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    nombre: Joi.string().required(),
    apellido1: Joi.string().required(),
    apellido2: Joi.string().allow('', null),
    telefono: Joi.string().required(),
    numeroDocumento: Joi.string().required(),
    tipoDocumento: Joi.string().uppercase().valid('CC', 'CE', 'NIT', 'PP').required(),
    nivelAcceso: Joi.string().valid('superadmin', 'admin').default('admin'),
    permisos: Joi.array().items(Joi.string()).default([])
  }),

  // Esquema para actualizar SuperAdmin
  actualizarSuperAdmin: Joi.object({
    nombre: Joi.string(),
    apellido1: Joi.string(),
    apellido2: Joi.string().allow('', null),
    telefono: Joi.string(),
    nivelAcceso: Joi.string().valid('superadmin', 'admin'),
    permisos: Joi.array().items(Joi.string()),
    activo: Joi.boolean()
  })
};

module.exports = authSchemas;
