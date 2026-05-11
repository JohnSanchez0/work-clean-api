const express = require('express');
const { registrarTrabajador, registrarCliente, iniciarSesion, renovarToken, cerrarSesion, verificarToken, obtenerPerfil } = require('../../controllers/Auth/authController');
const { validateWorkerRegistration, validateLogin } = require('../../middleware/validation');
const { authenticateToken } = require('../../middleware/auth');
const { uploadDocuments } = require('../../middleware/upload');

const router = express.Router();

// Rutas de autenticación (públicas)
// Ruta de registro de trabajador con soporte para archivos (multipart/form-data)
router.post('/register/worker', uploadDocuments, validateWorkerRegistration, registrarTrabajador);
router.post('/register/client', validateWorkerRegistration, registrarCliente);
router.post('/login', validateLogin, iniciarSesion);
router.post('/refresh', renovarToken);
router.post('/logout', cerrarSesion);
router.post('/verify-token', verificarToken);

// Ruta protegida - requiere autenticación JWT
router.get('/profile/:userId', authenticateToken, obtenerPerfil);

module.exports = router;
