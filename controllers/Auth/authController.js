// Ya no se usa Prisma para trabajadores, solo MongoDB
const ClienteMongo = require('../../models/Cliente/ClienteMongo');
const TrabajadorMongo = require('../../models/Trabajador/TrabajadorMongo');
const SuperAdminMongo = require('../../models/SuperAdmin/SuperAdminMongo');
const RefreshTokenMongo = require('../../models/RefreshToken/RefreshTokenMongo');
const { isMongoConnected, connectMongoDB } = require('../../config/mongodb');
const { subirMultiplesArchivos } = require('../../utils/cloudinary');
const jwt = require('jsonwebtoken');

class AuthController {
  /**
   * Generar access token JWT (vida corta)
   * @param {Object} userData - Datos del usuario
   * @returns {string} Access token JWT
   */
  static generarAccessToken(userData) {
    const payload = {
      userId: userData.id,
      email: userData.email,
      userType: userData.userType || 'user'
    };
    
    // Incluir trabajadorId si el usuario es un trabajador
    if (userData.trabajadorId) {
      payload.trabajadorId = userData.trabajadorId;
    }
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m' // Access token válido por 15 minutos
    });
  }

  /**
   * Generar refresh token
   * @param {Object} userData - Datos del usuario
   * @param {string} userAgent - User agent del cliente
   * @param {string} ipAddress - Dirección IP del cliente
   * @returns {Promise<Object>} Refresh token
   */
  static async generarRefreshToken(userData, userAgent = '', ipAddress = '') {
    return await RefreshTokenMongo.crear(userData.id, userAgent, ipAddress);
  }

  /**
   * Registrar un nuevo trabajador
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async registrarTrabajador(req, res) {
    try {
      // Obtener datos del body (pueden venir de JSON o form-data)
      const {
        // Datos personales
        firstName,
        lastName1,
        lastName2,
        phoneNumber,
        documentType,
        documentNumber,
        // Datos de cuenta
        email,
        password,
        confirmPassword
      } = req.body;

      // Obtener archivos de req.files (multer) o req.body.documents (JSON)
      const files = req.files || [];
      const documents = Array.isArray(files) ? files : (files.documents ? (Array.isArray(files.documents) ? files.documents : [files.documents]) : []);

      // Validaciones básicas
      if (!firstName || !lastName1 || !phoneNumber || !documentType || !documentNumber || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos obligatorios deben ser completados',
          requiredFields: ['firstName', 'lastName1', 'phoneNumber', 'documentType', 'documentNumber', 'email', 'password']
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Las contraseñas no coinciden'
        });
      }

      // Verificar si el email ya existe (en MongoDB para trabajadores)
      const emailExiste = await TrabajadorMongo.emailExiste(email);
      if (emailExiste) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Verificar si el documento ya existe (en MongoDB para trabajadores)
      const documentoExiste = await TrabajadorMongo.documentoExiste(documentNumber);
      if (documentoExiste) {
        return res.status(409).json({
          success: false,
          message: 'El número de documento ya está registrado'
        });
      }

      // Procesar y subir documentos a Cloudinary si existen
      let certificados = [];
      if (documents && documents.length > 0) {
        try {
          // Subir archivos a Cloudinary (multer proporciona objetos con buffer y originalname)
          const uploadResults = await subirMultiplesArchivos(
            documents,
            {
              folder: 'workclean/trabajadores/certificados',
              resource_type: 'auto',
              allowed_formats: ['pdf', 'jpg', 'jpeg', 'png']
            }
          );

          // Preparar datos de certificados con URLs de Cloudinary
          certificados = uploadResults.map((result, index) => ({
            nombreArchivo: documents[index].originalname || documents[index].name || `documento_${index + 1}.pdf`,
            archivoUrl: result.url,
            publicId: result.public_id
          }));
        } catch (uploadError) {
          console.error('Error al subir archivos a Cloudinary:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Error al subir los documentos',
            error: process.env.NODE_ENV === 'development' ? uploadError.message : 'Error al procesar los archivos'
          });
        }
      }

      // Crear trabajador directamente en MongoDB (incluye datos del usuario y certificados)
      const trabajadorData = {
        email,
        password,
        nombre: firstName,
        apellido1: lastName1,
        apellido2: lastName2 || null,
        telefono: phoneNumber,
        tipoDocumento: documentType,
        numeroDocumento: documentNumber,
        certificados
      };

      const trabajador = await TrabajadorMongo.crear(trabajadorData);

      // Respuesta exitosa
      res.status(201).json({
        success: true,
        message: 'Trabajador registrado exitosamente. Su cuenta está siendo validada.',
        data: {
          usuario: {
            id: trabajador.id,
            email: trabajador.email,
            nombre: trabajador.nombre,
            apellido1: trabajador.apellido1,
            apellido2: trabajador.apellido2,
            telefono: trabajador.telefono,
            tipoDocumento: trabajador.tipoDocumento,
            numeroDocumento: trabajador.numeroDocumento,
            createdAt: trabajador.createdAt
          },
          trabajador: {
            id: trabajador.id,
            estado: trabajador.estado,
            createdAt: trabajador.createdAt
          },
          certificados: trabajador.certificados.map(cert => ({
            nombreArchivo: cert.nombreArchivo,
            archivoUrl: cert.archivoUrl,
            createdAt: cert.createdAt
          }))
        }
      });

    } catch (error) {
      console.error('Error en registro de trabajador:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar el registro'
      });
    }
  }

  /**
   * Registrar un nuevo cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async registrarCliente(req, res) {
    try {
      const {
        // Datos personales
        firstName,
        lastName1,
        lastName2,
        phoneNumber,
        documentType,
        documentNumber,
        // Datos de cuenta
        email,
        password,
        confirmPassword
      } = req.body;

      // Validaciones básicas
      if (!firstName || !lastName1 || !phoneNumber || !documentType || !documentNumber || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos obligatorios deben ser completados',
          requiredFields: ['firstName', 'lastName1', 'phoneNumber', 'documentType', 'documentNumber', 'email', 'password']
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Las contraseñas no coinciden'
        });
      }

      // Verificar si el email ya existe (solo en MongoDB para clientes)
      const emailExiste = await ClienteMongo.emailExiste(email);
      if (emailExiste) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Verificar si el documento ya existe (solo en MongoDB para clientes)
      const documentoExiste = await ClienteMongo.documentoExiste(documentNumber);
      if (documentoExiste) {
        return res.status(409).json({
          success: false,
          message: 'El número de documento ya está registrado'
        });
      }

      // Crear cliente directamente en MongoDB (incluye datos del usuario)
      const clienteData = {
        email,
        password,
        nombre: firstName,
        apellido1: lastName1,
        apellido2: lastName2 || null,
        telefono: phoneNumber,
        tipoDocumento: documentType,
        numeroDocumento: documentNumber
      };

      const cliente = await ClienteMongo.crear(clienteData);

      // Respuesta exitosa
      res.status(201).json({
        success: true,
        message: 'Cliente registrado exitosamente',
        data: {
          cliente: {
            id: cliente.id,
            email: cliente.email,
            nombre: cliente.nombre,
            apellido1: cliente.apellido1,
            apellido2: cliente.apellido2,
            telefono: cliente.telefono,
            tipoDocumento: cliente.tipoDocumento,
            numeroDocumento: cliente.numeroDocumento,
            estado: cliente.estado,
            createdAt: cliente.createdAt
          }
        }
      });

    } catch (error) {
      console.error('Error en registro de cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar el registro'
      });
    }
  }

  /**
   * Iniciar sesión
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async iniciarSesion(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      // Verificar y asegurar conexión a MongoDB antes de buscar usuarios
      if (!isMongoConnected()) {
        console.log('⚠️  MongoDB no conectado, intentando conectar...');
        await connectMongoDB().catch(() => {
          console.warn('⚠️  No se pudo conectar a MongoDB, continuando con búsqueda en otras fuentes');
        });
      }

      let esClienteMongo = false;
      let esSuperAdminMongo = false;
      let esTrabajadorMongo = false;
      let clienteMongo = null;
      let superAdminMongo = null;
      let trabajadorMongo = null;
      
      // Intentar buscar en MongoDB primero (clientes, trabajadores y superadmins)
      try {
        clienteMongo = await ClienteMongo.buscarPorEmail(email, true);
      } catch (error) {
        console.warn('⚠️  Error al buscar cliente en MongoDB:', error.message);
        clienteMongo = null;
      }
      
      if (clienteMongo) {
        esClienteMongo = true;
        const passwordValida = await ClienteMongo.verificarPassword(password, clienteMongo.password);
        if (!passwordValida) {
          return res.status(401).json({
            success: false,
            message: 'Credenciales inválidas'
          });
        }
      } else {
        // Buscar trabajador en MongoDB
        try {
          trabajadorMongo = await TrabajadorMongo.buscarPorEmail(email, true);
        } catch (error) {
          console.warn('⚠️  Error al buscar trabajador en MongoDB:', error.message);
          trabajadorMongo = null;
        }
        
        if (trabajadorMongo) {
          esTrabajadorMongo = true;
          const passwordValida = await TrabajadorMongo.verificarPassword(password, trabajadorMongo.password);
          if (!passwordValida) {
            return res.status(401).json({
              success: false,
              message: 'Credenciales inválidas'
            });
          }
        } else {
          // Buscar en SuperAdminMongo
          try {
            superAdminMongo = await SuperAdminMongo.buscarPorEmail(email, true);
          } catch (error) {
            console.warn('⚠️  Error al buscar superadmin en MongoDB:', error.message);
            superAdminMongo = null;
          }
          
          if (superAdminMongo) {
            esSuperAdminMongo = true;
            const passwordValida = await SuperAdminMongo.verificarPassword(password, superAdminMongo.password);
            if (!passwordValida) {
              return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
              });
            }
            
            if (!superAdminMongo.activo) {
              return res.status(403).json({
                success: false,
                message: 'Cuenta desactivada'
              });
            }
          } else {
            // Si no se encontró en ninguna base de datos, retornar error
            console.log(`❌ Usuario no encontrado: ${email} (buscado en MongoDB)`);
            return res.status(401).json({
              success: false,
              message: 'Credenciales inválidas'
            });
          }
        }
      }
      
      console.log('Usuario encontrado:', clienteMongo || superAdminMongo || trabajadorMongo);

      let sesionesActivas = null;
      let debeRevocarSesiones = false;
      
      // Verificar si es Trabajador de MongoDB
      if (esTrabajadorMongo) {
        const trabajadorData = trabajadorMongo;
        const userId = trabajadorData.id;
        
        // Si el trabajador está pendiente, NO generar tokens y retornar estado de validación
        if (trabajadorData.estado === 'pending') {
          return res.status(202).json({
            success: true,
            message: 'Cuenta en proceso de validación',
            data: {
              usuario: {
                id: trabajadorData.id,
                email: trabajadorData.email,
                nombre: trabajadorData.nombre,
                apellido1: trabajadorData.apellido1,
                apellido2: trabajadorData.apellido2,
                telefono: trabajadorData.telefono,
                tipoDocumento: trabajadorData.tipoDocumento,
                numeroDocumento: trabajadorData.numeroDocumento,
                createdAt: trabajadorData.createdAt
              },
              trabajador: {
                id: trabajadorData.id,
                estado: trabajadorData.estado,
                certificados: trabajadorData.certificados || []
              },
              userType: 'worker',
              requiresValidation: true
              // NO incluir accessToken ni refreshToken
            }
          });
        }

        // Solo para trabajadores aprobados: generar tokens
        // Actualizar último acceso
        try {
          await TrabajadorMongo.actualizarUltimoAcceso(userId);
        } catch (error) {
          console.warn('Error al actualizar último acceso del trabajador:', error.message);
        }
        
        // Generar access token y refresh token para trabajadores aprobados
        const accessToken = AuthController.generarAccessToken({
          id: userId,
          email: trabajadorData.email,
          userType: 'worker',
          trabajadorId: userId
        });

        const refreshToken = await AuthController.generarRefreshToken({
          id: userId,
          email: trabajadorData.email,
          userType: 'worker'
        }, req.get('User-Agent') || '', req.ip || '');

        // Respuesta exitosa para trabajadores aprobados
        return res.json({
          success: true,
          message: 'Inicio de sesión exitoso',
          data: {
            usuario: {
              id: trabajadorData.id,
              email: trabajadorData.email,
              nombre: trabajadorData.nombre,
              apellido1: trabajadorData.apellido1,
              apellido2: trabajadorData.apellido2,
              telefono: trabajadorData.telefono,
              tipoDocumento: trabajadorData.tipoDocumento,
              numeroDocumento: trabajadorData.numeroDocumento,
              createdAt: trabajadorData.createdAt
            },
            trabajador: {
              id: trabajadorData.id,
              estado: trabajadorData.estado,
              certificados: trabajadorData.certificados || []
            },
            userType: 'worker',
            requiresValidation: false,
            accessToken: accessToken,
            refreshToken: refreshToken.token
          }
        });
      }
      
      if (esClienteMongo) {
        const userId = clienteMongo.id;
        const userEmail = clienteMongo.email;
        
        try {
          await RefreshTokenMongo.limpiarTokensDelUsuario(userId);
        } catch (error) {
          console.warn('⚠️  Error al limpiar tokens del cliente:', error.message);
          // No fallar el login por error de limpieza
        }

        try {
          sesionesActivas = await RefreshTokenMongo.verificarSesionesActivas(userId);
          console.log(`Cliente ${userEmail} tiene ${sesionesActivas.cantidadSesiones} sesiones activas`);
          
          debeRevocarSesiones = true;
          
          if (debeRevocarSesiones && sesionesActivas.tieneSesiones) {
            console.log(`🔄 Revocando ${sesionesActivas.cantidadSesiones} sesiones anteriores del cliente ${userEmail}`);
            await RefreshTokenMongo.revocarTodasLasSesiones(userId);
          }
        } catch (error) {
          console.warn('Error al verificar sesiones activas:', error.message);
        }
      }

      if (esSuperAdminMongo) {
        const superAdminData = superAdminMongo;
        const userId = superAdminData.id;
        const userEmail = superAdminData.email;
        
        try {
          await RefreshTokenMongo.limpiarTokensDelUsuario(userId);
        } catch (error) {
          console.warn('Error al limpiar tokens del admin/superadmin:', error.message);
        }

        let sesionesActivas = null;
        let debeRevocarSesiones = false;
        try {
          sesionesActivas = await RefreshTokenMongo.verificarSesionesActivas(userId);
          console.log(`Admin/SuperAdmin ${userEmail} tiene ${sesionesActivas.cantidadSesiones} sesiones activas`);
          
          debeRevocarSesiones = true;
          
          if (debeRevocarSesiones && sesionesActivas.tieneSesiones) {
            console.log(`Revocando ${sesionesActivas.cantidadSesiones} sesiones anteriores del admin/superadmin ${userEmail}`);
            await RefreshTokenMongo.revocarTodasLasSesiones(userId);
          }
        } catch (error) {
          console.warn('Error al verificar sesiones activas:', error.message);
        }
        
          // Actualizar último acceso
        try {
          await SuperAdminMongo.actualizarUltimoAcceso(userId);
        } catch (error) {
          console.warn(' Error al actualizar último acceso del SuperAdmin:', error.message);
        }
        
        const userType = superAdminData.nivelAcceso === 'superadmin' ? 'superadmin' : 'admin';
        const message = superAdminData.nivelAcceso === 'superadmin' 
          ? 'Inicio de sesión exitoso como SuperAdmin'
          : 'Inicio de sesión exitoso como Admin';
        
        const accessToken = AuthController.generarAccessToken({
          id: userId,
          email: userEmail,
          userType: userType
        });

        const refreshToken = await AuthController.generarRefreshToken({
          id: userId,
          email: userEmail,
          userType: userType
        }, req.get('User-Agent') || '', req.ip || '');

        return res.json({
          success: true,
          message: message,
          data: {
            usuario: {
              id: superAdminData.id,
              email: superAdminData.email,
              nombre: superAdminData.nombre,
              apellido1: superAdminData.apellido1,
              apellido2: superAdminData.apellido2,
              telefono: superAdminData.telefono,
              tipoDocumento: superAdminData.tipoDocumento,
              numeroDocumento: superAdminData.numeroDocumento,
              createdAt: superAdminData.createdAt
            },
            superAdmin: {
              id: superAdminData.id,
              nivelAcceso: superAdminData.nivelAcceso,
              permisos: superAdminData.permisos,
              activo: superAdminData.activo,
              ultimoAcceso: new Date()
            },
            userType: userType,
            accessToken: accessToken,
            refreshToken: refreshToken.token,
            sesionesRevocadas: debeRevocarSesiones && sesionesActivas ? sesionesActivas.cantidadSesiones : 0
          }
        });
      }

      // Verificar si es Cliente (solo MongoDB)
      if (esClienteMongo) {
        // Cliente en MongoDB
        const clienteData = clienteMongo;
        // Actualizar último acceso (no crítico si falla)
        // Usar _id de MongoDB directamente
        try {
          const clienteId = clienteData._id ? clienteData._id.toString() : clienteData.id;
          await ClienteMongo.actualizarUltimoAcceso(clienteId);
        } catch (error) {
          console.warn('Error al actualizar último acceso del cliente:', error.message);
          // Continuar con el login aunque falle la actualización
        }
        
        // Generar access token y refresh token
        const accessToken = AuthController.generarAccessToken({
          id: clienteData.id,
          email: clienteData.email,
          userType: 'client'
        });
        
        const refreshToken = await AuthController.generarRefreshToken({
          id: clienteData.id,
          email: clienteData.email,
          userType: 'client'
        }, req.get('User-Agent') || '', req.ip || '');

        return res.json({
          success: true,
          message: 'Inicio de sesión exitoso como Cliente',
          data: {
            usuario: {
              id: clienteData.id,
              email: clienteData.email,
              nombre: clienteData.nombre,
              apellido1: clienteData.apellido1,
              apellido2: clienteData.apellido2,
              telefono: clienteData.telefono,
              tipoDocumento: clienteData.tipoDocumento,
              numeroDocumento: clienteData.numeroDocumento,
              createdAt: clienteData.createdAt
            },
            cliente: {
              id: clienteData.id,
              estado: clienteData.estado,
              ultimoAcceso: new Date()
            },
            userType: 'client',
            accessToken: accessToken,
            refreshToken: refreshToken.token,
            sesionesRevocadas: debeRevocarSesiones && sesionesActivas ? sesionesActivas.cantidadSesiones : 0
          }
        });
      }

      // Si llegamos aquí y no es cliente, trabajador ni superadmin, es un error
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas o cuenta no válida'
      });

    } catch (error) {
      console.error('Error en inicio de sesión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar el inicio de sesión'
      });
    }
  }

  /**
   * Renovar access token usando refresh token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async renovarToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token es requerido'
        });
      }

      // Verificar si el refresh token es válido
      const tokenValido = await RefreshTokenMongo.esValido(refreshToken);
      if (!tokenValido) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token inválido o expirado'
        });
      }

      // Obtener el refresh token de la base de datos
      const refreshTokenData = await RefreshTokenMongo.buscarPorToken(refreshToken);
      if (!refreshTokenData) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token no encontrado'
        });
      }

      // Buscar el usuario en MongoDB (puede ser cliente, admin o superadmin)
      let userId = null;
      let userEmail = null;
      let userType = null;
      
      // Intentar buscar como cliente primero
      const clienteMongo = await ClienteMongo.buscarPorId(refreshTokenData.userId).catch(() => null);
      
      if (clienteMongo) {
        // Es cliente de MongoDB
        userId = clienteMongo.id;
        userEmail = clienteMongo.email;
        userType = 'client';
      } else {
        // Intentar buscar como admin/superadmin
        const superAdminMongo = await SuperAdminMongo.obtenerPorId(refreshTokenData.userId).catch(() => null);
        
        if (superAdminMongo) {
          // Es admin o superadmin de MongoDB
          userId = superAdminMongo.id;
          userEmail = superAdminMongo.email;
          userType = superAdminMongo.nivelAcceso === 'superadmin' ? 'superadmin' : 'admin';
        } else {
          return res.status(401).json({
            success: false,
            message: 'Refresh token inválido o usuario no encontrado'
          });
        }
      }

      // Generar nuevo access token
      const accessToken = AuthController.generarAccessToken({
        id: userId,
        email: userEmail,
        userType: userType
      });

      // Rotar refresh token (revocar el actual y crear uno nuevo)
      const nuevoRefreshToken = await RefreshTokenMongo.rotarToken(
        refreshToken,
        userId,
        req.get('User-Agent') || '',
        req.ip || ''
      );

      res.json({
        success: true,
        message: 'Token renovado exitosamente',
        data: {
          accessToken: accessToken,
          refreshToken: nuevoRefreshToken.token // Nuevo refresh token
        }
      });

    } catch (error) {
      console.error('Error al renovar token:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al renovar el token'
      });
    }
  }

  /**
   * Cerrar sesión y revocar refresh token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async cerrarSesion(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revocar el refresh token específico (no crítico si no existe)
        try {
          await RefreshTokenMongo.revocar(refreshToken);
        } catch (error) {
          // Si el token no existe o ya fue revocado, no es un error crítico
          console.warn('⚠️  Token no encontrado o ya revocado:', error.message);
        }
      }

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });

    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al cerrar la sesión'
      });
    }
  }

  /**
   * Verificar estado del refresh token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async verificarToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token es requerido'
        });
      }

      // Verificar si el refresh token es válido
      const tokenValido = await RefreshTokenMongo.esValido(refreshToken);
      
      if (!tokenValido) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token inválido o expirado',
          tokenActivo: false
        });
      }

      // Obtener información del token
      const refreshTokenData = await RefreshTokenMongo.buscarPorToken(refreshToken);
      
      if (!refreshTokenData) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token no encontrado',
          tokenActivo: false
        });
      }

      res.json({
        success: true,
        message: 'Token válido',
        data: {
          tokenActivo: refreshTokenData.isActive,
          expiraEn: refreshTokenData.expiresAt,
          usuarioId: refreshTokenData.userId
        }
      });

    } catch (error) {
      console.error('Error al verificar token:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al verificar el token'
      });
    }
  }

  /**
   * Obtener perfil del usuario autenticado
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async obtenerPerfil(req, res) {
    try {
      const { userId } = req.params;
      const userType = req.user?.userType; // Obtener el tipo de usuario del JWT

      // Si es cliente, buscar en MongoDB
      if (userType === 'client') {
        const cliente = await ClienteMongo.buscarPorId(userId);
        if (!cliente) {
          return res.status(404).json({
            success: false,
            message: 'Cliente no encontrado'
          });
        }

        return res.json({
          success: true,
          data: {
            usuario: {
              id: cliente.id,
              email: cliente.email,
              nombre: cliente.nombre,
              apellido1: cliente.apellido1,
              apellido2: cliente.apellido2,
              telefono: cliente.telefono,
              tipoDocumento: cliente.tipoDocumento,
              numeroDocumento: cliente.numeroDocumento,
              createdAt: cliente.createdAt
            },
            cliente: {
              id: cliente.id,
              estado: cliente.estado,
              ultimoAcceso: cliente.ultimoAcceso
            }
          }
        });
      }

      // Si es superadmin o admin, buscar en MongoDB
      if (userType === 'superadmin' || userType === 'admin') {
        const superAdmin = await SuperAdminMongo.buscarPorId(userId);
        if (!superAdmin) {
          return res.status(404).json({
            success: false,
            message: 'SuperAdmin no encontrado'
          });
        }

        return res.json({
          success: true,
          data: {
            usuario: {
              id: superAdmin.id,
              email: superAdmin.email,
              nombre: superAdmin.nombre,
              apellido1: superAdmin.apellido1,
              apellido2: superAdmin.apellido2,
              telefono: superAdmin.telefono,
              tipoDocumento: superAdmin.tipoDocumento,
              numeroDocumento: superAdmin.numeroDocumento,
              createdAt: superAdmin.createdAt
            },
            superAdmin: {
              id: superAdmin.id,
              nivelAcceso: superAdmin.nivelAcceso,
              permisos: superAdmin.permisos,
              activo: superAdmin.activo,
              ultimoAcceso: superAdmin.ultimoAcceso
            }
          }
        });
      }

      // Para trabajadores, buscar en MongoDB
      if (userType === 'worker') {
        const trabajador = await TrabajadorMongo.buscarPorId(userId);
        if (!trabajador) {
          return res.status(404).json({
            success: false,
            message: 'Trabajador no encontrado'
          });
        }

        return res.json({
          success: true,
          data: {
            usuario: {
              id: trabajador.id,
              email: trabajador.email,
              nombre: trabajador.nombre,
              apellido1: trabajador.apellido1,
              apellido2: trabajador.apellido2,
              telefono: trabajador.telefono,
              tipoDocumento: trabajador.tipoDocumento,
              numeroDocumento: trabajador.numeroDocumento,
              createdAt: trabajador.createdAt
            },
            trabajador: {
              id: trabajador.id,
              estado: trabajador.estado,
              certificados: trabajador.certificados || []
            }
          }
        });
      }

      // Si no es ninguno de los tipos conocidos
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });

    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener el perfil'
      });
    }
  }
}

module.exports = {
  registrarTrabajador: AuthController.registrarTrabajador,
  registrarCliente: AuthController.registrarCliente,
  iniciarSesion: AuthController.iniciarSesion,
  renovarToken: AuthController.renovarToken,
  cerrarSesion: AuthController.cerrarSesion,
  verificarToken: AuthController.verificarToken,
  obtenerPerfil: AuthController.obtenerPerfil
};

