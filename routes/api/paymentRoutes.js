const express = require('express');
const router = express.Router();
const { PaymentController } = require('../../controllers/Payment');
const { authenticateToken } = require('../../middleware/auth');

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

// Crear preferencia de pago para recarga de saldo
router.post('/recargar-saldo', PaymentController.crearPreferenciaRecarga);

// Obtener saldo del trabajador
router.get('/saldo', PaymentController.obtenerSaldo);

// Obtener historial de transacciones
router.get('/historial', PaymentController.obtenerHistorial);

// Obtener estado de una transacción específica
router.get('/transaccion/:transactionId', PaymentController.obtenerEstadoTransaccion);

module.exports = router;
