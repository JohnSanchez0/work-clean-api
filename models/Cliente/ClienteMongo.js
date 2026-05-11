const { client } = require('../../config/mongodb');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

// Nombre de la base de datos y colección
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'clientes';

class ClienteMongo {
  /**
   * Obtener la colección de clientes
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
   * Crear un nuevo cliente en MongoDB
   * @param {Object} clienteData - Datos del cliente (incluye datos del usuario)
   * @returns {Promise<Object>} Cliente creado
   */
  static async crear(clienteData) {
    try {
      const {
        email,
        password,
        nombre,
        apellido1,
        apellido2,
        telefono,
        tipoDocumento,
        numeroDocumento
      } = clienteData;

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear documento del cliente
      const clienteDocument = {
        // Datos del usuario
        email,
        password: hashedPassword,
        nombre,
        apellido1,
        apellido2: apellido2 || null,
        telefono,
        tipoDocumento,
        numeroDocumento,
        // Datos del cliente
        estado: 'active',
        ultimoAcceso: null,
        // Metadatos
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = await this.getCollection();
      const result = await collection.insertOne(clienteDocument);

      // Retornar el documento creado
      const clienteCreado = await collection.findOne({ _id: result.insertedId });

      return this.formatCliente(clienteCreado);
    } catch (error) {
      throw new Error(`Error al crear cliente: ${error.message}`);
    }
  }

  /**
   * Buscar cliente por ID
   * @param {string} id - ID del cliente (ObjectId de MongoDB)
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async buscarPorId(id) {
    try {
      if (!id) {
        throw new Error('ID es requerido');
      }

      const collection = await this.getCollection();
      let objectId;

      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        throw new Error(`ID inválido: ${id} - ${error.message}`);
      }

      const cliente = await collection.findOne({ _id: objectId });

      return cliente ? this.formatCliente(cliente) : null;
    } catch (error) {
      console.error('Error en buscarPorId:', error);
      throw new Error(`Error al buscar cliente: ${error.message}`);
    }
  }

  /**
   * Buscar cliente por email
   * @param {string} email - Email del cliente
   * @param {boolean} incluirPassword - Si es true, incluye el password en la respuesta (para login)
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async buscarPorEmail(email, incluirPassword = false) {
    try {
      const collection = await this.getCollection();
      const cliente = await collection.findOne({ email });

      if (!cliente) return null;

      // Si se necesita el password (para login), retornar sin formatear
      if (incluirPassword) {
        return {
          id: cliente._id.toString(),
          ...cliente,
          _id: cliente._id.toString()
        };
      }

      return this.formatCliente(cliente);
    } catch (error) {
      throw new Error(`Error al buscar cliente por email: ${error.message}`);
    }
  }

  /**
   * Buscar cliente por número de documento
   * @param {string} numeroDocumento - Número de documento
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async buscarPorDocumento(numeroDocumento) {
    try {
      const collection = await this.getCollection();
      const cliente = await collection.findOne({ numeroDocumento });

      return cliente ? this.formatCliente(cliente) : null;
    } catch (error) {
      throw new Error(`Error al buscar cliente por documento: ${error.message}`);
    }
  }

  /**
   * Buscar cliente por ID de usuario (en MongoDB, el userId del JWT es el id del cliente)
   * @param {string} usuarioId - ID del usuario (que es el ID del cliente en MongoDB)
   * @returns {Promise<Object|null>} Cliente encontrado o null
   */
  static async buscarPorUsuarioId(usuarioId) {
    try {
      console.log('ClienteMongo.buscarPorUsuarioId - Buscando cliente con usuarioId:', usuarioId);
      // En MongoDB, el usuarioId del JWT es el id del cliente
      const cliente = await this.buscarPorId(usuarioId);
      console.log('ClienteMongo.buscarPorUsuarioId - Cliente encontrado:', cliente ? 'Sí' : 'No');
      return cliente;
    } catch (error) {
      console.error('Error en buscarPorUsuarioId:', error);
      throw new Error(`Error al buscar cliente por usuarioId: ${error.message}`);
    }
  }

  /**
   * Verificar si el email ya existe
   * @param {string} email - Email a verificar
   * @returns {Promise<boolean>} True si existe, false si no
   */
  static async emailExiste(email) {
    try {
      const collection = await this.getCollection();
      const cliente = await collection.findOne(
        { email },
        { projection: { _id: 1 } }
      );

      return !!cliente;
    } catch (error) {
      throw new Error(`Error al verificar email: ${error.message}`);
    }
  }

  /**
   * Verificar si un usuario es cliente (en MongoDB, el userId del JWT es el id del cliente)
   * @param {string} usuarioId - ID del usuario (que es el ID del cliente en MongoDB)
   * @returns {Promise<boolean>} True si es cliente, false si no
   */
  static async esCliente(usuarioId) {
    try {
      const cliente = await this.buscarPorId(usuarioId);
      return !!cliente;
    } catch (error) {
      throw new Error(`Error al verificar cliente: ${error.message}`);
    }
  }

  /**
   * Verificar si el número de documento ya existe
   * @param {string} numeroDocumento - Número de documento a verificar
   * @returns {Promise<boolean>} True si existe, false si no
   */
  static async documentoExiste(numeroDocumento) {
    try {
      const collection = await this.getCollection();
      const cliente = await collection.findOne(
        { numeroDocumento },
        { projection: { _id: 1 } }
      );

      return !!cliente;
    } catch (error) {
      throw new Error(`Error al verificar documento: ${error.message}`);
    }
  }

  /**
   * Obtener todos los clientes con paginación
   * @param {Object} options - Opciones de paginación y filtros
   * @returns {Promise<Object>} Lista de clientes con paginación
   */
  static async obtenerTodos(options = {}) {
    try {
      const { page = 1, limit = 10, estado } = options;
      const skip = (page - 1) * limit;

      const collection = await this.getCollection();

      // Construir filtro
      const filter = {};
      if (estado) {
        filter.estado = estado;
      }

      // Obtener clientes y total
      const [clientes, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        clientes: clientes.map(cliente => this.formatCliente(cliente)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener clientes: ${error.message}`);
    }
  }

  /**
   * Actualizar cliente
   * @param {string} id - ID del cliente
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async actualizar(id, updateData) {
    try {
      const collection = await this.getCollection();

      // Si se está actualizando la contraseña, encriptarla
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      // Agregar updatedAt
      updateData.updatedAt = new Date();

      // Convertir ID a ObjectId (puede venir como string o ObjectId)
      let objectId;
      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        throw new Error('ID de cliente inválido');
      }

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Cliente no encontrado');
      }

      return this.formatCliente(result.value);
    } catch (error) {
      throw new Error(`Error al actualizar cliente: ${error.message}`);
    }
  }

  /**
   * Actualizar último acceso del cliente
   * @param {string} id - ID del cliente
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async actualizarUltimoAcceso(id) {
    try {
      return await this.actualizar(id, {
        ultimoAcceso: new Date()
      });
    } catch (error) {
      throw new Error(`Error al actualizar último acceso: ${error.message}`);
    }
  }

  /**
   * Cambiar estado del cliente
   * @param {string} id - ID del cliente
   * @param {string} estado - Nuevo estado (active, inactive, suspended)
   * @returns {Promise<Object>} Cliente actualizado
   */
  static async cambiarEstado(id, estado) {
    try {
      return await this.actualizar(id, { estado });
    } catch (error) {
      throw new Error(`Error al cambiar estado del cliente: ${error.message}`);
    }
  }

  /**
   * Eliminar cliente
   * @param {string} id - ID del cliente
   * @returns {Promise<Object>} Cliente eliminado
   */
  static async eliminar(id) {
    try {
      const collection = await this.getCollection();
      const cliente = await collection.findOneAndDelete({ _id: new ObjectId(id) });

      if (!cliente.value) {
        throw new Error('Cliente no encontrado');
      }

      return this.formatCliente(cliente.value);
    } catch (error) {
      throw new Error(`Error al eliminar cliente: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de clientes
   * @returns {Promise<Object>} Estadísticas de clientes
   */
  static async obtenerEstadisticas() {
    try {
      const collection = await this.getCollection();

      const [total, activos, inactivos, suspendidos] = await Promise.all([
        collection.countDocuments({}),
        collection.countDocuments({ estado: 'active' }),
        collection.countDocuments({ estado: 'inactive' }),
        collection.countDocuments({ estado: 'suspended' })
      ]);

      console.log('Conteo de clientes en MongoDB:', {
        total,
        activos,
        inactivos,
        suspendidos
      });

      return {
        total,
        activos,
        inactivos,
        suspendidos
      };
    } catch (error) {
      console.error('Error en obtenerEstadisticas de ClienteMongo:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Formatear cliente para la respuesta (ocultar password)
   * @param {Object} cliente - Documento de MongoDB
   * @returns {Object} Cliente formateado
   */
  static formatCliente(cliente) {
    if (!cliente) return null;

    const { password, ...clienteFormateado } = cliente;
    return {
      id: cliente._id.toString(),
      ...clienteFormateado,
      _id: cliente._id.toString()
    };
  }

  /**
   * Verificar contraseña
   * @param {string} password - Contraseña en texto plano
   * @param {string} hashedPassword - Contraseña encriptada
   * @returns {Promise<boolean>} True si coincide, false si no
   */
  static async verificarPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error(`Error al verificar contraseña: ${error.message}`);
    }
  }
}

module.exports = ClienteMongo;

