const { Transaction } = require('../../models');

class WebhookController {
  /**
   * Manejar webhook de Mercado Pago
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async manejarWebhook(req, res) {
    try {
      const { type, data, action } = req.body;
      const queryParams = req.query;

      console.log('Webhook recibido:', { type, data, action, queryParams });
      console.log('Body completo:', JSON.stringify(req.body, null, 2));

      // Manejar diferentes formatos de webhook de MercadoPago
      let paymentId = null;
      let eventType = type;

      // Formato 1: { type: 'payment', data: { id: '123' } } (v1.0)
      if (type === 'payment' && data && data.id) {
        paymentId = data.id;
        eventType = 'payment';
      }
      // Formato 2: { action: 'payment.created', data: { id: '123' } } (v1.0)
      else if (action && action.includes('payment') && data && data.id) {
        paymentId = data.id;
        eventType = 'payment';
      }
      // Formato 3: query params con data.id (v1.0)
      else if (queryParams['data.id']) {
        paymentId = queryParams['data.id'];
        eventType = 'payment';
      }
      // Formato 4: query params con id y topic=payment (v2.0)
      else if (queryParams.id && queryParams.topic === 'payment') {
        paymentId = queryParams.id;
        eventType = 'payment';
      }
      // Formato 5: Body con resource (v2.0)
      else if (req.body.resource && queryParams.topic === 'payment') {
        paymentId = queryParams.id;
        eventType = 'payment';
      }

      console.log('Payment ID extraído:', paymentId);
      console.log('Event type:', eventType);

      // Solo procesar eventos de pago
      if (eventType !== 'payment' || !paymentId) {
        console.log('Evento no procesado - tipo:', eventType, 'paymentId:', paymentId);
        return res.status(200).json({ message: 'Evento no procesado' });
      }
      
      // Obtener información del pago desde Mercado Pago
      const paymentInfo = await WebhookController.obtenerInformacionPago(paymentId);
      
      if (!paymentInfo) {
        console.error('No se pudo obtener información del pago:', paymentId);
        return res.status(400).json({ message: 'Error al obtener información del pago' });
      }

      // Obtener el external_reference del pago
      const externalReference = paymentInfo.external_reference;
      
      console.log('External reference del pago:', externalReference);
      console.log('Payment info completa:', JSON.stringify(paymentInfo, null, 2));
      
      if (!externalReference) {
        console.error('No se encontró external_reference en el pago:', paymentId);
        return res.status(400).json({ message: 'No se encontró external_reference' });
      }
      
      // Buscar la transacción por external_reference (ID de nuestra transacción)
      let transaction = await Transaction.buscarPorId(externalReference);
      
      // Si no se encuentra por ID, intentar buscar por referencia (para casos de migración)
      if (!transaction) {
        console.log('No se encontró por ID, intentando buscar por referencia...');
        transaction = await Transaction.buscarPorReferencia(externalReference);
      }
      
      if (!transaction) {
        console.error('Transacción no encontrada para external_reference:', externalReference);
        return res.status(404).json({ message: 'Transacción no encontrada' });
      }

      // Verificar que la transacción esté pendiente
      if (transaction.estado !== 'pending') {
        console.log('Transacción ya procesada:', transaction.id, 'Estado actual:', transaction.estado);
        return res.status(200).json({ message: 'Transacción ya procesada' });
      }

      // Verificar si ya existe una transacción con este paymentId para evitar duplicados
      const existingTransactionByPaymentId = await Transaction.buscarPorReferencia(paymentId.toString());
      if (existingTransactionByPaymentId && existingTransactionByPaymentId.id !== transaction.id) {
        console.log('Pago ya procesado con paymentId:', paymentId, 'Transacción existente:', existingTransactionByPaymentId.id);
        return res.status(200).json({ message: 'Pago ya procesado' });
      }

      // Procesar según el estado del pago
      await WebhookController.procesarPago(transaction, paymentInfo);

      // Limpiar la marca de procesamiento
      const processingKey = `processing_${paymentId}`;
      if (req.app.locals[processingKey]) {
        delete req.app.locals[processingKey];
      }

      res.status(200).json({ message: 'Webhook procesado correctamente' });

    } catch (error) {
      console.error('Error al procesar webhook:', error);
      
      // Limpiar la marca de procesamiento en caso de error
      const { type, data, action } = req.body;
      const queryParams = req.query;
      let paymentId = null;
      
      if (type === 'payment' && data && data.id) {
        paymentId = data.id;
      } else if (action && action.includes('payment') && data && data.id) {
        paymentId = data.id;
      } else if (queryParams['data.id']) {
        paymentId = queryParams['data.id'];
      } else if (queryParams.id && queryParams.topic === 'payment') {
        paymentId = queryParams.id;
      } else if (req.body.resource && queryParams.topic === 'payment') {
        paymentId = queryParams.id;
      }
      
      if (paymentId) {
        const processingKey = `processing_${paymentId}`;
        if (req.app.locals[processingKey]) {
          delete req.app.locals[processingKey];
        }
      }
      
      res.status(500).json({ 
        message: 'Error interno del servidor',
        error: error.message 
      });
    }
  }

  /**
   * Obtener información del pago desde Mercado Pago
   * @param {string} paymentId - ID del pago
   * @returns {Promise<Object|null>} Información del pago
   */
  static async obtenerInformacionPago(paymentId) {
    try {
      const axios = require('axios');
      
      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error al obtener información del pago:', error);
      return null;
    }
  }

