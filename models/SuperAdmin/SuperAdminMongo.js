const { client } = require('../../config/mongodb');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

// Nombre de la base de datos y colección
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'superadmins';

class SuperAdminMongo {
  /**
   * Obtener la colección de superadmins
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
   * Crear un nuevo SuperAdmin en MongoDB
   * @param {Object} superAdminData - Datos del SuperAdmin (incluye datos del usuario)
   * @returns {Promise<Object>} SuperAdmin creado
   */
  static async crearSuperAdmin(superAdminData) {
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
        nivelAcceso = 'superadmin',
        permisos = ['all']
      } = superAdminData;

      // Verificar si el email ya existe
      const emailExiste = await this.emailExiste(email);
      if (emailExiste) {
        throw new Error('Ya existe un usuario con este email');
      }

      // Verificar si el documento ya existe
      const documentoExiste = await this.documentoExiste(numeroDocumento);
      if (documentoExiste) {
        throw new Error('Ya existe un usuario con este número de documento');
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 12);

      // Crear documento del SuperAdmin
      const superAdminDocument = {
        // Datos del usuario
        email,
        password: hashedPassword,
        nombre,
        apellido1,
        apellido2: apellido2 || null,
        telefono,
        tipoDocumento,
        numeroDocumento,
        // Datos del SuperAdmin
        nivelAcceso,
        permisos: Array.isArray(permisos) ? permisos : ['all'],
        activo: true,
        ultimoAcceso: null,
        // Metadatos
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = await this.getCollection();
      const result = await collection.insertOne(superAdminDocument);

      // Retornar el documento creado
      const superAdminCreado = await collection.findOne({ _id: result.insertedId });

      return this.formatSuperAdmin(superAdminCreado);
    } catch (error) {
      throw new Error(`Error al crear SuperAdmin: ${error.message}`);
    }
  }

  /**
   * Buscar SuperAdmin por ID
   * @param {string} id - ID del SuperAdmin (ObjectId de MongoDB)
   * @returns {Promise<Object|null>} SuperAdmin encontrado o null
   */
  static async obtenerPorId(id) {
    try {
      const collection = await this.getCollection();
      const superAdmin = await collection.findOne({ _id: new ObjectId(id) });

      return superAdmin ? this.formatSuperAdmin(superAdmin) : null;
    } catch (error) {
      throw new Error(`Error al buscar SuperAdmin: ${error.message}`);
    }
  }

  /**
   * Buscar SuperAdmin por email
   * @param {string} email - Email del SuperAdmin
   * @param {boolean} incluirPassword - Si es true, incluye el password en la respuesta (para login)
   * @returns {Promise<Object|null>} SuperAdmin encontrado o null
   */
  static async buscarPorEmail(email, incluirPassword = false) {
    try {
      const collection = await this.getCollection();
      const superAdmin = await collection.findOne({ email });

      if (!superAdmin) return null;

      // Si se necesita el password (para login), retornar sin formatear
      if (incluirPassword) {
        return {
          id: superAdmin._id.toString(),
          ...superAdmin,
          _id: superAdmin._id.toString()
        };
      }

      return this.formatSuperAdmin(superAdmin);
    } catch (error) {
      throw new Error(`Error al buscar SuperAdmin por email: ${error.message}`);
    }
  }

  /**
   * Buscar SuperAdmin por ID de usuario (en MongoDB, el userId del JWT es el id del SuperAdmin)
   * @param {string} usuarioId - ID del usuario (que es el ID del SuperAdmin en MongoDB)
   * @returns {Promise<Object|null>} SuperAdmin encontrado o null
   */
  static async obtenerPorUsuarioId(usuarioId) {
    try {
      // En MongoDB, el usuarioId del JWT es el id del SuperAdmin
      return await this.obtenerPorId(usuarioId);
    } catch (error) {
      throw new Error(`Error al buscar SuperAdmin por usuarioId: ${error.message}`);
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
      const superAdmin = await collection.findOne(
        { email },
        { projection: { _id: 1 } }
      );

      return !!superAdmin;
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
      const superAdmin = await collection.findOne(
        { numeroDocumento },
        { projection: { _id: 1 } }
      );

      return !!superAdmin;
    } catch (error) {
      throw new Error(`Error al verificar documento: ${error.message}`);
    }
  }

  /**
   * Obtener todos los SuperAdmins con paginación
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Object>} Lista de SuperAdmins con paginación
   */
  static async obtenerTodos(filtros = {}) {
    try {
      const { activo, nivelAcceso, page = 1, limit = 10 } = filtros;
      const skip = (page - 1) * limit;

      const collection = await this.getCollection();

      // Construir filtro
      const filter = {};
      if (activo !== undefined) {
        filter.activo = activo;
      }
      if (nivelAcceso) {
        filter.nivelAcceso = nivelAcceso;
      }

      // Obtener superadmins y total
      const [superAdmins, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        data: superAdmins.map(superAdmin => this.formatSuperAdmin(superAdmin)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener SuperAdmins: ${error.message}`);
    }
  }

  /**
   * Actualizar SuperAdmin
   * @param {string} id - ID del SuperAdmin
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} SuperAdmin actualizado
   */
  static async actualizar(id, updateData) {
    try {
      const collection = await this.getCollection();

      // Si se está actualizando la contraseña, encriptarla
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }

      // Agregar updatedAt
      updateData.updatedAt = new Date();

      // Convertir ID a ObjectId
      let objectId;
      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        throw new Error('ID de SuperAdmin inválido');
      }

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('SuperAdmin no encontrado');
      }

      return this.formatSuperAdmin(result.value);
    } catch (error) {
      throw new Error(`Error al actualizar SuperAdmin: ${error.message}`);
    }
  }

  /**
   * Eliminar SuperAdmin
   * @param {string} id - ID del SuperAdmin
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async eliminar(id) {
    try {
      const collection = await this.getCollection();
      const superAdmin = await collection.findOneAndDelete({ _id: new ObjectId(id) });

      if (!superAdmin.value) {
        throw new Error('SuperAdmin no encontrado');
      }

      return { success: true, message: 'SuperAdmin eliminado correctamente' };
    } catch (error) {
      throw new Error(`Error al eliminar SuperAdmin: ${error.message}`);
    }
  }

  /**
   * Verificar si un usuario es SuperAdmin
   * @param {string} usuarioId - ID del usuario (que es el ID del SuperAdmin en MongoDB)
   * @returns {Promise<boolean>} True si es SuperAdmin, false si no
   */
  static async esSuperAdmin(usuarioId) {
    try {
      const superAdmin = await this.obtenerPorId(usuarioId);
      return superAdmin && superAdmin.activo === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Actualizar último acceso
   * @param {string} usuarioId - ID del usuario (que es el ID del SuperAdmin en MongoDB)
   * @returns {Promise<void>}
   */
  static async actualizarUltimoAcceso(usuarioId) {
    try {
      return await this.actualizar(usuarioId, {
        ultimoAcceso: new Date()
      });
    } catch (error) {
      throw new Error(`Error al actualizar último acceso: ${error.message}`);
    }
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
   * Formatear SuperAdmin para la respuesta (ocultar password)
   * @param {Object} superAdmin - Documento de MongoDB
   * @returns {Object} SuperAdmin formateado
   */
  static formatSuperAdmin(superAdmin) {
    if (!superAdmin) return null;

    const { password, ...superAdminFormateado } = superAdmin;
    return {
      id: superAdmin._id.toString(),
      ...superAdminFormateado,
      _id: superAdmin._id.toString()
    };
  }
}

module.exports = SuperAdminMongo;

