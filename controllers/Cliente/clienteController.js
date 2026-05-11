const ClienteMongo = require('../../models/Cliente/ClienteMongo');

class ClienteController {
  /**
   * Crear un nuevo cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async crearCliente(req, res) {
    try {
      return res.status(400).json({
        success: false,
      });
    } catch (error) {
      console.error('Error en crearCliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener cliente por ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      const cliente = await ClienteMongo.buscarPorId(id);

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: cliente
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
   * Obtener cliente por ID de usuario
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerPorUsuarioId(req, res) {
    try {
      const { usuarioId } = req.params;

      const cliente = await ClienteMongo.buscarPorUsuarioId(usuarioId);

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: cliente
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
   * Obtener todos los clientes
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

      const resultado = await ClienteMongo.obtenerTodos(filtros);

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
   * Actualizar cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const datos = req.body;

      const cliente = await ClienteMongo.actualizar(id, datos);

      res.status(200).json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: cliente
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
   * Cambiar estado del cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async cambiarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!estado || !['active', 'inactive', 'suspended'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser: active, inactive o suspended'
        });
      }

      const cliente = await ClienteMongo.cambiarEstado(id, estado);

      res.status(200).json({
        success: true,
        message: `Estado del cliente cambiado a ${estado}`,
        data: cliente
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
   * Actualizar último acceso del cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async actualizarUltimoAcceso(req, res) {
    try {
      const { id } = req.params;

      const cliente = await ClienteMongo.actualizarUltimoAcceso(id);

      res.status(200).json({
        success: true,
        message: 'Último acceso actualizado',
        data: cliente
      });
    } catch (error) {
      console.error('Error en actualizarUltimoAcceso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Verificar si un usuario es cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async esCliente(req, res) {
    try {
      const { usuarioId } = req.params;

      const esCliente = await ClienteMongo.esCliente(usuarioId);

      res.status(200).json({
        success: true,
        esCliente
      });
    } catch (error) {
      console.error('Error en esCliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de clientes
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerEstadisticas(req, res) {
    try {
      const estadisticas = await ClienteMongo.obtenerEstadisticas();
      console.log('Estadísticas de clientes obtenidas:', estadisticas);

      res.status(200).json({
        success: true,
        data: estadisticas
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
   * Eliminar cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async eliminar(req, res) {
    try {
      const { id } = req.params;

      const cliente = await ClienteMongo.eliminar(id);

      res.status(200).json({
        success: true,
        message: 'Cliente eliminado exitosamente',
        data: cliente
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

module.exports = ClienteController;
