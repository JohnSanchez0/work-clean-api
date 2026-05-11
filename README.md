# **WORK CLEAN** API

> **Work Clean API** es el núcleo de la plataforma Work Clean, diseñado para gestionar de forma eficiente el registro de trabajadores, solicitudes de servicios y flujos de pago seguros.

[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-6e56cf?style=for-the-badge&labelColor=4c3a9c)](#)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=1a1a1a)](#)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white&labelColor=1a1a1a)](#)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white&labelColor=1a1a1a)](#)

[![Mercado Pago](https://img.shields.io/badge/Mercado_Pago-009EE3?style=for-the-badge&logo=mercadopago&logoColor=white&labelColor=1a1a1a)](#)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white&labelColor=1a1a1a)](#)
[![PNPM](https://img.shields.io/badge/PNPM-CB3837?style=for-the-badge&logo=pnpm&logoColor=white&labelColor=1a1a1a)](#)

Esta guía detalla la configuración y el funcionamiento del backend, actualizado para trabajar directamente con MongoDB y servicios externos integrados.

---

### Stack tecnológico

La arquitectura se ha actualizado para utilizar una implementación directa de **MongoDB**, sustituyendo la configuración anterior de PostgreSQL y Prisma para mejorar la flexibilidad y el rendimiento.

*   **Entorno**: Node.js y Express
*   **Base de datos**: MongoDB (Driver Nativo)
*   **Pagos**: Integración con Mercado Pago
*   **Media**: Cloudinary para gestión de archivos
*   **Seguridad**: JWT, Bcrypt, Helmet y Limitación de peticiones
*   **Validación**: Joi

---

### Configuración local

**Requisitos**: Asegúrate de tener instalados Node.js y pnpm.

1.  **Instalación de dependencias**
    ```bash
    pnpm install
    ```

2.  **Variables de entorno**
    Copia el archivo de ejemplo y añade tus credenciales para MongoDB, Mercado Pago y Cloudinary.
    ```bash
    cp env.example .env
    ```

3.  **Diagnóstico**
    Ejecuta la verificación inicial para validar el entorno y la conexión con la base de datos:
    ```bash
    pnpm check
    ```

---

### Ejecución

**Modo Desarrollo**
Inicia el servidor con recarga automática y verificación de configuración.
```bash
pnpm dev
```

**Modo Producción**
```bash
pnpm start
```

---

### Referencia de comandos

| Comando | Descripción |
| :--- | :--- |
| `pnpm dev` | Inicia el servidor de desarrollo con chequeo previo |
| `pnpm check` | Ejecuta diagnósticos completos de entorno y base de datos |
| `pnpm test:mongodb` | Prueba únicamente la conectividad con la base de datos |
| `pnpm setup:mongodb-indexes` | Inicializa los índices necesarios en la base de datos |

---

### Arquitectura del proyecto

*   `controllers/`: Gestión de peticiones y lógica de negocio.
*   `models/`: Esquemas de datos e interacción directa con MongoDB.
*   `routes/`: Definición de endpoints de la API.
*   `middlewares/`: Capas de autenticación, validación y seguridad.
*   `utils/`: Cron jobs, logs y funciones de apoyo.