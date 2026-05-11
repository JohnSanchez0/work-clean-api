const { Trabajador, AsignacionTrabajador } = require('../../models');

class TrabajadorController {
  /**
   * Crear un nuevo trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async crearTrabajador(req, res) {
    try {
      const { usuarioId } = req.body;

      if (!usuarioId) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario es requerido'
        });
      }

      // Verificar si el usuario ya es trabajador
      const esTrabajador = await Trabajador.esTrabajador(usuarioId);
      if (esTrabajador) {
        return res.status(409).json({
          success: false,
          message: 'El usuario ya es un trabajador'
        });
      }

      const trabajador = await Trabajador.crear(usuarioId);

      res.status(201).json({
        success: true,
        message: 'Trabajador creado exitosamente',
        data: trabajador
      });
    } catch (error) {
      console.error('Error en crearTrabajador:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener trabajador por ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      const trabajador = await Trabajador.buscarPorId(id);

      if (!trabajador) {
        return res.status(404).json({
          success: false,
          message: 'Trabajador no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: trabajador
      });
    } catch (error) {
      console.error('Error en obtenerPorId:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener trabajador por ID de usuario
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerPorUsuarioId(req, res) {
    try {
      const { usuarioId } = req.params;

      const trabajador = await Trabajador.buscarPorUsuarioId(usuarioId);

      if (!trabajador) {
        return res.status(404).json({
          success: false,
          message: 'Trabajador no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: trabajador
      });
    } catch (error) {
      console.error('Error en obtenerPorUsuarioId:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener todos los trabajadores
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerTodos(req, res) {
    try {
      const {
        estado,
        page = 1,
        limit = 10
      } = req.query;

      const filtros = {
        estado,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const resultado = await Trabajador.obtenerTodos(filtros);

      res.status(200).json({
        success: true,
        ...resultado
      });
    } catch (error) {
      console.error('Error en obtenerTodos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener trabajadores pendientes
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerPendientes(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const result = await Trabajador.obtenerTodos({
        page: parseInt(page),
        limit: parseInt(limit),
        estado: 'pending'
      });

      res.json({
        success: true,
        message: 'Trabajadores pendientes obtenidos exitosamente',
        ...result
      });
    } catch (error) {
      console.error('Error en obtenerTrabajadoresPendientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Aprobar trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async aprobar(req, res) {
    try {
      const { id } = req.params;
      
      const trabajador = await Trabajador.buscarPorId(id);

      if (!trabajador) {
        return res.status(404).json({
          success: false,
          message: 'Trabajador no encontrado'
        });
      }
      
      if (trabajador.estado !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'El trabajador no está en estado pendiente'
        });
      }
      
      const trabajadorActualizado = await Trabajador.actualizar(id, {
        estado: 'approved'
      });
      
      res.json({
        success: true,
        message: 'Trabajador aprobado exitosamente',
        data: trabajadorActualizado
      });
    } catch (error) {
      console.error('Error en aprobar trabajador:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Rechazar trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async rechazar(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      
      const trabajador = await Trabajador.buscarPorId(id);

      if (!trabajador) {
        return res.status(404).json({
          success: false,
          message: 'Trabajador no encontrado'
        });
      }
      
      if (trabajador.estado !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'El trabajador no está en estado pendiente'
        });
      }
      
      const trabajadorActualizado = await Trabajador.actualizar(id, {
        estado: 'rejected',
        motivoRechazo: motivo || 'No especificado'
      });
      
      res.json({
        success: true,
        message: 'Trabajador rechazado',
        data: trabajadorActualizado
      });
    } catch (error) {
      console.error('Error en rechazar trabajador:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const datos = req.body;

      const trabajador = await Trabajador.actualizar(id, datos);

      res.status(200).json({
        success: true,
        message: 'Trabajador actualizado exitosamente',
        data: trabajador
      });
    } catch (error) {
      console.error('Error en actualizar:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Cambiar estado del trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async cambiarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!estado || !['pending', 'approved', 'rejected'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser: pending, approved o rejected'
        });
      }

      const trabajador = await Trabajador.actualizar(id, { estado });

      res.status(200).json({
        success: true,
        message: `Estado del trabajador cambiado a ${estado}`,
        data: trabajador
      });
    } catch (error) {
      console.error('Error en cambiarEstado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Verificar si un usuario es trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async esTrabajador(req, res) {
    try {
      const { usuarioId } = req.params;

      const esTrabajador = await Trabajador.esTrabajador(usuarioId);

      res.status(200).json({
        success: true,
        esTrabajador
      });
    } catch (error) {
      console.error('Error en esTrabajador:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de trabajadores
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerEstadisticas(req, res) {
    try {
      const [total, pendientes, aprobados, rechazados] = await Promise.all([
        Trabajador.obtenerTodos({ page: 1, limit: 1 }).then(result => result.pagination.total),
        Trabajador.obtenerTodos({ page: 1, limit: 1, estado: 'pending' }).then(result => result.pagination.total),
        Trabajador.obtenerTodos({ page: 1, limit: 1, estado: 'approved' }).then(result => result.pagination.total),
        Trabajador.obtenerTodos({ page: 1, limit: 1, estado: 'rejected' }).then(result => result.pagination.total)
      ]);
      
      res.json({
        success: true,
        data: {
          total,
          pendientes,
          aprobados,
          rechazados
        }
      });
    } catch (error) {
      console.error('Error en obtenerEstadisticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener solicitudes de clientes disponibles para trabajadores
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerSolicitudesDisponibles(req, res) {
    try {
      const { 
        estado = 'pendiente',
        page = 1,
        limit = 10
      } = req.query;

      console.log('🔍 Parámetros recibidos:', { estado, page, limit });

      // Importar el modelo de SolicitudClienteMongo
      const SolicitudClienteMongo = require('../../models/SolicitudCliente/SolicitudClienteMongo');
      
      const filtros = {
        estado,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      console.log('🔍 Filtros aplicados:', filtros);

      const resultado = await SolicitudClienteMongo.obtenerTodas(filtros);

      console.log('🔍 Resultado obtenido:', {
        totalSolicitudes: resultado.solicitudes?.length || 0,
        total: resultado.pagination?.total || 0,
        page: resultado.pagination?.page || 0
      });

      res.status(200).json({
        success: true,
        message: 'Solicitudes obtenidas exitosamente',
        ...resultado
      });
    } catch (error) {
      console.error('❌ Error en obtenerSolicitudesDisponibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Aceptar solicitud de cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async aceptarSolicitud(req, res) {
    try {
      const { solicitudId } = req.params;
      const { trabajadorId } = req.body;

      if (!trabajadorId) {
        return res.status(400).json({
          success: false,
          message: 'ID del trabajador es requerido'
        });
      }

      const asignacion = await AsignacionTrabajador.crear({
        solicitudId,
        trabajadorId,
        observaciones: req.body.observaciones
      });

      res.status(201).json({
        success: true,
        message: 'Solicitud aceptada exitosamente',
        data: asignacion
      });
    } catch (error) {
      console.error('Error en aceptarSolicitud:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener asignaciones del trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerAsignaciones(req, res) {
    try {
      const { trabajadorId } = req.params;
      const { estado } = req.query;

      let asignaciones = await AsignacionTrabajador.buscarPorTrabajador(trabajadorId);

      // Filtrar por estado si se especifica
      if (estado) {
        asignaciones = asignaciones.filter(asignacion => asignacion.estado === estado);
      }

      res.status(200).json({
        success: true,
        message: 'Asignaciones obtenidas exitosamente',
        data: asignaciones
      });
    } catch (error) {
      console.error('Error en obtenerAsignaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar estado de asignación
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async actualizarEstadoAsignacion(req, res) {
    try {
      const { id } = req.params;
      const { estado, observaciones } = req.body;

      if (!estado || !['asignado', 'en_proceso', 'completado', 'cancelado'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser: asignado, en_proceso, completado o cancelado'
        });
      }

      const asignacion = await AsignacionTrabajador.actualizarEstado(id, estado, observaciones);

      res.status(200).json({
        success: true,
        message: `Estado de la asignación cambiado a ${estado}`,
        data: asignacion
      });
    } catch (error) {
      console.error('Error en actualizarEstadoAsignacion:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de asignaciones del trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerEstadisticasAsignaciones(req, res) {
    try {
      const { trabajadorId } = req.params;

      const estadisticas = await AsignacionTrabajador.obtenerEstadisticas(trabajadorId);

      res.status(200).json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: estadisticas
      });
    } catch (error) {
      console.error('Error en obtenerEstadisticasAsignaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Eliminar trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async eliminar(req, res) {
    try {
      const { id } = req.params;

      const trabajador = await Trabajador.eliminar(id);

      res.status(200).json({
        success: true,
        message: 'Trabajador eliminado exitosamente',
        data: trabajador
      });
    } catch (error) {
      console.error('Error en eliminar:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = TrabajadorController;
