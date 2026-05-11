const SolicitudClienteMongo = require('../../models/SolicitudCliente/SolicitudClienteMongo');
const ClienteMongo = require('../../models/Cliente/ClienteMongo');
const CategoriaMongo = require('../../models/Categoria/CategoriaMongo');

class SolicitudController {
  /**
   * Crear una nueva solicitud
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async crearSolicitud(req, res) {
    try {
      const { 
        categoriaId, 
        descripcion, 
        telefono, 
        direccion, 
        prioridad, 
        ubicacionLat, 
        ubicacionLng, 
        archivos 
      } = req.body;

      console.log('Datos recibidos en crearSolicitud:', {
        categoriaId,
        descripcion: descripcion?.substring(0, 50),
        telefono,
        direccion: direccion?.substring(0, 50),
        prioridad,
        ubicacionLat,
        ubicacionLng,
        archivos: archivos?.length || 0
      });

      const userId = req.user.userId;
      console.log('userId del token:', userId);

      // Obtener el cliente por userId
      const cliente = await ClienteMongo.buscarPorUsuarioId(userId);
      if (!cliente) {
        console.error('Cliente no encontrado para userId:', userId);
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      console.log('Cliente encontrado:', { id: cliente.id, email: cliente.email });

      const clienteId = cliente.id;

      // Validar que la categoría existe
      console.log('Buscando categoría con ID:', categoriaId);
      const categoria = await CategoriaMongo.obtenerPorId(categoriaId);
      if (!categoria) {
        console.error('Categoría no encontrada con ID:', categoriaId);
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      console.log('Categoría encontrada:', { id: categoria.id, nombre: categoria.nombre });

      // Crear la solicitud en MongoDB
      console.log('Creando solicitud en MongoDB con clienteId:', clienteId);
      const solicitud = await SolicitudClienteMongo.crear({
        clienteId,
        categoriaId,
        descripcion,
        telefono,
        direccion,
        prioridad: prioridad || 'Media',
        ubicacionLat,
        ubicacionLng,
        archivos: archivos || null
      });

      console.log('Solicitud creada exitosamente:', solicitud.id);

      res.status(201).json({
        success: true,
        message: 'Solicitud creada exitosamente',
        data: solicitud
      });

    } catch (error) {
      console.error('Error al crear solicitud:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar la solicitud'
      });
    }
  }

  /**
   * Obtener solicitudes del cliente autenticado
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerMisSolicitudes(req, res) {
    try {
      const userId = req.user.userId;
      
      // Obtener el cliente por userId
      const cliente = await ClienteMongo.buscarPorUsuarioId(userId);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const clienteId = cliente.id;
      const { page = 1, limit = 10, estado } = req.query;

      const resultado = await SolicitudClienteMongo.obtenerPorCliente(clienteId, {
        page: parseInt(page),
        limit: parseInt(limit),
        estado
      });

      res.json({
        success: true,
        data: resultado
      });

    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener una solicitud específica del cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerSolicitud(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      // Obtener el cliente por userId
      const cliente = await ClienteMongo.buscarPorUsuarioId(userId);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const clienteId = cliente.id;

      const solicitud = await SolicitudClienteMongo.buscarPorId(id);

      if (!solicitud) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada'
        });
      }

      // Verificar que la solicitud pertenece al cliente
      if (solicitud.clienteId !== clienteId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta solicitud'
        });
      }

      res.json({
        success: true,
        data: solicitud
      });

    } catch (error) {
      console.error('Error al obtener solicitud:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar una solicitud del cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async actualizarSolicitud(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      // Obtener el cliente por userId
      const cliente = await ClienteMongo.buscarPorUsuarioId(userId);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const clienteId = cliente.id;
      const updateData = req.body;

      // Verificar que la solicitud existe y pertenece al cliente
      const solicitudExistente = await SolicitudClienteMongo.buscarPorId(id);
      if (!solicitudExistente) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada'
        });
      }

      if (solicitudExistente.clienteId !== clienteId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar esta solicitud'
        });
      }

      // Solo permitir actualizar si está en estado pendiente
      if (solicitudExistente.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden modificar solicitudes en estado pendiente'
        });
      }

      // Campos permitidos para actualizar por el cliente
      const camposPermitidos = ['descripcion', 'telefono', 'direccion', 'prioridad', 'ubicacionLat', 'ubicacionLng', 'archivos'];
      const datosActualizacion = {};
      
      for (const campo of camposPermitidos) {
        if (updateData[campo] !== undefined) {
          datosActualizacion[campo] = updateData[campo];
        }
      }

      const solicitudActualizada = await SolicitudClienteMongo.actualizar(id, datosActualizacion);

      res.json({
        success: true,
        message: 'Solicitud actualizada exitosamente',
        data: solicitudActualizada
      });

    } catch (error) {
      console.error('Error al actualizar solicitud:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Cancelar una solicitud del cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async cancelarSolicitud(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      // Obtener el cliente por userId
      const cliente = await ClienteMongo.buscarPorUsuarioId(userId);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const clienteId = cliente.id;

      // Verificar que la solicitud existe y pertenece al cliente
      const solicitudExistente = await SolicitudClienteMongo.buscarPorId(id);
      if (!solicitudExistente) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada'
        });
      }

      if (solicitudExistente.clienteId !== clienteId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para cancelar esta solicitud'
        });
      }

      // Solo permitir cancelar si no está completada
      if (solicitudExistente.estado === 'completada') {
        return res.status(400).json({
          success: false,
          message: 'No se puede cancelar una solicitud completada'
        });
      }

      const solicitudCancelada = await SolicitudClienteMongo.cambiarEstado(id, 'cancelada', 'Cancelada por el cliente');

      res.json({
        success: true,
        message: 'Solicitud cancelada exitosamente',
        data: solicitudCancelada
      });

    } catch (error) {
      console.error('Error al cancelar solicitud:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de solicitudes del cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerEstadisticas(req, res) {
    try {
      const userId = req.user.userId;
      
      // Obtener el cliente por userId
      const cliente = await ClienteMongo.buscarPorUsuarioId(userId);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const clienteId = cliente.id;

      const estadisticas = await SolicitudClienteMongo.obtenerEstadisticas(clienteId);

      res.json({
        success: true,
        data: estadisticas
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener todas las solicitudes de clientes (para trabajadores)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerTodasLasSolicitudes(req, res) {
    try {
      const { page = 1, limit = 10, estado } = req.query;

      const resultado = await SolicitudClienteMongo.obtenerTodas({
        page: parseInt(page),
        limit: parseInt(limit),
        estado
      });

      res.json({
        success: true,
        data: resultado
      });

    } catch (error) {
      console.error('Error al obtener todas las solicitudes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Aceptar una solicitud (para trabajadores)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async aceptarSolicitud(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Verificar que la solicitud existe
      const solicitud = await SolicitudClienteMongo.buscarPorId(id);
      if (!solicitud) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada'
        });
      }

      // Verificar que la solicitud esté en estado pendiente
      if (solicitud.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden aceptar solicitudes en estado pendiente'
        });
      }

      // TODO: Aquí se implementará la lógica para guardar en la tabla de trabajador-solicitud
      // Por ahora solo actualizamos el estado de la solicitud
      const solicitudActualizada = await SolicitudClienteMongo.cambiarEstado(id, 'en_proceso', 'Aceptada por trabajador');

      res.json({
        success: true,
        message: 'Solicitud aceptada exitosamente',
        data: solicitudActualizada
      });

    } catch (error) {
      console.error('Error al aceptar solicitud:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Rechazar una solicitud (para trabajadores)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async rechazarSolicitud(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Verificar que la solicitud existe
      const solicitud = await SolicitudClienteMongo.buscarPorId(id);
      if (!solicitud) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud no encontrada'
        });
      }

      // Verificar que la solicitud esté en estado pendiente
      if (solicitud.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden rechazar solicitudes en estado pendiente'
        });
      }

      // TODO: Aquí se implementará la lógica para guardar en la tabla de trabajador-solicitud
      // Por ahora solo actualizamos el estado de la solicitud
      const solicitudActualizada = await SolicitudClienteMongo.cambiarEstado(id, 'cancelada', 'Rechazada por trabajador');

      res.json({
        success: true,
        message: 'Solicitud rechazada exitosamente',
        data: solicitudActualizada
      });

    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = SolicitudController;
