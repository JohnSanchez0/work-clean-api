const { preference } = require('../../config/mercadopago');
const { Transaction, Trabajador } = require('../../models');

class PaymentController {
  /**
   * Crear preferencia de pago para recarga de saldo
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async crearPreferenciaRecarga(req, res) {
    try {
      const { monto } = req.body;
      const trabajadorId = req.user.trabajadorId;

      // Validar monto
      if (!monto || monto <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser mayor a 0'
        });
      }

      // Validar monto mínimo y máximo
      if (monto < 10000) {
        return res.status(400).json({
          success: false,
          message: 'El monto mínimo de recarga es $10,000 COP'
        });
      }

      if (monto > 1000000) {
        return res.status(400).json({
          success: false,
          message: 'El monto máximo de recarga es $1,000,000 COP'
        });
      }

      // Verificar que el trabajador existe
      const trabajador = await Trabajador.buscarPorId(trabajadorId);
      if (!trabajador) {
        return res.status(404).json({
          success: false,
          message: 'Trabajador no encontrado'
        });
      }

      // Crear transacción pendiente
      const transaction = await Transaction.crear({
        trabajadorId,
        tipo: 'recarga',
        monto: monto,
        estado: 'pending',
        descripcion: `Recarga de saldo por $${monto}`
      });

       // Crear preferencia de pago
       const preferenceData = {
         items: [
           {
             title: 'Recarga de Saldo FaWorKi',
             quantity: 1,
             unit_price: parseFloat(monto),
             currency_id: 'COP' // Pesos colombianos
           }
         ],
         // Configuración específica para Colombia
         site_id: 'MCO', // Colombia
        payer: {
          name: trabajador.nombre,
          surname: trabajador.apellido1,
          email: trabajador.email
        },
        back_urls: {
          success: `https://faworki.vercel.app/worker/success?transaction_id=${transaction.id}`,
          failure: `https://faworki.vercel.app/worker/failure?transaction_id=${transaction.id}`,
          pending: `https://faworki.vercel.app/worker/pending?transaction_id=${transaction.id}`
        },
        auto_return: 'approved',
        external_reference: transaction.id,
        notification_url: `${process.env.BACKEND_URL}/api/webhooks/mercadopago`
      };

      const response = await preference.create({ body: preferenceData });

      res.json({
        success: true,
        data: {
          preference_id: response.id,
          init_point: response.init_point,
          transaction_id: transaction.id
        }
      });

    } catch (error) {
      console.error('Error al crear preferencia de recarga:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener saldo del trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerSaldo(req, res) {
    try {
      const trabajadorId = req.user.trabajadorId;

      const trabajador = await Trabajador.buscarPorId(trabajadorId);
      if (!trabajador) {
        return res.status(404).json({
          success: false,
          message: 'Trabajador no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          saldo: parseFloat(trabajador.saldo),
          trabajador: {
            id: trabajador.id,
            nombre: trabajador.nombre,
            apellido: trabajador.apellido1
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener saldo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener historial de transacciones del trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerHistorial(req, res) {
    try {
      const trabajadorId = req.user.trabajadorId;
      const { page = 1, limit = 10, tipo } = req.query;

      const result = await Transaction.obtenerPorTrabajador(trabajadorId, {
        page: parseInt(page),
        limit: parseInt(limit),
        tipo
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estado de una transacción específica
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerEstadoTransaccion(req, res) {
    try {
      const { transactionId } = req.params;
      const trabajadorId = req.user.trabajadorId;

      const transaction = await Transaction.buscarPorId(transactionId);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transacción no encontrada'
        });
      }

      // Verificar que la transacción pertenece al trabajador
      if (transaction.trabajadorId !== trabajadorId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta transacción'
        });
      }

      res.json({
        success: true,
        data: {
          id: transaction.id,
          tipo: transaction.tipo,
          monto: parseFloat(transaction.monto),
          estado: transaction.estado,
          descripcion: transaction.descripcion,
          referencia: transaction.referencia,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      });

    } catch (error) {
      console.error('Error al obtener estado de transacción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = PaymentController;
