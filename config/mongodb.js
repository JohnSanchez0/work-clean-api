const { MongoClient, ServerApiVersion } = require('mongodb');
const Logger = require('../utils/logger');
require('dotenv').config();

let uri = process.env.MONGODB_URI;

if (!uri) {
  const user = process.env.MONGODB_USER || 'johnssanchez_db_user';
  const password = process.env.MONGODB_PASSWORD;
  const cluster = process.env.MONGODB_CLUSTER || 'monguito';

  if (!password) {
    Logger.warn('MONGODB_PASSWORD no definida en variables de entorno');
  }

  const host = cluster.includes('.') ? cluster : `${cluster}.sotmn4a.mongodb.net`;
  const dbName = process.env.DB_NAME;
  uri = `mongodb+srv://${user}:${password}@${host}/${dbName}?retryWrites=true&w=majority`;
}

const clientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
  retryReads: true,
};

const client = new MongoClient(uri, clientOptions);

let isConnected = false;

async function connectMongoDB(retries = 3, delay = 2000) {
  if (isConnected) return true;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) Logger.info(`Reintentando conexión a MongoDB (${attempt}/${retries})...`);

      await client.connect();
      await client.db("admin").command({ ping: 1 });

      isConnected = true;
      return true;
    } catch (error) {
      isConnected = false;
      Logger.error(`Fallo de conexión a MongoDB (intento ${attempt}):`, error.message);

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

async function disconnectMongoDB() {
  try {
    await client.close();
    isConnected = false;
    Logger.info('Conexión a MongoDB cerrada');
  } catch (error) {
    Logger.error('Error al cerrar MongoDB', error.message);
  }
}

function isMongoConnected() {
  return isConnected;
}

module.exports = {
  client,
  connectMongoDB,
  disconnectMongoDB,
  isMongoConnected
};
