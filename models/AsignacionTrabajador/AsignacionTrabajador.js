const { client } = require('../../config/mongodb');
const { ObjectId } = require('mongodb');
const SolicitudClienteMongo = require('../SolicitudCliente/SolicitudClienteMongo');
const TrabajadorMongo = require('../Trabajador/TrabajadorMongo');

// Nombre de la base de datos y colección
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'asignaciones_trabajador';

class AsignacionTrabajador {
  /**
   * Obtener la colección de asignaciones
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
   * Crear una nueva asignación de trabajador a solicitud
   * @param {Object} datos - Datos de la asignación
   * @returns {Promise<Object>} Asignación creada
   */
  static async crear(datos) {
    try {
      const { solicitudId, trabajadorId, observaciones } = datos;

      // Verificar que la solicitud existe y está en estado pendiente (en MongoDB)
      const solicitud = await SolicitudClienteMongo.buscarPorId(solicitudId);

      if (!solicitud) {
        throw new Error('La solicitud no existe');
      }

      if (solicitud.estado !== 'pendiente') {
        throw new Error('La solicitud no está disponible para asignación');
      }

      // Verificar que el trabajador existe y está aprobado
      const trabajador = await TrabajadorMongo.buscarPorId(trabajadorId);

      if (!trabajador) {
        throw new Error('El trabajador no existe');
      }

      if (trabajador.estado !== 'approved') {
        throw new Error('El trabajador no está aprobado');
      }

      // Crear documento de la asignación
      const asignacionDocument = {
        solicitudId,
        trabajadorId,
        estado: 'asignado', // asignado, en_proceso, completado, cancelado
        observaciones: observaciones || null,
        calificacion: null,
        comentarios: null,
        fechaInicio: null,
        fechaCompletado: null,
        fechaAsignacion: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = await this.getCollection();
      const result = await collection.insertOne(asignacionDocument);

      // Actualizar el estado de la solicitud a "asignada" (en MongoDB)
      await SolicitudClienteMongo.cambiarEstado(solicitudId, 'asignada', 'Asignada a trabajador');

      // Retornar la asignación creada con detalles
      const asignacionCreada = await collection.findOne({ _id: result.insertedId });
      
      return this.formatAsignacion(asignacionCreada, solicitud, trabajador);
    } catch (error) {
      throw new Error(`Error al crear asignación: ${error.message}`);
    }
  }

  /**
   * Buscar asignación por ID
   * @param {string} id - ID de la asignación
   * @returns {Promise<Object|null>} Asignación encontrada o null
   */
  static async buscarPorId(id) {
    try {
      const collection = await this.getCollection();
      const asignacion = await collection.findOne({ _id: new ObjectId(id) });
      
      if (!asignacion) return null;

      // Obtener detalles relacionados
      const [solicitud, trabajador] = await Promise.all([
        SolicitudClienteMongo.buscarPorId(asignacion.solicitudId).catch(() => null),
        TrabajadorMongo.buscarPorId(asignacion.trabajadorId).catch(() => null)
      ]);

      return this.formatAsignacion(asignacion, solicitud, trabajador);
    } catch (error) {
      throw new Error(`Error al buscar asignación: ${error.message}`);
    }
  }

  /**
   * Buscar asignaciones por trabajador
   * @param {string} trabajadorId - ID del trabajador
   * @returns {Promise<Array>} Lista de asignaciones
   */
  static async buscarPorTrabajador(trabajadorId) {
    try {
      const collection = await this.getCollection();
      const asignaciones = await collection
        .find({ trabajadorId })
        .sort({ createdAt: -1 })
        .toArray();

      // Enriquecer con datos de la solicitud
      return await Promise.all(
        asignaciones.map(async (asignacion) => {
          const solicitud = await SolicitudClienteMongo.buscarPorId(asignacion.solicitudId).catch(() => null);
          return this.formatAsignacion(asignacion, solicitud);
        })
      );
    } catch (error) {
      throw new Error(`Error al buscar asignaciones del trabajador: ${error.message}`);
    }
  }

  /**
   * Buscar asignación por solicitud
   * @param {string} solicitudId - ID de la solicitud
   * @returns {Promise<Object|null>} Asignación encontrada o null
   */
  static async buscarPorSolicitud(solicitudId) {
    try {
      const collection = await this.getCollection();
      const asignacion = await collection.findOne({ solicitudId });
      
      if (!asignacion) return null;

      const trabajador = await TrabajadorMongo.buscarPorId(asignacion.trabajadorId).catch(() => null);
      return this.formatAsignacion(asignacion, null, trabajador);
    } catch (error) {
      throw new Error(`Error al buscar asignación de la solicitud: ${error.message}`);
    }
  }

  /**
   * Actualizar estado de la asignación
   * @param {string} id - ID de la asignación
   * @param {string} estado - Nuevo estado
   * @param {string} observaciones - Observaciones opcionales
   * @returns {Promise<Object>} Asignación actualizada
   */
  static async actualizarEstado(id, estado, observaciones = null) {
    try {
      const updateData = { 
        estado,
        updatedAt: new Date()
      };

      if (estado === 'en_proceso') {
        updateData.fechaInicio = new Date();
      }

      if (estado === 'completado') {
        updateData.fechaCompletado = new Date();
      }

      if (observaciones) {
        updateData.observaciones = observaciones;
      }

      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Asignación no encontrada');
      }

      const asignacion = result.value;

      // Actualizar el estado de la solicitud según el estado de la asignación (en MongoDB)
      if (estado === 'en_proceso' && asignacion.solicitudId) {
        await SolicitudClienteMongo.cambiarEstado(asignacion.solicitudId, 'en_proceso', 'En proceso por trabajador');
      } else if (estado === 'completado' && asignacion.solicitudId) {
        await SolicitudClienteMongo.cambiarEstado(asignacion.solicitudId, 'completada', 'Completada por trabajador');
      } else if (estado === 'cancelado' && asignacion.solicitudId) {
        await SolicitudClienteMongo.cambiarEstado(asignacion.solicitudId, 'pendiente', 'Asignación cancelada por trabajador');
      }

      return await this.buscarPorId(id);
    } catch (error) {
      throw new Error(`Error al actualizar estado de la asignación: ${error.message}`);
    }
  }

