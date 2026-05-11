const { client } = require('../../config/mongodb');
const { ObjectId } = require('mongodb');
const CategoriaMongo = require('../Categoria/CategoriaMongo');

// Nombre de la base de datos y colección
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'solicitudes_cliente';

class SolicitudClienteMongo {
  /**
   * Obtener la colección de solicitudes
   * @returns {Promise<Collection>} Colección de MongoDB
   */
  static async getCollection() {
    if (!client) {
      throw new Error('Cliente de MongoDB no inicializado');
    }
    try {
      const db = client.db(DB_NAME);
      return db.collection(COLLECTION_NAME);
    } catch (error) {
      console.error('Error al obtener colección de MongoDB:', error);
      throw new Error(`Error al acceder a la base de datos: ${error.message}`);
    }
  }

  /**
   * Crear una nueva solicitud del cliente en MongoDB
   * @param {Object} datos - Datos de la solicitud
   * @returns {Promise<Object>} Solicitud creada
   */
  static async crear(datos) {
    try {
      const {
        clienteId,
        categoriaId,
        descripcion,
        telefono,
        direccion,
        prioridad,
        ubicacionLat,
        ubicacionLng,
        archivos,
        observaciones
      } = datos;

      console.log('SolicitudClienteMongo.crear - Datos recibidos:', {
        clienteId,
        categoriaId,
        tieneDescripcion: !!descripcion,
        tieneTelefono: !!telefono,
        tieneDireccion: !!direccion
      });

      // Obtener la categoría de MongoDB para incluirla en la respuesta
      let categoria = null;
      if (categoriaId) {
        try {
          categoria = await CategoriaMongo.obtenerPorId(categoriaId);
          console.log('Categoría obtenida en SolicitudClienteMongo:', categoria ? categoria.nombre : 'null');
        } catch (error) {
          console.warn('Error al obtener categoría en SolicitudClienteMongo (continuando sin ella):', error.message);
          // Continuamos sin la categoría, no es crítico para crear la solicitud
        }
      }

      // Crear documento de la solicitud
      const solicitudDocument = {
        clienteId, // ID del cliente en MongoDB (string)
        categoriaId, // ID de la categoría en MongoDB (string)
        descripcion,
        telefono,
        direccion,
        prioridad: prioridad || 'Media',
        estado: 'pendiente',
        ubicacionLat: ubicacionLat || null,
        ubicacionLng: ubicacionLng || null,
        archivos: archivos || null,
        observaciones: observaciones || null,
        fechaCompletada: null,
        // Metadatos
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Insertando documento en MongoDB...');
      const collection = await this.getCollection();
      const result = await collection.insertOne(solicitudDocument);
      console.log('Documento insertado con ID:', result.insertedId);

      // Retornar el documento creado con la categoría
      const solicitudCreada = await collection.findOne({ _id: result.insertedId });
      if (!solicitudCreada) {
        throw new Error('No se pudo recuperar la solicitud creada');
      }

      const solicitudFormateada = this.formatSolicitud(solicitudCreada);
      
      // Agregar la categoría a la respuesta
      if (categoria) {
        solicitudFormateada.categoria = categoria;
      }
      
      console.log('Solicitud formateada exitosamente');
      return solicitudFormateada;
    } catch (error) {
      console.error('Error en SolicitudClienteMongo.crear:', error);
      console.error('Stack trace:', error.stack);
      throw new Error(`Error al crear solicitud: ${error.message}`);
    }
  }

  /**
   * Buscar solicitud por ID
   * @param {string} id - ID de la solicitud (ObjectId de MongoDB)
   * @returns {Promise<Object|null>} Solicitud encontrada o null
   */
  static async buscarPorId(id) {
    try {
      const collection = await this.getCollection();
      const solicitud = await collection.findOne({ _id: new ObjectId(id) });
      
      if (!solicitud) return null;

      const solicitudFormateada = this.formatSolicitud(solicitud);
      
      // Obtener la categoría de MongoDB si existe categoriaId
      if (solicitud.categoriaId) {
        try {
          const categoria = await CategoriaMongo.obtenerPorId(solicitud.categoriaId);
          if (categoria) {
            solicitudFormateada.categoria = categoria;
          }
        } catch (error) {
          console.warn('Error al obtener categoría:', error.message);
        }
      }
      
      return solicitudFormateada;
    } catch (error) {
      throw new Error(`Error al buscar solicitud: ${error.message}`);
    }
  }

  /**
   * Obtener todas las solicitudes de un cliente
   * @param {string} clienteId - ID del cliente en MongoDB
   * @param {Object} options - Opciones de paginación y filtros
   * @returns {Promise<Object>} Lista de solicitudes del cliente
   */
  static async obtenerPorCliente(clienteId, options = {}) {
    try {
      const { page = 1, limit = 10, estado } = options;
      const skip = (page - 1) * limit;

      const collection = await this.getCollection();
      
      // Construir filtro
      const filter = { clienteId };
      if (estado) {
        filter.estado = estado;
      }

      // Obtener solicitudes y total
      const [solicitudes, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      // Formatear solicitudes y obtener categorías
      const solicitudesFormateadas = await Promise.all(
        solicitudes.map(async (solicitud) => {
          const solicitudFormateada = this.formatSolicitud(solicitud);
          
          // Obtener la categoría de MongoDB si existe categoriaId
          if (solicitud.categoriaId) {
            try {
              const categoria = await CategoriaMongo.obtenerPorId(solicitud.categoriaId);
              if (categoria) {
                solicitudFormateada.categoria = categoria;
              }
            } catch (error) {
              console.warn('Error al obtener categoría:', error.message);
            }
          }
          
          return solicitudFormateada;
        })
      );

      return {
        solicitudes: solicitudesFormateadas,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener solicitudes del cliente: ${error.message}`);
    }
  }

  /**
   * Obtener todas las solicitudes (para administradores)
   * @param {Object} options - Opciones de paginación y filtros
   * @returns {Promise<Object>} Lista de todas las solicitudes
   */
  static async obtenerTodas(options = {}) {
    try {
      const { page = 1, limit = 10, estado, categoriaId, prioridad } = options;
      const skip = (page - 1) * limit;

      const collection = await this.getCollection();
      
      // Construir filtro
      const filter = {};
      if (estado) {
        filter.estado = estado;
      }
      if (categoriaId) {
        filter.categoriaId = categoriaId;
      }
      if (prioridad) {
        filter.prioridad = prioridad;
      }

      // Obtener solicitudes y total
      const [solicitudes, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      // Formatear solicitudes y obtener categorías
      const solicitudesFormateadas = await Promise.all(
        solicitudes.map(async (solicitud) => {
          const solicitudFormateada = this.formatSolicitud(solicitud);
          
          // Obtener la categoría de MongoDB si existe categoriaId
          if (solicitud.categoriaId) {
            try {
              const categoria = await CategoriaMongo.obtenerPorId(solicitud.categoriaId);
              if (categoria) {
                solicitudFormateada.categoria = categoria;
              }
            } catch (error) {
              console.warn('Error al obtener categoría:', error.message);
            }
          }
          
          return solicitudFormateada;
        })
      );

      return {
        solicitudes: solicitudesFormateadas,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener solicitudes: ${error.message}`);
    }
  }

  /**
   * Actualizar solicitud
   * @param {string} id - ID de la solicitud
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Solicitud actualizada
   */
  static async actualizar(id, updateData) {
    try {
      const collection = await this.getCollection();
      
      // Agregar updatedAt
      updateData.updatedAt = new Date();

      // Convertir ID a ObjectId
      let objectId;
      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        throw new Error('ID de solicitud inválido');
      }

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Solicitud no encontrada');
      }

      const solicitudFormateada = this.formatSolicitud(result.value);
      
      // Obtener la categoría de MongoDB si existe categoriaId
      if (result.value.categoriaId) {
        try {
          const categoria = await CategoriaMongo.obtenerPorId(result.value.categoriaId);
          if (categoria) {
            solicitudFormateada.categoria = categoria;
          }
        } catch (error) {
          console.warn('Error al obtener categoría:', error.message);
        }
      }

      return solicitudFormateada;
    } catch (error) {
      throw new Error(`Error al actualizar solicitud: ${error.message}`);
    }
  }

