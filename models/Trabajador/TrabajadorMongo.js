const { client } = require('../../config/mongodb');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

// Nombre de la base de datos y colección
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'trabajadores';

class TrabajadorMongo {
  /**
   * Obtener la colección de trabajadores
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
   * Crear un nuevo trabajador en MongoDB
   * @param {Object} trabajadorData - Datos del trabajador (incluye datos del usuario y certificados)
   * @returns {Promise<Object>} Trabajador creado
   */
  static async crear(trabajadorData) {
    try {
      const {
        email,
        password,
        nombre,
        apellido1,
        apellido2,
        telefono,
        tipoDocumento,
        numeroDocumento,
        certificados = []
      } = trabajadorData;

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear documento del trabajador
      const trabajadorDocument = {
        // Datos del usuario
        email,
        password: hashedPassword,
        nombre,
        apellido1,
        apellido2: apellido2 || null,
        telefono,
        tipoDocumento,
        numeroDocumento,
        // Datos del trabajador
        estado: 'pending', // pending, approved, rejected
        saldo: 0,
        certificados: certificados.map(cert => ({
          nombreArchivo: cert.nombreArchivo,
          archivoUrl: cert.archivoUrl,
          publicId: cert.publicId || null,
          createdAt: new Date()
        })),
        ultimoAcceso: null,
        // Metadatos
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = await this.getCollection();
      const result = await collection.insertOne(trabajadorDocument);

      // Retornar el documento creado
      const trabajadorCreado = await collection.findOne({ _id: result.insertedId });
      
      return this.formatTrabajador(trabajadorCreado);
    } catch (error) {
      throw new Error(`Error al crear trabajador: ${error.message}`);
    }
  }

  /**
   * Buscar trabajador por ID
   * @param {string} id - ID del trabajador (ObjectId de MongoDB)
   * @returns {Promise<Object|null>} Trabajador encontrado o null
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

      const trabajador = await collection.findOne({ _id: objectId });
      
      return trabajador ? this.formatTrabajador(trabajador) : null;
    } catch (error) {
      console.error('Error en buscarPorId:', error);
      throw new Error(`Error al buscar trabajador: ${error.message}`);
    }
  }

  /**
   * Buscar trabajador por email
   * @param {string} email - Email del trabajador
   * @param {boolean} incluirPassword - Si es true, incluye el password en la respuesta (para login)
   * @returns {Promise<Object|null>} Trabajador encontrado o null
   */
  static async buscarPorEmail(email, incluirPassword = false) {
    try {
      const collection = await this.getCollection();
      const trabajador = await collection.findOne({ email });
      
      if (!trabajador) return null;
      
      // Si se necesita el password (para login), retornar sin formatear
      if (incluirPassword) {
        return {
          id: trabajador._id.toString(),
          ...trabajador,
          _id: trabajador._id.toString()
        };
      }
      
      return this.formatTrabajador(trabajador);
    } catch (error) {
      throw new Error(`Error al buscar trabajador por email: ${error.message}`);
    }
  }

  /**
   * Buscar trabajador por número de documento
   * @param {string} numeroDocumento - Número de documento
   * @returns {Promise<Object|null>} Trabajador encontrado o null
   */
  static async buscarPorDocumento(numeroDocumento) {
    try {
      const collection = await this.getCollection();
      const trabajador = await collection.findOne({ numeroDocumento });
      
      return trabajador ? this.formatTrabajador(trabajador) : null;
    } catch (error) {
      throw new Error(`Error al buscar trabajador por documento: ${error.message}`);
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
      const trabajador = await collection.findOne(
        { email },
        { projection: { _id: 1 } }
      );
      
      return !!trabajador;
    } catch (error) {
      throw new Error(`Error al verificar email: ${error.message}`);
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
      const trabajador = await collection.findOne(
        { numeroDocumento },
        { projection: { _id: 1 } }
      );
      
      return !!trabajador;
    } catch (error) {
      throw new Error(`Error al verificar documento: ${error.message}`);
    }
  }

  /**
   * Obtener todos los trabajadores con paginación
   * @param {Object} options - Opciones de paginación y filtros
   * @returns {Promise<Object>} Lista de trabajadores con paginación
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

      // Obtener trabajadores y total
      const [trabajadores, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        trabajadores: trabajadores.map(trabajador => this.formatTrabajador(trabajador)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener trabajadores: ${error.message}`);
    }
  }

  /**
   * Actualizar trabajador
   * @param {string} id - ID del trabajador
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Trabajador actualizado
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

      // Convertir ID a ObjectId
      let objectId;
      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        throw new Error('ID de trabajador inválido');
      }

      // Primero verificar que el trabajador existe
      const trabajadorExistente = await collection.findOne({ _id: objectId });
      if (!trabajadorExistente) {
        throw new Error('Trabajador no encontrado');
      }

      // Actualizar el documento
      const updateResult = await collection.updateOne(
        { _id: objectId },
        { $set: updateData }
      );

      // Verificar que se actualizó correctamente
      if (updateResult.matchedCount === 0) {
        throw new Error('Trabajador no encontrado');
      }

      // Buscar el documento actualizado
      const trabajadorActualizado = await collection.findOne({ _id: objectId });
      
      if (!trabajadorActualizado) {
        throw new Error('Error al recuperar trabajador actualizado');
      }

      return this.formatTrabajador(trabajadorActualizado);
    } catch (error) {
      throw new Error(`Error al actualizar trabajador: ${error.message}`);
    }
  }

  /**
   * Actualizar último acceso del trabajador
   * @param {string} id - ID del trabajador
   * @returns {Promise<Object>} Trabajador actualizado
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
   * Cambiar estado del trabajador
   * @param {string} id - ID del trabajador
   * @param {string} estado - Nuevo estado (pending, approved, rejected)
   * @returns {Promise<Object>} Trabajador actualizado
   */
  static async cambiarEstado(id, estado) {
    try {
      return await this.actualizar(id, { estado });
    } catch (error) {
      throw new Error(`Error al cambiar estado del trabajador: ${error.message}`);
    }
  }

  /**
   * Agregar certificado a un trabajador
   * @param {string} id - ID del trabajador
   * @param {Object} certificadoData - Datos del certificado
   * @returns {Promise<Object>} Trabajador actualizado
   */
  static async agregarCertificado(id, certificadoData) {
    try {
      const collection = await this.getCollection();
      
      const certificado = {
        nombreArchivo: certificadoData.nombreArchivo,
        archivoUrl: certificadoData.archivoUrl,
        publicId: certificadoData.publicId || null,
        createdAt: new Date()
      };

      let objectId;
      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        throw new Error('ID de trabajador inválido');
      }

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { 
          $push: { certificados: certificado },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Trabajador no encontrado');
      }

      return this.formatTrabajador(result.value);
    } catch (error) {
      throw new Error(`Error al agregar certificado: ${error.message}`);
    }
  }

