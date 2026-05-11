/**
 * Rutas para gestión de tokens (solo para administradores)
 * Incluye limpieza manual y estadísticas
 */

const express = require('express');
const router = express.Router();
const CronJobs = require('../../utils/cronJobs.js');
const { authenticateToken } = require('../../middleware/auth.js');

/**
 * GET /api/tokens/stats
 * Obtener estadísticas de tokens (solo admin/superadmin)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Verificar que sea admin o superadmin
    if (!['admin', 'superadmin'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden ver estadísticas de tokens.'
      });
    }

    const stats = await CronJobs.obtenerEstadisticas();
    
    if (!stats) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de tokens'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/tokens/cleanup
 * Ejecutar limpieza manual de tokens (solo superadmin)
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    // Verificar que sea superadmin
    if (req.user.userType !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo super administradores pueden ejecutar limpieza manual.'
      });
    }

    const result = await CronJobs.ejecutarLimpiezaManual();
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Limpieza completada. ${result.tokensEliminados} tokens eliminados.`
        : 'Error en la limpieza de tokens',
      data: result
    });
  } catch (error) {
    console.error('Error en limpieza manual de tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/tokens/test-cron
 * Probar el cron job inmediatamente (solo superadmin)
 */
router.post('/test-cron', authenticateToken, async (req, res) => {
  try {
    // Verificar que sea superadmin
    if (req.user.userType !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo super administradores pueden probar el cron job.'
      });
    }

    const result = await CronJobs.probarCronJob();
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Prueba del cron job completada. ${result.tokensEliminados} tokens eliminados.`
        : 'Error en la prueba del cron job',
      data: result
    });
  } catch (error) {
    console.error('Error en prueba del cron job:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
