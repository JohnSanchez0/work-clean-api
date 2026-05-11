/**
 * Script para probar el cron job de limpieza de tokens
 * Ejecutar con: node scripts/test-cron-job.js
 */

require('dotenv').config();
const CronJobs = require('../utils/cronJobs.js');

async function testCronJob() {
  console.log('🧪 Iniciando prueba del cron job...');
  
  try {
    // Probar el cron job inmediatamente
    const result = await CronJobs.probarCronJob();
    
    if (result.success) {
      console.log('✅ Prueba exitosa!');
      console.log(`📊 Tokens eliminados: ${result.tokensEliminados}`);
      console.log(`⏰ Timestamp: ${result.timestamp}`);
    } else {
      console.log('❌ Prueba falló');
      console.log(`Error: ${result.error}`);
    }
    
    // Obtener estadísticas
    console.log('\n📈 Obteniendo estadísticas...');
    const stats = await CronJobs.obtenerEstadisticas();
    
    if (stats) {
      console.log('📊 Estadísticas de tokens:');
      console.log(`   Total: ${stats.total}`);
      console.log(`   Activos: ${stats.activos}`);
      console.log(`   Expirados: ${stats.expirados}`);
      console.log(`   Fecha consulta: ${stats.fechaConsulta}`);
    } else {
      console.log('❌ No se pudieron obtener estadísticas');
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
  
  process.exit(0);
}

// Ejecutar la prueba
testCronJob();
