/**
 * Script para crear índices en MongoDB
 * Mejora el rendimiento de las búsquedas
 * 
 * Ejecutar con: node scripts/setup-mongodb-indexes.js
 */

require('dotenv').config();
const { connectMongoDB, disconnectMongoDB, client } = require('../config/mongodb');

const DB_NAME = process.env.DB_NAME;

async function setupIndexes() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    const connected = await connectMongoDB();
    if (!connected) {
      throw new Error('No se pudo conectar a MongoDB');
    }
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db(DB_NAME);

    // Índices para la colección de clientes
    console.log('📊 Creando índices para la colección "clientes"...');
    const clientesCollection = db.collection('clientes');
    
    await clientesCollection.createIndex({ email: 1 }, { unique: true });
    console.log('  ✅ Índice único en email');
    
    await clientesCollection.createIndex({ numeroDocumento: 1 }, { unique: true });
    console.log('  ✅ Índice único en numeroDocumento');
    
    await clientesCollection.createIndex({ estado: 1 });
    console.log('  ✅ Índice en estado');
    
    await clientesCollection.createIndex({ createdAt: -1 });
    console.log('  ✅ Índice en createdAt');

    // Índices para la colección de trabajadores
    console.log('\n📊 Creando índices para la colección "trabajadores"...');
    const trabajadoresCollection = db.collection('trabajadores');
    
    await trabajadoresCollection.createIndex({ email: 1 }, { unique: true });
    console.log('  ✅ Índice único en email');
    
    await trabajadoresCollection.createIndex({ numeroDocumento: 1 }, { unique: true });
    console.log('  ✅ Índice único en numeroDocumento');
    
    await trabajadoresCollection.createIndex({ estado: 1 });
    console.log('  ✅ Índice en estado');
    
    await trabajadoresCollection.createIndex({ createdAt: -1 });
    console.log('  ✅ Índice en createdAt');

    // Índices para la colección de refresh_tokens
    console.log('\n📊 Creando índices para la colección "refresh_tokens"...');
    const refreshTokensCollection = db.collection('refresh_tokens');
    
    await refreshTokensCollection.createIndex({ token: 1 }, { unique: true });
    console.log('  ✅ Índice único en token');
    
    await refreshTokensCollection.createIndex({ userId: 1 });
    console.log('  ✅ Índice en userId');
    
    await refreshTokensCollection.createIndex({ expiresAt: 1 });
    console.log('  ✅ Índice en expiresAt');
    
    await refreshTokensCollection.createIndex({ isActive: 1 });
    console.log('  ✅ Índice en isActive');
    
    await refreshTokensCollection.createIndex({ createdAt: -1 });
    console.log('  ✅ Índice en createdAt');

    // Índice compuesto para búsquedas comunes
    await refreshTokensCollection.createIndex({ userId: 1, isActive: 1, expiresAt: 1 });
    console.log('  ✅ Índice compuesto (userId, isActive, expiresAt)');

    // Índices para la colección de categorías
    console.log('\n📊 Creando índices para la colección "categorias"...');
    const categoriasCollection = db.collection('categorias');
    
    await categoriasCollection.createIndex({ nombre: 1 }, { unique: true });
    console.log('  ✅ Índice único en nombre');
    
    await categoriasCollection.createIndex({ activa: 1 });
    console.log('  ✅ Índice en activa');
    
    await categoriasCollection.createIndex({ createdAt: -1 });
    console.log('  ✅ Índice en createdAt');

    console.log('\n✅ Todos los índices creados exitosamente');

    await disconnectMongoDB();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al crear índices:', error);
    await disconnectMongoDB();
    process.exit(1);
  }
}

setupIndexes();

