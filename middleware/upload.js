const multer = require('multer');

// Configurar multer para almacenar archivos en memoria
const storage = multer.memoryStorage();

// Configurar límites de archivo
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo por archivo
    files: 10 // Máximo 10 archivos
  },
  fileFilter: (req, file, cb) => {
    // Permitir solo PDFs e imágenes
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, JPG, JPEG y PNG.'), false);
    }
  }
});

// Middleware para múltiples archivos con el campo 'documents'
const uploadDocuments = (req, res, next) => {
  upload.array('documents', 10)(req, res, (err) => {
    if (err) {
      // Si es error de multer, retornar error apropiado
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'El archivo es demasiado grande. Tamaño máximo: 10MB'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Demasiados archivos. Máximo: 10 archivos'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Error al procesar archivos: ${err.message}`
        });
      }
      // Otros errores
      return res.status(400).json({
        success: false,
        message: err.message || 'Error al procesar archivos'
      });
    }
    next();
  });
};

module.exports = {
  uploadDocuments,
  upload
};

