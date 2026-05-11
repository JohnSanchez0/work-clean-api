const { TrabajadorController } = require('../Trabajador');
const TrabajadorMongo = require('../../models/Trabajador/TrabajadorMongo');
const { hacerArchivoPublico } = require('../../utils/cloudinary');

class AdminController {
  /**
   * Obtener todos los trabajadores pendientes
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerTrabajadoresPendientes(req, res) {
    return TrabajadorController.obtenerPendientes(req, res);
  }

  /**
   * Aprobar trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async aprobarTrabajador(req, res) {
    return TrabajadorController.aprobar(req, res);
  }

  /**
   * Rechazar trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async rechazarTrabajador(req, res) {
    return TrabajadorController.rechazar(req, res);
  }

  /**
   * Obtener trabajadores aprobados
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerTrabajadoresAprobados(req, res) {
    try {
      // Obtener trabajadores aprobados de MongoDB
      const resultado = await TrabajadorMongo.obtenerTodos({
        estado: 'approved',
        page: 1,
        limit: 100
      });

      // Mapear los datos para el frontend
      const trabajadoresMapeados = resultado.trabajadores.map(trabajador => ({
        id: trabajador.id,
        workerId: trabajador.id,
        name: `${trabajador.nombre || ''} ${trabajador.apellido2 
          ? `${trabajador.apellido1 || ''} ${trabajador.apellido2}`.trim()
          : trabajador.apellido1 || ''}`.trim(),
        role: 'Trabajador',
        status: 'active', // Los aprobados se consideran activos
        email: trabajador.email || '',
        phone: trabajador.telefono || '',
        rating: 0, // Por defecto, se puede calcular después
        completedJobs: 0, // Por defecto, se puede calcular después
        joinDate: new Date(trabajador.createdAt).toLocaleDateString(),
        skills: [], // Se puede expandir después
        location: 'No especificado', // Se puede agregar después
        bio: 'Trabajador aprobado en la plataforma',
        avatar: null,
        documentType: trabajador.tipoDocumento || '',
        documentNumber: trabajador.numeroDocumento || '',
        certificados: trabajador.certificados || []
      }));

      res.json({
        success: true,
        data: trabajadoresMapeados
      });
    } catch (error) {
      console.error('Error al obtener trabajadores aprobados:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener trabajadores aprobados'
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
      // Obtener estadísticas usando método optimizado
      const estadisticas = await TrabajadorMongo.obtenerEstadisticas();
      
      res.json({
        success: true,
        data: estadisticas
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener estadísticas'
      });
    }
  }
}

// Obtener todas las solicitudes de trabajadores (solo pendientes)
AdminController.obtenerSolicitudes = async (req, res) => {
  try {
    // Obtener trabajadores pendientes de MongoDB
    const resultado = await TrabajadorMongo.obtenerTodos({
      estado: 'pending',
      page: 1,
      limit: 50
    });

    // Actualizar archivos a públicos y mapear los datos para el frontend
    const solicitudes = await Promise.all(
      resultado.trabajadores.map(async (trabajador) => {
        // Actualizar certificados a públicos si tienen publicId
        const certificadosActualizados = await Promise.all(
          (trabajador.certificados || []).map(async (certificado) => {
            if (certificado.publicId) {
              try {
                // Intentar hacer el archivo público
                const resultado = await hacerArchivoPublico(certificado.publicId);
                // Si se actualizó correctamente, usar la nueva URL
                if (resultado.url) {
                  return {
                    ...certificado,
                    archivoUrl: resultado.url
                  };
                }
              } catch (error) {
                console.warn(`Error al hacer público el archivo ${certificado.publicId}:`, error.message);
                // Continuar con la URL original si falla
              }
            }
            return certificado;
          })
        );

        return {
          id: trabajador.id,
          status: trabajador.estado || 'pending',
          worker: {
            id: trabajador.id,
            firstName: trabajador.nombre || '',
            lastName: trabajador.apellido2 
              ? `${trabajador.apellido1 || ''} ${trabajador.apellido2}`.trim()
              : trabajador.apellido1 || '',
            email: trabajador.email || '',
            phoneNumber: trabajador.telefono || '',
            documentType: trabajador.tipoDocumento || '',
            documentNumber: trabajador.numeroDocumento || '',
            avatar: null,
            certificados: certificadosActualizados
          },
          createdAt: trabajador.createdAt,
          comments: []
        };
      })
    );

    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener solicitudes'
    });
  }
};

// Aprobar una solicitud
AdminController.aprobarSolicitud = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verificar que el trabajador existe y está pendiente
    const trabajador = await TrabajadorMongo.buscarPorId(requestId);
    
    if (!trabajador) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (trabajador.estado !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'La solicitud ya fue procesada'
      });
    }

    // Actualizar estado a aprobado
    await TrabajadorMongo.cambiarEstado(requestId, 'approved');

    res.json({
      success: true,
      message: 'Solicitud aprobada exitosamente'
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error al aprobar solicitud'
    });
  }
};

// Rechazar una solicitud
AdminController.rechazarSolicitud = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verificar que el trabajador existe y está pendiente
    const trabajador = await TrabajadorMongo.buscarPorId(requestId);
    
    if (!trabajador) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (trabajador.estado !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'La solicitud ya fue procesada'
      });
    }

    // Actualizar estado a rechazado
    await TrabajadorMongo.cambiarEstado(requestId, 'rejected');

    res.json({
      success: true,
      message: 'Solicitud rechazada exitosamente'
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error al rechazar solicitud'
    });
  }
};

// Agregar comentario a una solicitud
AdminController.agregarComentario = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El comentario no puede estar vacío'
      });
    }

    // Por ahora solo devolvemos éxito, se puede implementar un sistema de comentarios después
    res.json({
      success: true,
      message: 'Comentario agregado exitosamente',
      comment: {
        id: Date.now(),
        comment: comment.trim(),
        createdAt: new Date(),
        author: 'Admin'
      }
    });
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  obtenerTrabajadoresPendientes: AdminController.obtenerTrabajadoresPendientes,
  aprobarTrabajador: AdminController.aprobarTrabajador,
  rechazarTrabajador: AdminController.rechazarTrabajador,
  obtenerTrabajadoresAprobados: AdminController.obtenerTrabajadoresAprobados,
  obtenerEstadisticas: AdminController.obtenerEstadisticas,
  obtenerSolicitudes: AdminController.obtenerSolicitudes,
  aprobarSolicitud: AdminController.aprobarSolicitud,
  rechazarSolicitud: AdminController.rechazarSolicitud,
  agregarComentario: AdminController.agregarComentario
};
