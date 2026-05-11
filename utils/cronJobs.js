/**
 * Cron Jobs para mantenimiento automático del sistema
 */

const cron = require('node-cron');
const RefreshTokenMongo = require('../models/RefreshToken/RefreshTokenMongo');
const Logger = require('./logger');

class CronJobs {
  /**
   * Inicializar todos los cron jobs
   */
  static init() {
    Logger.info('Iniciando servicios de mantenimiento (Cron Jobs)...');
    
    // Limpieza de refresh tokens expirados - cada día a las 2:00 AM
    this.setupTokenCleanup();
    
    Logger.success('Servicios de mantenimiento inicializados');
  }

  /**
   * Configurar limpieza automática de refresh tokens
   */
  static setupTokenCleanup() {
    cron.schedule('0 2 * * *', async () => {
      Logger.info('Iniciando limpieza automática de sesiones expiradas...');
      
      try {
        const tokensEliminados = await RefreshTokenMongo.limpiarExpirados();
        Logger.success(`Limpieza de sesiones completada. Registros eliminados: ${tokensEliminados}`);
      } catch (error) {
        Logger.error('Fallo en limpieza automática de sesiones', error.message);
      }
    }, {
      scheduled: true,
      timezone: "America/Bogota"
    });

    Logger.info('Cron Job programado: Limpieza de sesiones (Diario 02:00 AM)');
  }

  /**
   * Ejecutar limpieza manual de tokens
   */
  static async ejecutarLimpiezaManual() {
    try {
      Logger.info('Iniciando limpieza manual de sesiones...');
      const tokensEliminados = await RefreshTokenMongo.limpiarExpirados();
      Logger.success(`Limpieza manual completada: ${tokensEliminados} eliminados`);
      return { success: true, tokensEliminados };
    } catch (error) {
      Logger.error('Error en limpieza manual', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CronJobs;
