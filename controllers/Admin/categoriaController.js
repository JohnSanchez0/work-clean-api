const { Categoria } = require('../../models');

const categoriaController = {
  // Crear nueva categoría
  crearCategoria: async (req, res) => {
    try {
      const { nombre, icono } = req.body;

      // Validaciones
      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la categoría es requerido'
        });
      }

      // Verificar si ya existe una categoría con ese nombre
      const categoriaExistente = await Categoria.buscarPorNombre(nombre.trim());
      if (categoriaExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }

      const nuevaCategoria = await Categoria.crear({
        nombre: nombre.trim(),
        icono: icono || 'category'
      });

      res.status(201).json({
        success: true,
        message: 'Categoría creada exitosamente',
        data: nuevaCategoria
      });
    } catch (error) {
      console.error('Error al crear categoría:', error);
      
      // Manejar errores de duplicado o validación
      if (error.message.includes('Ya existe una categoría con ese nombre')) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener todas las categorías
  obtenerCategorias: async (req, res) => {
    try {
      const categorias = await Categoria.obtenerTodas();
      
      res.status(200).json({
        success: true,
        data: categorias
      });
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener categoría por ID
  obtenerCategoria: async (req, res) => {
    try {
      const { id } = req.params;
      const categoria = await Categoria.obtenerPorId(id);

      if (!categoria) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      res.status(200).json({
        success: true,
        data: categoria
      });
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Actualizar categoría
  actualizarCategoria: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, icono, activa } = req.body;

      // Verificar si la categoría existe
      const categoriaExistente = await Categoria.obtenerPorId(id);
      if (!categoriaExistente) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      const datosActualizacion = {};
      if (nombre !== undefined) datosActualizacion.nombre = nombre.trim();
      if (icono !== undefined) datosActualizacion.icono = icono;
      if (activa !== undefined) datosActualizacion.activa = activa;

      const categoriaActualizada = await Categoria.actualizar(id, datosActualizacion);

      res.status(200).json({
        success: true,
        message: 'Categoría actualizada exitosamente',
        data: categoriaActualizada
      });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      
      // Manejar errores de duplicado o validación
      if (error.message.includes('Ya existe una categoría con ese nombre')) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }

      if (error.message.includes('Categoría no encontrada')) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Eliminar categoría (soft delete)
  eliminarCategoria: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar si la categoría existe
      const categoriaExistente = await Categoria.obtenerPorId(id);
      if (!categoriaExistente) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      await Categoria.eliminar(id);

      res.status(200).json({
        success: true,
        message: 'Categoría eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
};

module.exports = categoriaController;
