const express = require('express');
const router = express.Router();
const categoriaController = require('../../controllers/Admin/categoriaController');

// Ruta pública para obtener categorías (sin autenticación)
router.get('/', categoriaController.obtenerCategorias);

module.exports = router;
