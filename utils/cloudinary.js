require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary
cloudinary.config({ 
  secure: true 
});

/**
 * Subir un archivo a Cloudinary
 * @param {Buffer|string} file - Archivo a subir (Buffer o path)
 * @param {Object} options - Opciones adicionales para la subida
 * @returns {Promise<Object>} Resultado de la subida con URL y public_id
 */
async function subirArchivo(file, options = {}) {
  try {
    const {
      folder = 'workclean/trabajadores/certificados',
      resource_type = 'auto',
      allowed_formats = ['pdf', 'jpg', 'jpeg', 'png'],
      max_file_size = 10485760 // 10MB
    } = options;

    // Determinar el tipo MIME y preparar el archivo para subir
    let uploadOptions = {
      folder,
      resource_type: 'auto', // Cloudinary manejará PDF como image o raw según convenga
      allowed_formats,
      max_file_size,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      access_mode: 'public',
      type: 'upload',
      invalidate: true
    };

    let uploadSource;
    let isPDF = false;
    
    // Si es un Buffer (multer), usar stream
    if (Buffer.isBuffer(file)) {
      // Detectar tipo de archivo basado en los primeros bytes
      isPDF = file[0] === 0x25 && file[1] === 0x50 && file[2] === 0x44 && file[3] === 0x46; // %PDF
      const mimeType = isPDF ? 'application/pdf' : 'image/jpeg';
      uploadSource = `data:${mimeType};base64,${file.toString('base64')}`;
    } else if (file.buffer) {
      // Si tiene propiedad buffer (objeto de multer)
      isPDF = file.buffer[0] === 0x25 && file.buffer[1] === 0x50 && file.buffer[2] === 0x44 && file.buffer[3] === 0x46;
      const mimeType = file.mimetype || (isPDF ? 'application/pdf' : 'image/jpeg');
      uploadSource = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
    } else {
      isPDF = typeof file === 'string' && file.toLowerCase().endsWith('.pdf');
      uploadSource = file;
    }

    // Si es PDF, forzamos resource_type a 'raw' para que se descargue/vea correctamente como documento
    if (isPDF) {
      uploadOptions.resource_type = 'raw';
      // Para 'raw', Cloudinary no permite 'allowed_formats', hay que quitarlo
      delete uploadOptions.allowed_formats;
    }

    const result = await cloudinary.uploader.upload(uploadSource, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('Error al subir archivo a Cloudinary:', error);
    throw new Error(`Error al subir archivo: ${error.message}`);
  }
}

/**
 * Subir múltiples archivos a Cloudinary
 * @param {Array} files - Array de archivos a subir
 * @param {Object} options - Opciones adicionales para la subida
 * @returns {Promise<Array>} Array de resultados de subida
 */
async function subirMultiplesArchivos(files, options = {}) {
  try {
    const uploadPromises = files.map(file => subirArchivo(file, options));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error al subir múltiples archivos a Cloudinary:', error);
    throw new Error(`Error al subir archivos: ${error.message}`);
  }
}

/**
 * Actualizar el modo de acceso de un archivo a público
 * @param {string} publicId - Public ID del archivo en Cloudinary
 * @returns {Promise<Object>} Resultado de la actualización
 */
async function hacerArchivoPublico(publicId) {
  try {
    // Usar la API Admin para actualizar el access_mode a público
    const result = await cloudinary.api.update(publicId, {
      access_mode: 'public',
      invalidate: true
    });
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      access_mode: result.access_mode
    };
  } catch (error) {
    console.error('Error al hacer archivo público en Cloudinary:', error);
    // Si falla con API Admin, intentar con explicit
    try {
      const result = await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        access_mode: 'public',
        invalidate: true
      });
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        access_mode: result.access_mode
      };
    } catch (explicitError) {
      console.error('Error con explicit también:', explicitError);
      // Si el archivo ya es público, no es un error crítico
      // Simplemente retornamos éxito con el public_id
      if (error.message && error.message.includes('already')) {
        return {
          success: true,
          public_id: publicId,
          access_mode: 'public',
          message: 'El archivo ya es público'
        };
      }
      throw new Error(`Error al hacer archivo público: ${error.message}`);
    }
  }
}

/**
 * Eliminar un archivo de Cloudinary
 * @param {string} publicId - Public ID del archivo en Cloudinary
 * @returns {Promise<Object>} Resultado de la eliminación
 */
async function eliminarArchivo(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Error al eliminar archivo de Cloudinary:', error);
    throw new Error(`Error al eliminar archivo: ${error.message}`);
  }
}

module.exports = {
  subirArchivo,
  subirMultiplesArchivos,
  hacerArchivoPublico,
  eliminarArchivo,
  cloudinary
};

