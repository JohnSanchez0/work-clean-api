const express = require('express');
const router = express.Router();
const categoriaController = require('../../controllers/Admin/categoriaController');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

// Todas las rutas requieren autenticación y permisos de admin
router.use(authenticateToken);
router.use(requireAdmin);

// Rutas para categorías
router.post('/', categoriaController.crearCategoria);
router.get('/', categoriaController.obtenerCategorias);
router.get('/:id', categoriaController.obtenerCategoria);
router.put('/:id', categoriaController.actualizarCategoria);
router.delete('/:id', categoriaController.eliminarCategoria);

module.exports = router;
