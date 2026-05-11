#!/usr/bin/env node

/**
 * Script de inicio para producción
 */

const Logger = require('./utils/logger');

async function startProduction() {
  Logger.banner();
  Logger.info('Iniciando FaWorKi Backend en modo producción...');
  
  // Importar validación de entorno
  try {
    require('./config/env.js');
    Logger.success('Variables de entorno verificadas');
  } catch (error) {
    Logger.error('Fallo en validación de entorno', error.message);
    process.exit(1);
  }
  
  // Iniciar el servidor
  Logger.info('Lanzando servidor principal...');
  require('./server.js');
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  Logger.error('Excepción no controlada (proceso)', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Promesa rechazada no manejada', reason);
  process.exit(1);
});

// Ejecutar
startProduction().catch((err) => {
  Logger.error('Error crítico al iniciar producción', err.message);
  process.exit(1);
});