  /**
   * Calificar asignación (por el cliente)
   * @param {string} id - ID de la asignación
   * @param {number} calificacion - Calificación de 1 a 5
   * @param {string} comentarios - Comentarios opcionales
   * @returns {Promise<Object>} Asignación actualizada
   */
  static async calificar(id, calificacion, comentarios = null) {
    try {
      if (calificacion < 1 || calificacion > 5) {
        throw new Error('La calificación debe estar entre 1 y 5');
      }

      const updateData = { 
        calificacion,
        comentarios: comentarios || null,
        updatedAt: new Date()
      };

      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Asignación no encontrada');
      }

      return await this.buscarPorId(id);
    } catch (error) {
      throw new Error(`Error al calificar asignación: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de asignaciones
   * @param {string} trabajadorId - ID del trabajador (opcional)
   * @returns {Promise<Object>} Estadísticas
   */
  static async obtenerEstadisticas(trabajadorId = null) {
    try {
      const collection = await this.getCollection();
      const filter = trabajadorId ? { trabajadorId } : {};

      const [total, porEstadoDocs, promedioCalificacionDoc] = await Promise.all([
        collection.countDocuments(filter),
        collection.aggregate([
          { $match: filter },
          { $group: { _id: '$estado', count: { $sum: 1 } } }
        ]).toArray(),
        collection.aggregate([
          { $match: { ...filter, calificacion: { $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$calificacion' } } }
        ]).toArray()
      ]);

      const porEstado = porEstadoDocs.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      return {
        total,
        porEstado,
        promedioCalificacion: promedioCalificacionDoc.length > 0 ? promedioCalificacionDoc[0].avg : 0
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Eliminar asignación
   * @param {string} id - ID de la asignación
   * @returns {Promise<Object>} Asignación eliminada
   */
  static async eliminar(id) {
    try {
      const collection = await this.getCollection();
      const asignacion = await collection.findOneAndDelete({ _id: new ObjectId(id) });
      
      if (!asignacion.value) {
        throw new Error('Asignación no encontrada');
      }

      // Revertir el estado de la solicitud a pendiente (en MongoDB)
      if (asignacion.value.solicitudId) {
        await SolicitudClienteMongo.cambiarEstado(asignacion.value.solicitudId, 'pendiente', 'Asignación eliminada');
      }

      return asignacion.value;
    } catch (error) {
      throw new Error(`Error al eliminar asignación: ${error.message}`);
    }
  }

  /**
   * Formatear asignación para la respuesta
   */
  static formatAsignacion(asignacion, solicitud = null, trabajador = null) {
    if (!asignacion) return null;

    const formatted = {
      id: asignacion._id.toString(),
      solicitudId: asignacion.solicitudId,
      trabajadorId: asignacion.trabajadorId,
      estado: asignacion.estado,
      observaciones: asignacion.observaciones,
      calificacion: asignacion.calificacion,
      comentarios: asignacion.comentarios,
      fechaInicio: asignacion.fechaInicio,
      fechaCompletado: asignacion.fechaCompletado,
      fechaAsignacion: asignacion.fechaAsignacion,
      createdAt: asignacion.createdAt,
      updatedAt: asignacion.updatedAt
    };

    if (solicitud) formatted.solicitud = solicitud;
    if (trabajador) formatted.trabajador = trabajador;

    return formatted;
  }
}

module.exports = AsignacionTrabajador;