  /**
   * Eliminar trabajador
   * @param {string} id - ID del trabajador
   * @returns {Promise<Object>} Trabajador eliminado
   */
  static async eliminar(id) {
    try {
      const collection = await this.getCollection();
      const trabajador = await collection.findOneAndDelete({ _id: new ObjectId(id) });
      
      if (!trabajador.value) {
        throw new Error('Trabajador no encontrado');
      }

      return this.formatTrabajador(trabajador.value);
    } catch (error) {
      throw new Error(`Error al eliminar trabajador: ${error.message}`);
    }
  }

  /**
   * Formatear trabajador para la respuesta (ocultar password)
   * @param {Object} trabajador - Documento de MongoDB
   * @returns {Object} Trabajador formateado
   */
  static formatTrabajador(trabajador) {
    if (!trabajador) return null;

    const { password, ...trabajadorFormateado } = trabajador;
    return {
      id: trabajador._id.toString(),
      ...trabajadorFormateado,
      _id: trabajador._id.toString()
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

  /**
   * Obtener estadísticas de trabajadores
   * @returns {Promise<Object>} Estadísticas de trabajadores
   */
  static async obtenerEstadisticas() {
    try {
      const collection = await this.getCollection();
      
      const [total, pendientes, aprobados, rechazados] = await Promise.all([
        collection.countDocuments({}),
        collection.countDocuments({ estado: 'pending' }),
        collection.countDocuments({ estado: 'approved' }),
        collection.countDocuments({ estado: 'rejected' })
      ]);

      return {
        total,
        pendientes,
        aprobados,
        rechazados
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
}

module.exports = TrabajadorMongo;

