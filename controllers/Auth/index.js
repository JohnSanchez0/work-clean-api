const { registrarTrabajador, registrarCliente, iniciarSesion, renovarToken, cerrarSesion, obtenerPerfil } = require('./authController.js');

module.exports = {
  registrarTrabajador,
  registrarCliente,
  iniciarSesion,
  renovarToken,
  cerrarSesion,
  obtenerPerfil
};