  /**
   * Cambiar estado de la solicitud
   * @param {string} id - ID de la solicitud
   * @param {string} estado - Nuevo estado
   * @param {string} observaciones - Observaciones opcionales
   * @returns {Promise<Object>} Solicitud actualizada
   */
  static async cambiarEstado(id, estado, observaciones = null) {
    try {
      const updateData = { estado, updatedAt: new Date() };
      
      if (estado === 'completada') {
        updateData.fechaCompletada = new Date();
      }
      
      if (observaciones) {
        updateData.observaciones = observaciones;
      }

      return await this.actualizar(id, updateData);
    } catch (error) {
      throw new Error(`Error al cambiar estado de la solicitud: ${error.message}`);
    }
  }

  /**
   * Eliminar solicitud
   * @param {string} id - ID de la solicitud
   * @returns {Promise<Object>} Solicitud eliminada
   */
  static async eliminar(id) {
    try {
      const collection = await this.getCollection();
      const solicitud = await collection.findOneAndDelete({ _id: new ObjectId(id) });
      
      if (!solicitud.value) {
        throw new Error('Solicitud no encontrada');
      }

      return this.formatSolicitud(solicitud.value);
    } catch (error) {
      throw new Error(`Error al eliminar solicitud: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de solicitudes
   * @param {string} clienteId - ID del cliente en MongoDB (opcional)
   * @returns {Promise<Object>} Estadísticas de solicitudes
   */
  static async obtenerEstadisticas(clienteId = null) {
    try {
      const collection = await this.getCollection();
      
      const filter = clienteId ? { clienteId } : {};
      
      const [total, pendientes, enProceso, completadas, canceladas] = await Promise.all([
        collection.countDocuments(filter),
        collection.countDocuments({ ...filter, estado: 'pendiente' }),
        collection.countDocuments({ ...filter, estado: 'en_proceso' }),
        collection.countDocuments({ ...filter, estado: 'completada' }),
        collection.countDocuments({ ...filter, estado: 'cancelada' })
      ]);

      return {
        total,
        pendientes,
        enProceso,
        completadas,
        canceladas
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Buscar solicitudes por criterios específicos
   * @param {Object} criterios - Criterios de búsqueda
   * @returns {Promise<Array>} Lista de solicitudes encontradas
   */
  static async buscar(criterios) {
    try {
      const collection = await this.getCollection();
      const solicitudes = await collection
        .find(criterios)
        .sort({ createdAt: -1 })
        .toArray();

      // Formatear solicitudes y obtener categorías
      const solicitudesFormateadas = await Promise.all(
        solicitudes.map(async (solicitud) => {
          const solicitudFormateada = this.formatSolicitud(solicitud);
          
          // Obtener la categoría de MongoDB si existe categoriaId
          if (solicitud.categoriaId) {
            try {
              const categoria = await CategoriaMongo.obtenerPorId(solicitud.categoriaId);
              if (categoria) {
                solicitudFormateada.categoria = categoria;
              }
            } catch (error) {
              console.warn('Error al obtener categoría:', error.message);
            }
          }
          
          return solicitudFormateada;
        })
      );

      return solicitudesFormateadas;
    } catch (error) {
      throw new Error(`Error al buscar solicitudes: ${error.message}`);
    }
  }

  /**
   * Formatear solicitud para la respuesta
   * @param {Object} solicitud - Documento de MongoDB
   * @returns {Object} Solicitud formateada
   */
  static formatSolicitud(solicitud) {
    if (!solicitud) return null;

    return {
      id: solicitud._id.toString(),
      clienteId: solicitud.clienteId,
      categoriaId: solicitud.categoriaId,
      descripcion: solicitud.descripcion,
      telefono: solicitud.telefono,
      direccion: solicitud.direccion,
      prioridad: solicitud.prioridad,
      estado: solicitud.estado,
      ubicacionLat: solicitud.ubicacionLat,
      ubicacionLng: solicitud.ubicacionLng,
      archivos: solicitud.archivos,
      observaciones: solicitud.observaciones,
      fechaCompletada: solicitud.fechaCompletada,
      createdAt: solicitud.createdAt,
      updatedAt: solicitud.updatedAt
    };
  }
}

module.exports = SolicitudClienteMongo;

