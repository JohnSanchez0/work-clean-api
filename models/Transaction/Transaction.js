const { client } = require('../../config/mongodb');
const { ObjectId } = require('mongodb');
const TrabajadorMongo = require('../Trabajador/TrabajadorMongo');

// Nombre de la base de datos y colección
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'transacciones';

class Transaction {
  /**
   * Obtener la colección de transacciones
   * @returns {Promise<Collection>} Colección de MongoDB
   */
  static async getCollection() {
    if (!client) {
      throw new Error('Cliente de MongoDB no inicializado');
    }
    const db = client.db(DB_NAME);
    return db.collection(COLLECTION_NAME);
  }

  /**
   * Crear una nueva transacción
   * @param {Object} transactionData - Datos de la transacción
   * @returns {Promise<Object>} Transacción creada
   */
  static async crear(transactionData) {
    try {
      const { trabajadorId } = transactionData;

      // Crear documento de la transacción
      const transactionDocument = {
        ...transactionData,
        estado: transactionData.estado || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = await this.getCollection();
      const result = await collection.insertOne(transactionDocument);

      // Retornar la transacción creada enriquecida
      return await this.buscarPorId(result.insertedId.toString());
    } catch (error) {
      throw new Error(`Error al crear transacción: ${error.message}`);
    }
  }

  /**
   * Buscar transacción por ID
   * @param {string} id - ID de la transacción
   * @returns {Promise<Object|null>} Transacción encontrada o null
   */
  static async buscarPorId(id) {
    try {
      const collection = await this.getCollection();
      const transaction = await collection.findOne({ _id: new ObjectId(id) });

      if (!transaction) return null;

      // Enriquecer con datos del trabajador
      const trabajador = await TrabajadorMongo.buscarPorId(transaction.trabajadorId).catch(() => null);

      return this.formatTransaction(transaction, trabajador);
    } catch (error) {
      throw new Error(`Error al buscar transacción: ${error.message}`);
    }
  }

  /**
   * Buscar transacción por referencia (ID de Mercado Pago)
   * @param {string} referencia - Referencia de la transacción
   * @returns {Promise<Object|null>} Transacción encontrada o null
   */
  static async buscarPorReferencia(referencia) {
    try {
      const collection = await this.getCollection();
      const transaction = await collection.findOne({ referencia });

      if (!transaction) return null;

      const trabajador = await TrabajadorMongo.buscarPorId(transaction.trabajadorId).catch(() => null);
      return this.formatTransaction(transaction, trabajador);
    } catch (error) {
      throw new Error(`Error al buscar transacción por referencia: ${error.message}`);
    }
  }

  /**
   * Obtener transacciones de un trabajador
   * @param {string} trabajadorId - ID del trabajador
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} Lista de transacciones
   */
  static async obtenerPorTrabajador(trabajadorId, options = {}) {
    try {
      const { page = 1, limit = 10, tipo } = options;
      const skip = (page - 1) * limit;

      const filter = { trabajadorId };
      if (tipo) {
        filter.tipo = tipo;
      }

      const collection = await this.getCollection();
      const [transacciones, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      // Enriquecer transacciones con datos del trabajador (opcional, para ser consistente con Prisma)
      const trabajador = await TrabajadorMongo.buscarPorId(trabajadorId).catch(() => null);
      const transaccionesFormateadas = transacciones.map(t => this.formatTransaction(t, trabajador));

      return {
        transacciones: transaccionesFormateadas,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener transacciones: ${error.message}`);
    }
  }

  /**
   * Actualizar estado de transacción
   * @param {string} id - ID de la transacción
   * @param {string} estado - Nuevo estado
   * @param {Object} metadata - Metadatos adicionales
   * @returns {Promise<Object>} Transacción actualizada
   */
  static async actualizarEstado(id, estado, metadata = null) {
    try {
      const updateData = {
        estado,
        updatedAt: new Date()
      };
      if (metadata) {
        updateData.metadata = metadata;
      }

      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Transacción no encontrada');
      }

      return await this.buscarPorId(id);
    } catch (error) {
      throw new Error(`Error al actualizar estado de transacción: ${error.message}`);
    }
  }

  /**
   * Actualizar referencia de la transacción
   * @param {string} id - ID de la transacción
   * @param {string} referencia - Nueva referencia (paymentId de MercadoPago)
   * @returns {Promise<Object>} Transacción actualizada
   */
  static async actualizarReferencia(id, referencia) {
    try {
      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { referencia, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Transacción no encontrada');
      }

      return await this.buscarPorId(id);
    } catch (error) {
      throw new Error(`Error al actualizar referencia: ${error.message}`);
    }
  }

  /**
   * Actualizar saldo del trabajador
   * @param {string} trabajadorId - ID del trabajador
   * @param {number} monto - Monto a agregar (positivo) o restar (negativo)
   * @returns {Promise<Object>} Trabajador actualizado
   */
  static async actualizarSaldo(trabajadorId, monto) {
    try {
      const collection = await TrabajadorMongo.getCollection();

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(trabajadorId) },
        {
          $inc: { saldo: monto },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Trabajador no encontrado');
      }

      return TrabajadorMongo.formatTrabajador(result.value);
    } catch (error) {
      throw new Error(`Error al actualizar saldo: ${error.message}`);
    }
  }

  /**
   * Verificar si el saldo ya fue actualizado para una transacción específica
   * @param {string} transactionId - ID de la transacción
   * @param {string} paymentId - ID del pago de MercadoPago
   * @returns {Promise<boolean>} True si ya fue actualizado, false si no
   */
  static async verificarSaldoActualizado(transactionId, paymentId) {
    try {
      const collection = await this.getCollection();

      // Buscar si existe una transacción con el mismo paymentId y estado completed
      const existingTransaction = await collection.findOne({
        referencia: paymentId,
        estado: 'completed',
        _id: { $ne: new ObjectId(transactionId) }
      });

      return !!existingTransaction;
    } catch (error) {
      console.error('Error al verificar saldo actualizado:', error);
      return false;
    }
  }

  /**
   * Verificar si un webhook ya fue procesado
   * @param {string} paymentId - ID del pago de MercadoPago
   * @returns {Promise<boolean>} True si ya fue procesado, false si no
   */
  static async verificarWebhookProcesado(paymentId) {
    try {
      const collection = await this.getCollection();

      // Buscar si existe una transacción con este paymentId y estado completed
      const existingTransaction = await collection.findOne({
        referencia: paymentId,
        estado: 'completed'
      });

      return !!existingTransaction;
    } catch (error) {
      console.error('Error al verificar webhook procesado:', error);
      return false;
    }
  }

  /**
   * Formatear transacción para la respuesta
   */
  static formatTransaction(transaction, trabajador = null) {
    if (!transaction) return null;

    const formatted = {
      id: transaction._id.toString(),
      trabajadorId: transaction.trabajadorId,
      tipo: transaction.tipo,
      monto: transaction.monto,
      estado: transaction.estado,
      referencia: transaction.referencia,
      descripcion: transaction.descripcion,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };

    if (trabajador) formatted.trabajador = trabajador;

    return formatted;
  }
}

module.exports = Transaction;
