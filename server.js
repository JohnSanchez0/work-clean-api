const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectMongoDB } = require('./config/mongodb.js');
const routes = require('./routes/index.js');
const CronJobs = require('./utils/cronJobs.js');
const { rateLimit } = require('express-rate-limit');
const Logger = require('./utils/logger.js');
require('./config/env.js'); // Validar variables de entorno al importar
require('dotenv').config();

const app = express();

// Rate limiting: Máximo 100 peticiones cada 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos'
  }
});

// Aplicar el limitador a todas las rutas
app.use(limiter);

const PORT = process.env.PORT || 3001;

// Middlewares de seguridad y logging
app.use(helmet());
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'https://faworki.vercel.app'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(morgan('dev')); // 'dev' es más limpio para desarrollo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas base
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a la API de FaWorKi',
    version: '1.0.0',
    status: 'Servidor funcionando'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

app.use('/', routes);

// Manejo de errores
app.use((err, req, res, next) => {
  Logger.error('Excepción no controlada', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, async () => {
  Logger.banner();
  Logger.info(`Servidor iniciado en puerto: ${PORT}`);
  Logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`Endpoints: http://localhost:${PORT}`);
  Logger.divider();
  
  // Conectar a MongoDB
  connectMongoDB()
    .then((mongoConnected) => {
      if (mongoConnected) {
        Logger.success('Base de datos MongoDB conectada');
        Logger.divider();
        
        // Inicializar cron jobs
        CronJobs.init();
      } else {
        Logger.warn('MongoDB no disponible. Algunas funciones estarán limitadas.');
      }
    })
    .catch((error) => {
      Logger.error('Fallo crítico en conexión MongoDB', error.message);
    });
});

module.exports = app;
