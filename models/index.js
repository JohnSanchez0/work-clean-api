const { Trabajador } = require('./Trabajador/index.js');
const { SuperAdminModel } = require('./SuperAdmin/index.js');
const { Cliente } = require('./Cliente/index.js');
const { Categoria } = require('./Categoria/index.js');
const { AsignacionTrabajador } = require('./AsignacionTrabajador/index.js');
const Transaction = require('./Transaction/Transaction.js');

module.exports = {
  Trabajador,
  SuperAdminModel,
  Cliente,
  Categoria,
  AsignacionTrabajador,
  Transaction
};
