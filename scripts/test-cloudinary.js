const { cloudinary } = require('../utils/cloudinary');
const Logger = require('../utils/logger');
require('dotenv').config();

async function testCloudinary() {
  Logger.info('Iniciando prueba de conexión con Cloudinary...');
  
  try {
    // Intentamos obtener los detalles de la cuenta (esto valida la API Key y Secret)
    const result = await cloudinary.api.usage();
    
    Logger.success('¡Conexión con Cloudinary EXITOSA!');
    console.log('--- Detalles de la cuenta ---');
    console.log(`Cloud Name: ${cloudinary.config().cloud_name}`);
    console.log(`Plan: ${result.plan}`);
    console.log(`Uso de almacenamiento: ${result.storage.usage_percentage}%`);
    console.log(`Uso de transformaciones: ${result.transformations.usage_percentage}%`);
    console.log('---------------------------');
    
  } catch (error) {
    Logger.error('Error al conectar con Cloudinary:');
    console.error(error.message);
    Logger.warn('Verifica que tu CLOUDINARY_URL en el archivo .env sea correcta.');
  }
}

testCloudinary();
