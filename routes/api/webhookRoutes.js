const express = require('express');
const router = express.Router();
const { WebhookController } = require('../../controllers/Payment');

// Webhook de Mercado Pago (no requiere autenticación)
router.post('/mercadopago', 
  WebhookController.verificarWebhook,
  WebhookController.evitarDuplicados,
  WebhookController.manejarWebhook
);

module.exports = router;
