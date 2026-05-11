const { SuperAdminModel } = require('../../models');

class SuperAdminController {
  /**
   * Crear un nuevo SuperAdmin
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async crearSuperAdmin(req, res) {
    try {

      const {
        email,
        password,
        nombre,
        apellido1,
        apellido2,
        telefono,
        numeroDocumento,
        tipoDocumento,
        nivelAcceso,
        permisos
      } = req.body;

      // Crear SuperAdmin
      const superAdmin = await SuperAdminModel.crearSuperAdmin({
        email,
        password,
        nombre,
        apellido1,
        apellido2,
        telefono,
        numeroDocumento,
        tipoDocumento,
        nivelAcceso,
        permisos
      });

      res.status(201).json({
        success: true,
        message: 'SuperAdmin creado exitosamente',
        data: superAdmin
      });
    } catch (error) {
      console.error('Error en crearSuperAdmin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener SuperAdmin por ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      const superAdmin = await SuperAdminModel.obtenerPorId(id);

      if (!superAdmin) {
        return res.status(404).json({
          success: false,
          message: 'SuperAdmin no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: superAdmin
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
   * Obtener SuperAdmin por ID de usuario
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerPorUsuarioId(req, res) {
    try {
      const { usuarioId } = req.params;

      const superAdmin = await SuperAdminModel.obtenerPorUsuarioId(usuarioId);

      if (!superAdmin) {
        return res.status(404).json({
          success: false,
          message: 'SuperAdmin no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: superAdmin
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
   * Obtener todos los SuperAdmins
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerTodos(req, res) {
    try {
      const {
        activo,
        nivelAcceso,
        page = 1,
        limit = 10
      } = req.query;

      const filtros = {
        activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
        nivelAcceso,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const resultado = await SuperAdminModel.obtenerTodos(filtros);

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
   * Actualizar SuperAdmin
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const datos = req.body;

      const superAdmin = await SuperAdminModel.actualizar(id, datos);

      res.status(200).json({
        success: true,
        message: 'SuperAdmin actualizado exitosamente',
        data: superAdmin
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
   * Eliminar SuperAdmin
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async eliminar(req, res) {
    try {
      const { id } = req.params;

      const resultado = await SuperAdminModel.eliminar(id);

      res.status(200).json({
        success: true,
        message: resultado.message
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

  /**
   * Verificar si un usuario es SuperAdmin
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async esSuperAdmin(req, res) {
    try {
      const { usuarioId } = req.params;

      const esSuperAdmin = await SuperAdminModel.esSuperAdmin(usuarioId);

      res.status(200).json({
        success: true,
        esSuperAdmin
      });
    } catch (error) {
      console.error('Error en esSuperAdmin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar último acceso
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async actualizarUltimoAcceso(req, res) {
    try {
      const { usuarioId } = req.params;

      await SuperAdminModel.actualizarUltimoAcceso(usuarioId);

      res.status(200).json({
        success: true,
        message: 'Último acceso actualizado'
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
}

module.exports = SuperAdminController;
