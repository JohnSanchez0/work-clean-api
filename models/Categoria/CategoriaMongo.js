const { client } = require('../../config/mongodb');
const { ObjectId } = require('mongodb');

// Nombre de la base de datos y colección
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'categorias';

class CategoriaMongo {
  /**
   * Obtener la colección de categorías
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
   * Crear una nueva categoría en MongoDB
   * @param {Object} categoriaData - Datos de la categoría
   * @returns {Promise<Object>} Categoría creada
   */
  static async crear(categoriaData) {
    try {
      const { nombre, icono, activa } = categoriaData;

      // Validar que el nombre no esté vacío
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre de la categoría es requerido');
      }

      // Verificar si ya existe una categoría con ese nombre
      const categoriaExistente = await this.buscarPorNombre(nombre.trim());
      if (categoriaExistente) {
        throw new Error('Ya existe una categoría con ese nombre');
      }

      // Crear documento de la categoría
      const categoriaDocument = {
        nombre: nombre.trim(),
        icono: icono || 'category',
        activa: activa !== undefined ? activa : true,
        // Metadatos
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = await this.getCollection();
      const result = await collection.insertOne(categoriaDocument);

      // Retornar el documento creado
      const categoriaCreada = await collection.findOne({ _id: result.insertedId });
      
      return this.formatCategoria(categoriaCreada);
    } catch (error) {
      throw new Error(`Error al crear categoría: ${error.message}`);
    }
  }

  /**
   * Buscar categoría por ID
   * @param {string} id - ID de la categoría (ObjectId de MongoDB)
   * @returns {Promise<Object|null>} Categoría encontrada o null
   */
  static async obtenerPorId(id) {
    try {
      const collection = await this.getCollection();
      
      // Convertir ID a ObjectId
      let objectId;
      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        return null; // ID inválido
      }

      const categoria = await collection.findOne({ _id: objectId });
      
      return categoria ? this.formatCategoria(categoria) : null;
    } catch (error) {
      throw new Error(`Error al buscar categoría: ${error.message}`);
    }
  }

  /**
   * Buscar categoría por nombre
   * @param {string} nombre - Nombre de la categoría
   * @returns {Promise<Object|null>} Categoría encontrada o null
   */
  static async buscarPorNombre(nombre) {
    try {
      const collection = await this.getCollection();
      const categoria = await collection.findOne({ 
        nombre: { $regex: new RegExp(`^${nombre}$`, 'i') } // Búsqueda case-insensitive
      });
      
      return categoria ? this.formatCategoria(categoria) : null;
    } catch (error) {
      throw new Error(`Error al buscar categoría por nombre: ${error.message}`);
    }
  }

  /**
   * Obtener todas las categorías
   * @param {Object} options - Opciones de filtrado
   * @param {boolean} options.soloActivas - Si es true, solo retorna categorías activas
   * @returns {Promise<Array>} Lista de categorías
   */
  static async obtenerTodas(options = {}) {
    try {
      const { soloActivas = true } = options;
      const collection = await this.getCollection();
      
      // Construir filtro
      const filter = {};
      if (soloActivas) {
        filter.activa = true;
      }

      const categorias = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      return categorias.map(categoria => this.formatCategoria(categoria));
    } catch (error) {
      throw new Error(`Error al obtener categorías: ${error.message}`);
    }
  }

  /**
   * Actualizar categoría
   * @param {string} id - ID de la categoría
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Categoría actualizada
   */
  static async actualizar(id, updateData) {
    try {
      const collection = await this.getCollection();
      
      // Si se está actualizando el nombre, verificar que no exista otra categoría con ese nombre
      if (updateData.nombre) {
        const categoriaExistente = await this.buscarPorNombre(updateData.nombre.trim());
        if (categoriaExistente && categoriaExistente.id !== id) {
          throw new Error('Ya existe una categoría con ese nombre');
        }
        updateData.nombre = updateData.nombre.trim();
      }

      // Agregar updatedAt
      updateData.updatedAt = new Date();

      // Convertir ID a ObjectId
      let objectId;
      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        throw new Error('ID de categoría inválido');
      }

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Categoría no encontrada');
      }

      return this.formatCategoria(result.value);
    } catch (error) {
      throw new Error(`Error al actualizar categoría: ${error.message}`);
    }
  }

  /**
   * Eliminar categoría (soft delete - cambia activa a false)
   * @param {string} id - ID de la categoría
   * @returns {Promise<Object>} Categoría eliminada
   */
  static async eliminar(id) {
    try {
      return await this.actualizar(id, { activa: false });
    } catch (error) {
      throw new Error(`Error al eliminar categoría: ${error.message}`);
    }
  }

  /**
   * Eliminar categoría definitivamente
   * @param {string} id - ID de la categoría
   * @returns {Promise<Object>} Categoría eliminada
   */
  static async eliminarDefinitivamente(id) {
    try {
      const collection = await this.getCollection();
      
      // Convertir ID a ObjectId
      let objectId;
      try {
        objectId = typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        throw new Error('ID de categoría inválido');
      }

      const categoria = await collection.findOneAndDelete({ _id: objectId });
      
      if (!categoria.value) {
        throw new Error('Categoría no encontrada');
      }

      return this.formatCategoria(categoria.value);
    } catch (error) {
      throw new Error(`Error al eliminar categoría: ${error.message}`);
    }
  }

  /**
   * Formatear categoría para la respuesta
   * @param {Object} categoria - Documento de MongoDB
   * @returns {Object} Categoría formateada
   */
  static formatCategoria(categoria) {
    if (!categoria) return null;

    return {
      id: categoria._id.toString(),
      nombre: categoria.nombre,
      icono: categoria.icono,
      activa: categoria.activa,
      createdAt: categoria.createdAt,
      updatedAt: categoria.updatedAt,
      _id: categoria._id.toString()
    };
  }
}

module.exports = CategoriaMongo;

