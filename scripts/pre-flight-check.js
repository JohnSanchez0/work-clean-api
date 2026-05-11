/**
 * Script de validación pre-vuelo (Pre-flight Check)
 * Valida la integridad del sistema antes de iniciar o construir.
 */

const fs = require('fs');
const path = require('path');

// Códigos de colores ANSI (sin emojis)
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m"
};

const log = (msg) => console.log(`${colors.cyan}[CHECK]${colors.reset} ${msg}`);
const success = (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`);
const warn = (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`);
const error = (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`);

async function runChecks() {
  console.log(`\n${colors.bright}INICIANDO AUDITORIA DEL SISTEMA...${colors.reset}\n`);
  let hasErrors = false;

  // 1. Verificar variables de entorno
  log("Verificando configuración de entorno...");
  const hasEnvFile = fs.existsSync(path.join(__dirname, '../.env'));
  
  if (!hasEnvFile) {
    warn("Archivo .env no encontrado. Verificando variables inyectadas...");
  }

  // 2. Verificar dependencias
  log("Verificando node_modules...");
  if (!fs.existsSync(path.join(__dirname, '../node_modules'))) {
    error("Directorio node_modules no encontrado. Ejecuta 'pnpm install'.");
    hasErrors = true;
  } else {
    success("Dependencias instaladas.");
  }

  // 3. Cargar variables de entorno y validar con Joi
  try {
    log("Validando variables de entorno...");
    require('dotenv').config();
    const Joi = require('joi');
    
    const envSchema = Joi.object({
      MONGODB_URI: Joi.string().required(),
      JWT_SECRET: Joi.string().required(),
      MERCADOPAGO_ACCESS_TOKEN: Joi.string().required()
    }).unknown(true);

    const { error: envError } = envSchema.validate(process.env);
    if (envError) {
      error(`Variables de entorno inválidas: ${envError.message}`);
      hasErrors = true;
    } else {
      success("Variables de entorno válidas.");
    }
  } catch (err) {
    error(`Fallo al cargar validación de entorno: ${err.message}`);
    hasErrors = true;
  }

  // 4. Probar importación de modelos críticos
  log("Verificando integridad de modelos...");
  try {
    const { Trabajador, Cliente, Transaction } = require('../models');
    if (Trabajador && Cliente && Transaction) {
      success("Modelos críticos cargados correctamente.");
    }
  } catch (err) {
    error(`Error al cargar modelos: ${err.message}`);
    hasErrors = true;
  }

  // 5. Verificar conexión a MongoDB (Opcional en pre-build)
  log("Verificando conexión a MongoDB...");
  try {
    const { connectMongoDB, client } = require('../config/mongodb');
    const connected = await connectMongoDB(1, 500); // 1 intento rápido
    if (connected) {
      success("Conexión a MongoDB exitosa.");
    } else {
      warn("No se pudo conectar a MongoDB. Verifica tu conexión a internet e IP en Atlas.");
    }
  } catch (err) {
    warn(`No se pudo verificar la base de datos: ${err.message}`);
  }

  console.log("\n------------------------------------------------------------");
  if (hasErrors) {
    console.log(`${colors.red}${colors.bright}AUDITORIA FALLIDA: Corrige los errores antes de continuar.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}AUDITORIA EXITOSA: El sistema está listo.${colors.reset}`);
    process.exit(0);
  }
}

runChecks();