  /**
   * Procesar el pago según su estado
   * @param {Object} transaction - Transacción en la base de datos
   * @param {Object} paymentInfo - Información del pago de Mercado Pago
   */
  static async procesarPago(transaction, paymentInfo) {
    try {
      const { status, status_detail, transaction_amount, external_reference } = paymentInfo;

      let nuevoEstado = 'pending';
      let actualizarSaldo = false;

      // Determinar el nuevo estado según el status de Mercado Pago
      switch (status) {
        case 'approved':
          nuevoEstado = 'completed';
          actualizarSaldo = true;
          break;
        case 'rejected':
          nuevoEstado = 'failed';
          break;
        case 'cancelled':
          nuevoEstado = 'cancelled';
          break;
        case 'pending':
          nuevoEstado = 'pending';
          break;
        default:
          nuevoEstado = 'failed';
      }

      // Verificar si el estado ya es el correcto para evitar actualizaciones innecesarias
      if (transaction.estado === nuevoEstado) {
        console.log(`Transacción ${transaction.id} ya tiene el estado correcto: ${nuevoEstado}`);
        return;
      }

      // Actualizar la transacción
      await Transaction.actualizarEstado(
        transaction.id,
        nuevoEstado,
        {
          status: status,
          status_detail: status_detail,
          transaction_amount: transaction_amount,
          processed_at: new Date().toISOString()
        }
      );

      // Actualizar el campo referencia con el paymentId de MercadoPago (convertir a string)
      await Transaction.actualizarReferencia(transaction.id, paymentInfo.id.toString());

      // Si el pago fue aprobado, actualizar el saldo del trabajador
      if (actualizarSaldo) {
        // Verificar que no se haya actualizado el saldo previamente para este pago
        const saldoActualizado = await Transaction.verificarSaldoActualizado(transaction.id, paymentInfo.id.toString());
        if (!saldoActualizado) {
          await Transaction.actualizarSaldo(transaction.trabajadorId, parseFloat(transaction.monto));
          console.log(`Saldo actualizado para trabajador ${transaction.trabajadorId}: +$${transaction.monto}`);
        } else {
          console.log(`Saldo ya actualizado para transacción ${transaction.id} con paymentId ${paymentInfo.id}`);
        }
      }

      console.log(`Transacción ${transaction.id} actualizada a estado: ${nuevoEstado}`);

    } catch (error) {
      console.error('Error al procesar pago:', error);
      throw error;
    }
  }

  /**
   * Verificar webhook (opcional, para validar que viene de Mercado Pago)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next function
   */
  static verificarWebhook(req, res, next) {
    // En producción, deberías verificar la firma del webhook
    // Por ahora, solo pasamos al siguiente middleware
    next();
  }

  /**
   * Middleware para evitar procesamiento duplicado de webhooks
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next function
   */
  static async evitarDuplicados(req, res, next) {
    try {
      const { type, data, action } = req.body;
      const queryParams = req.query;

      // Extraer paymentId de la misma manera que en manejarWebhook
      let paymentId = null;
      let eventType = type;

      if (type === 'payment' && data && data.id) {
        paymentId = data.id;
        eventType = 'payment';
      } else if (action && action.includes('payment') && data && data.id) {
        paymentId = data.id;
        eventType = 'payment';
      } else if (queryParams['data.id']) {
        paymentId = queryParams['data.id'];
        eventType = 'payment';
      } else if (queryParams.id && queryParams.topic === 'payment') {
        paymentId = queryParams.id;
        eventType = 'payment';
      } else if (req.body.resource && queryParams.topic === 'payment') {
        paymentId = queryParams.id;
        eventType = 'payment';
      }

      // Solo verificar duplicados para eventos de pago
      if (eventType === 'payment' && paymentId) {
        // Verificar si ya existe una transacción procesada con este paymentId
        const webhookYaProcesado = await Transaction.verificarWebhookProcesado(paymentId.toString());
        if (webhookYaProcesado) {
          console.log('Webhook duplicado detectado para paymentId:', paymentId);
          return res.status(200).json({ message: 'Webhook ya procesado' });
        }

        // También verificar si ya hay una transacción en proceso para este paymentId
        // usando una clave temporal en el request para evitar procesamiento simultáneo
        const processingKey = `processing_${paymentId}`;
        if (req.app.locals[processingKey]) {
          console.log('Webhook ya en proceso para paymentId:', paymentId);
          return res.status(200).json({ message: 'Webhook ya en proceso' });
        }
        
        // Marcar como en proceso
        req.app.locals[processingKey] = true;
        
        // Limpiar la marca después de 30 segundos
        setTimeout(() => {
          delete req.app.locals[processingKey];
        }, 30000);
      }

      next();
    } catch (error) {
      console.error('Error en middleware evitarDuplicados:', error);
      next();
    }
  }
}

module.exports = WebhookController;
