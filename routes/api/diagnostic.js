const express = require('express');
const { isMongoConnected } = require('../../config/mongodb');

const router = express.Router();

/**
 * Endpoint de diagnóstico para verificar la configuración de la base de datos (MongoDB)
 */
router.get('/database', async (req, res) => {
  try {
    const diagnostic = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        type: 'MongoDB',
        connected: isMongoConnected(),
        error: null
      },
      server: {
        port: process.env.PORT,
        node_version: process.version,
        platform: process.platform
      }
    };

    res.json({
      success: true,
      diagnostic
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      diagnostic: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        error: error.message
      }
    });
  }
});

/**
 * Endpoint para verificar variables de entorno (sin mostrar valores sensibles)
 */
router.get('/env', (req, res) => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_PASSWORD: process.env.MONGODB_PASSWORD ? 'Configurada' : 'No configurada',
    MONGODB_URI: process.env.MONGODB_URI ? 'Configurada' : 'No configurada',
    JWT_SECRET: process.env.JWT_SECRET ? 'Configurada' : 'No configurada',
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Configurada' : 'No configurada',
    MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Configurada' : 'No configurada'
  };

  res.json({
    success: true,
    environment_variables: envVars
  });
});

module.exports = router;
