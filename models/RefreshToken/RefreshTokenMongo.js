const { client } = require('../../config/mongodb');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

// Nombre de la base de datos y colección
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'refresh_tokens';

class RefreshTokenMongo {
  /**
   * Obtener la colección de refresh tokens
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
   * Crear un nuevo refresh token
   * @param {string} userId - ID del usuario (puede ser de MongoDB o PostgreSQL)
   * @param {string} userAgent - User agent del cliente
   * @param {string} ipAddress - Dirección IP del cliente
   * @returns {Promise<Object>} Refresh token creado
   */
  static async crear(userId, userAgent = '', ipAddress = '') {
    try {
      // Generar token único
      const token = crypto.randomBytes(64).toString('hex');

      // Fecha de expiración (30 días)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const refreshTokenDocument = {
        token,
        userId,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        expiresAt,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = await this.getCollection();
      const result = await collection.insertOne(refreshTokenDocument);

      return {
        id: result.insertedId.toString(),
        ...refreshTokenDocument,
        _id: result.insertedId
      };
    } catch (error) {
      throw new Error(`Error al crear refresh token: ${error.message}`);
    }
  }

  /**
   * Buscar refresh token por token
   * @param {string} token - Token a buscar
   * @returns {Promise<Object|null>} Refresh token encontrado o null
   */
  static async buscarPorToken(token) {
    try {
      const collection = await this.getCollection();
      const refreshToken = await collection.findOne({ token });

      if (!refreshToken) return null;

      return {
        id: refreshToken._id.toString(),
        token: refreshToken.token,
        userId: refreshToken.userId,
        userAgent: refreshToken.userAgent || null,
        ipAddress: refreshToken.ipAddress || null,
        expiresAt: refreshToken.expiresAt,
        isActive: refreshToken.isActive,
        createdAt: refreshToken.createdAt,
        updatedAt: refreshToken.updatedAt
      };
    } catch (error) {
      throw new Error(`Error al buscar refresh token: ${error.message}`);
    }
  }

  /**
   * Verificar si el refresh token es válido
   * @param {string} token - Token a verificar
   * @returns {Promise<boolean>} True si es válido, false si no
   */
  static async esValido(token) {
    try {
      const refreshToken = await this.buscarPorToken(token);

      if (!refreshToken) return false;
      if (!refreshToken.isActive) return false;
      if (refreshToken.expiresAt < new Date()) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revocar refresh token
   * @param {string} token - Token a revocar
   * @returns {Promise<Object>} Token revocado
   */
  static async revocar(token) {
    try {
      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        { token },
        {
          $set: {
            isActive: false,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Refresh token no encontrado');
      }

      return {
        id: result.value._id.toString(),
        ...result.value
      };
    } catch (error) {
      throw new Error(`Error al revocar refresh token: ${error.message}`);
    }
  }

  /**
   * Revocar todos los refresh tokens de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} Número de tokens revocados
   */
  static async revocarTodosDelUsuario(userId) {
    try {
      const collection = await this.getCollection();
      const result = await collection.updateMany(
        {
          userId,
          isActive: true
        },
        {
          $set: {
            isActive: false,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Error al revocar refresh tokens del usuario: ${error.message}`);
    }
  }

  /**
   * Limpiar refresh tokens expirados
   * @returns {Promise<number>} Número de tokens eliminados
   */
  static async limpiarExpirados() {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false }
        ]
      });

      return result.deletedCount;
    } catch (error) {
      throw new Error(`Error al limpiar refresh tokens expirados: ${error.message}`);
    }
  }

  /**
   * Limpiar refresh tokens expirados e inactivos de un usuario específico
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} Número de tokens eliminados
   */
  static async limpiarTokensDelUsuario(userId) {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteMany({
        userId,
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false }
        ]
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Limpiados ${result.deletedCount} refresh tokens del usuario ${userId}`);
      }

      return result.deletedCount;
    } catch (error) {
      console.error('Error al limpiar tokens del usuario:', error);
      return 0;
    }
  }

  /**
   * Obtener refresh tokens activos de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de refresh tokens activos
   */
  static async obtenerActivosDelUsuario(userId) {
    try {
      const collection = await this.getCollection();
      const refreshTokens = await collection.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 }).toArray();

      return refreshTokens.map(token => ({
        id: token._id.toString(),
        ...token
      }));
    } catch (error) {
      throw new Error(`Error al obtener refresh tokens del usuario: ${error.message}`);
    }
  }

  /**
   * Rotar refresh token (revocar el actual y crear uno nuevo)
   * @param {string} oldToken - Token actual a revocar
   * @param {string} userId - ID del usuario
   * @param {string} userAgent - User agent del cliente
   * @param {string} ipAddress - Dirección IP del cliente
   * @returns {Promise<Object>} Nuevo refresh token
   */
  static async rotarToken(oldToken, userId, userAgent = '', ipAddress = '') {
    try {
      // Revocar el token actual
      await this.revocar(oldToken);

      // Crear nuevo token
      const nuevoToken = await this.crear(userId, userAgent, ipAddress);

      return nuevoToken;
    } catch (error) {
      throw new Error(`Error al rotar refresh token: ${error.message}`);
    }
  }

  /**
   * Verificar si un usuario tiene sesiones activas
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Información sobre sesiones activas
   */
  static async verificarSesionesActivas(userId) {
    try {
      const collection = await this.getCollection();
      const tokensActivos = await collection.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 }).toArray();

      return {
        tieneSesiones: tokensActivos.length > 0,
        cantidadSesiones: tokensActivos.length,
        ultimaSesion: tokensActivos.length > 0 ? tokensActivos[0].createdAt : null,
        tokens: tokensActivos.map(token => ({
          id: token._id.toString(),
          ...token
        }))
      };
    } catch (error) {
      throw new Error(`Error al verificar sesiones activas: ${error.message}`);
    }
  }

  /**
   * Revocar todas las sesiones activas de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} Número de sesiones revocadas
   */
  static async revocarTodasLasSesiones(userId) {
    try {
      const collection = await this.getCollection();
      const result = await collection.updateMany(
        {
          userId,
          isActive: true
        },
        {
          $set: {
            isActive: false,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Error al revocar todas las sesiones: ${error.message}`);
    }
  }
}

module.exports = RefreshTokenMongo;

