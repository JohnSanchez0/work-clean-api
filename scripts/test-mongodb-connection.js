/**
 * Script para probar la conexión a MongoDB
 * Ejecutar con: node scripts/test-mongodb-connection.js
 */

require('dotenv').config();
const { connectMongoDB, disconnectMongoDB } = require('../config/mongodb.js');

async function testConnection() {
  console.log('🔄 Intentando conectar a MongoDB...\n');
  
  const connected = await connectMongoDB();
  
  if (connected) {
    console.log('\n✅ ¡Conexión exitosa! MongoDB está funcionando correctamente.');
  } else {
    console.log('\n❌ No se pudo conectar a MongoDB. Verifica tus credenciales y la configuración.');
    process.exit(1);
  }
  
  // Cerrar la conexión después de la prueba
  await disconnectMongoDB();
  process.exit(0);
}

// Ejecutar la prueba
testConnection().catch((error) => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});

