const express = require('express');
const authRoutes = require('./authRoutes.js');
const adminRoutes = require('./adminRoutes.js');
const superAdminRoutes = require('./superAdminRoutes.js');
const clientRoutes = require('./clientRoutes.js');
const workerRoutes = require('./workerRoutes.js');
const diagnosticRoutes = require('./diagnostic.js');
const tokenManagementRoutes = require('./tokenManagement.js');
const paymentRoutes = require('./paymentRoutes.js');
const webhookRoutes = require('./webhookRoutes.js');
const categoriaRoutes = require('./categoriaRoutes.js');
const categoriaPublicRoutes = require('./categoriaPublicRoutes.js');
const solicitudRoutes = require('./solicitudRoutes.js');

const router = express.Router();

// Rutas de la API
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/categorias-public', categoriaPublicRoutes);
router.use('/superadmin', superAdminRoutes);
router.use('/client', clientRoutes);
router.use('/worker', workerRoutes);
router.use('/diagnostic', diagnosticRoutes);
router.use('/tokens', tokenManagementRoutes);
router.use('/payment', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/solicitudes', solicitudRoutes);

// Ruta de información de la API
router.get('/', (req, res) => {
  res.json({
    message: 'API de FaWorKi',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register/worker': 'Registrar trabajador',
        'POST /api/auth/register/client': 'Registrar cliente',
        'POST /api/auth/login': 'Iniciar sesión',
        'GET /api/auth/profile/:userId': 'Obtener perfil de usuario'
      },
      admin: {
        'GET /api/admin/trabajadores/pendientes': 'Obtener trabajadores pendientes',
        'GET /api/admin/trabajadores/aprobados': 'Obtener trabajadores aprobados',
        'PUT /api/admin/trabajadores/:id/aprobar': 'Aprobar trabajador',
        'PUT /api/admin/trabajadores/:id/rechazar': 'Rechazar trabajador',
        'GET /api/admin/estadisticas': 'Obtener estadísticas',
        'GET /api/admin/requests': 'Obtener solicitudes de trabajadores',
        'PUT /api/admin/requests/:id/approve': 'Aprobar solicitud',
        'PUT /api/admin/requests/:id/reject': 'Rechazar solicitud',
        'POST /api/admin/requests/:id/comments': 'Agregar comentario a solicitud'
      },
      superadmin: {
        'POST /api/superadmin/register': 'Registrar SuperAdmin',
        'GET /api/superadmin': 'Obtener todos los SuperAdmins',
        'GET /api/superadmin/:id': 'Obtener SuperAdmin por ID',
        'GET /api/superadmin/usuario/:usuarioId': 'Obtener SuperAdmin por usuario ID',
        'PUT /api/superadmin/:id': 'Actualizar SuperAdmin',
        'DELETE /api/superadmin/:id': 'Eliminar SuperAdmin',
        'GET /api/superadmin/check/:usuarioId': 'Verificar si usuario es SuperAdmin',
        'PUT /api/superadmin/ultimo-acceso/:usuarioId': 'Actualizar último acceso'
      },
      client: {
        'POST /api/client': 'Crear cliente',
        'GET /api/client': 'Obtener todos los clientes',
        'GET /api/client/estadisticas': 'Obtener estadísticas de clientes',
        'GET /api/client/:id': 'Obtener cliente por ID',
        'GET /api/client/usuario/:usuarioId': 'Obtener cliente por usuario ID',
        'GET /api/client/check/:usuarioId': 'Verificar si usuario es cliente',
        'PUT /api/client/:id': 'Actualizar cliente',
        'PUT /api/client/:id/estado': 'Cambiar estado del cliente',
        'PUT /api/client/:id/ultimo-acceso': 'Actualizar último acceso',
        'DELETE /api/client/:id': 'Eliminar cliente'
      },
      worker: {
        'POST /api/worker': 'Crear trabajador',
        'GET /api/worker': 'Obtener todos los trabajadores',
        'GET /api/worker/pendientes': 'Obtener trabajadores pendientes',
        'GET /api/worker/estadisticas': 'Obtener estadísticas de trabajadores',
        'GET /api/worker/solicitudes': 'Obtener solicitudes disponibles para trabajadores',
        'GET /api/worker/:id': 'Obtener trabajador por ID',
        'GET /api/worker/usuario/:usuarioId': 'Obtener trabajador por usuario ID',
        'GET /api/worker/check/:usuarioId': 'Verificar si usuario es trabajador',
        'PUT /api/worker/:id': 'Actualizar trabajador',
        'PUT /api/worker/:id/estado': 'Cambiar estado del trabajador',
        'PUT /api/worker/:id/aprobar': 'Aprobar trabajador',
        'PUT /api/worker/:id/rechazar': 'Rechazar trabajador',
        'DELETE /api/worker/:id': 'Eliminar trabajador'
      },
      diagnostic: {
        'GET /api/diagnostic/database': 'Diagnóstico de base de datos',
        'GET /api/diagnostic/env': 'Verificar variables de entorno'
      },
      payment: {
        'POST /api/payment/recargar-saldo': 'Crear preferencia de pago para recarga de saldo',
        'GET /api/payment/saldo': 'Obtener saldo del trabajador',
        'GET /api/payment/historial': 'Obtener historial de transacciones',
        'GET /api/payment/transaccion/:transactionId': 'Obtener estado de transacción específica'
      },
      webhooks: {
        'POST /api/webhooks/mercadopago': 'Webhook de Mercado Pago para procesar pagos'
      },
      solicitudes: {
        'POST /api/solicitudes': 'Crear nueva solicitud del cliente',
        'GET /api/solicitudes': 'Obtener solicitudes del cliente autenticado',
        'GET /api/solicitudes/estadisticas': 'Obtener estadísticas de solicitudes del cliente',
        'GET /api/solicitudes/:id': 'Obtener solicitud específica del cliente',
        'PUT /api/solicitudes/:id': 'Actualizar solicitud del cliente',
        'PATCH /api/solicitudes/:id/cancelar': 'Cancelar solicitud del cliente'
      }
    }
  });
});

module.exports = router;
