# UniGO - Backend Node.js Implementation

## 📋 Resumen de Implementación

Este backend ha sido migrado de FastAPI/Python a Node.js/Express cumpliendo con los requisitos de Sistemas Web I.

### ✅ Características Implementadas

#### Autenticación y Usuarios
- ✅ Registro con email institucional (dominios permitidos)
- ✅ Verificación por código vía email (nodemailer)
- ✅ Login con JWT (token Bearer)
- ✅ Gestión de perfil de usuario
- ✅ Subida de avatares

#### Gestión de Viajes y Reservas
- ✅ Creación de viajes (rides) por conductores
- ✅ Búsqueda y filtrado de viajes
- ✅ Sistema de reservas (bookings):
  - Crear solicitud (status: pending)
  - Aceptar/rechazar por conductor
  - Confirmar (status: confirmed)
  - Completar viaje
  - Cancelar con penalizaciones

#### Sistema de Pagos con Stripe
- ✅ Integración completa de Stripe
- ✅ Setup Intent para guardar tarjetas
- ✅ Payment Intent con captura manual
- ✅ Retención de pago en accept
- ✅ Captura en complete (con comisión 15%)
- ✅ Webhooks de Stripe
- ✅ Penalizaciones por cancelación:
  - >24h: 0%
  - 12-24h: 30%
  - 6-12h: 50%
  - <6h: 100% (pasajeros)
  - <24h: 50% (conductores)

#### Chat en Tiempo Real
- ✅ WebSockets con Socket.io
- ✅ Chat por viaje (1 a 1: conductor-pasajero)
- ✅ Mensajes en tiempo real
- ✅ Indicador de escritura
- ✅ Marcado de mensajes leídos
- ✅ Notificaciones de mensajes no leídos

#### Notificaciones
- ✅ Notificaciones in-app
- ✅ Notificaciones por email:
  - Verificación de registro
  - Nueva solicitud de reserva
  - Confirmación de reserva
  - Alertas de mensajes

#### Validaciones
- ✅ Validación en servidor con Joi
- ✅ Validación de dominios de email
- ✅ Validación de datos de formularios
- ✅ Manejo de errores con mensajes claros

#### Observabilidad
- ✅ Métricas de Prometheus
- ✅ Logging con Winston
- ✅ Monitoreo de peticiones HTTP
- ✅ Métricas personalizadas (bookings, payments, messages)

### 📁 Estructura del Proyecto

\`\`\`
backend-node/
├── src/
│   ├── config/
│   │   └── database.js          # Configuración Sequelize
│   ├── models/
│   │   ├── User.js              # Modelo de usuario
│   │   ├── EmailCode.js         # Códigos de verificación
│   │   ├── Ride.js              # Modelo de viajes
│   │   ├── Booking.js           # Modelo de reservas
│   │   ├── Payment.js           # Modelo de pagos
│   │   ├── Message.js           # Modelo de mensajes
│   │   ├── Notification.js      # Modelo de notificaciones
│   │   ├── Rating.js            # Modelo de valoraciones
│   │   └── index.js             # Exportación y relaciones
│   ├── routes/
│   │   ├── auth.js              # Rutas de autenticación
│   │   ├── users.js             # Gestión de usuarios
│   │   ├── rides.js             # Gestión de viajes
│   │   ├── bookings.js          # Gestión de reservas
│   │   ├── payments.js          # Pagos con Stripe
│   │   ├── chat.js              # Chat y mensajes
│   │   ├── profile.js           # Perfil de usuario
│   │   ├── ratings.js           # Valoraciones
│   │   ├── notifications.js     # Notificaciones
│   │   └── alerts.js            # Alertas
│   ├── middleware/
│   │   ├── auth.js              # Middleware de autenticación JWT
│   │   ├── errorHandler.js      # Manejo global de errores
│   │   └── notFound.js          # Manejo de rutas no encontradas
│   ├── websocket/
│   │   └── index.js             # Configuración Socket.io
│   ├── utils/
│   │   ├── email.js             # Servicio de email (nodemailer)
│   │   ├── stripe.js            # Utilidades de Stripe
│   │   ├── validation.js        # Esquemas de validación Joi
│   │   ├── metrics.js           # Métricas de Prometheus
│   │   └── logger.js            # Logger Winston
│   └── server.js                # Punto de entrada
├── package.json
├── .env.example
└── README.md
\`\`\`

### 🔧 Configuración

Copia \`.env.example\` a \`.env\` y configura:

\`\`\`bash
# Database
DATABASE_URL=postgresql://unigo:unigo@localhost:5432/unigo

# JWT
SECRET_KEY=tu-clave-secreta-aqui
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Email (desarrollo con MailHog)
EMAIL_BACKEND=mailhog
SMTP_HOST=127.0.0.1
SMTP_PORT=1025

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
APP_COMMISSION_PERCENT=15
\`\`\`

### 🚀 Instalación y Ejecución

\`\`\`bash
# Instalar dependencias
npm install

# Ejecutar migraciones (las tablas ya existen de la versión Python)
npm run migrate

# Desarrollo
npm run dev

# Producción
npm start
\`\`\`

### 📡 Endpoints Principales

#### Autenticación
- \`POST /api/auth/register\` - Registrar usuario
- \`POST /api/auth/login\` - Iniciar sesión
- \`POST /api/auth/verify\` - Verificar email
- \`POST /api/auth/resend-code\` - Reenviar código

#### Viajes
- \`GET /api/rides\` - Listar viajes
- \`POST /api/rides\` - Crear viaje
- \`GET /api/rides/:id\` - Detalle de viaje
- \`GET /api/rides/:id/passengers\` - Ver pasajeros (solo conductor)

#### Reservas
- \`POST /api/bookings\` - Crear reserva
- \`POST /api/bookings/:id/accept\` - Aceptar reserva (crea PaymentIntent)
- \`POST /api/bookings/:id/reject\` - Rechazar reserva
- \`POST /api/bookings/:id/cancel\` - Cancelar reserva (con penalizaciones)
- \`GET /api/bookings/pending-for-driver\` - Solicitudes pendientes

#### Pagos
- \`POST /api/payments/create-setup-intent\` - Guardar tarjeta
- \`POST /api/payments/confirm-setup-intent\` - Confirmar tarjeta
- \`POST /api/payments/webhook\` - Webhook de Stripe
- \`POST /api/rides/:id/complete\` - Completar viaje (captura pago)

#### Chat (HTTP + WebSocket)
- \`GET /api/chat/trips/:tripId/messages\` - Obtener mensajes
- \`POST /api/chat/trips/:tripId/messages\` - Enviar mensaje (HTTP fallback)
- \`GET /api/chat/unread-summary\` - Resumen de no leídos

WebSocket events:
- \`authenticate\` - Autenticar usuario
- \`join_trip\` - Unirse a chat de viaje
- \`send_message\` - Enviar mensaje
- \`new_message\` - Nuevo mensaje recibido
- \`typing\` / \`stop_typing\` - Indicador de escritura
- \`mark_read\` - Marcar como leído

### 🔄 Migración desde FastAPI

Las principales diferencias:
1. **Framework**: FastAPI → Express.js
2. **ORM**: SQLAlchemy → Sequelize
3. **Validación**: Pydantic → Joi
4. **Real-time**: Polling → WebSockets (Socket.io)
5. **Email**: Python SMTP → Nodemailer

### ✅ Cumplimiento de Requisitos

#### Obligatorios
- ✅ **Node.js**: Backend implementado en Node.js/Express
- ✅ **Métodos HTTP**: GET, POST, PUT, DELETE correctamente usados
- ✅ **Login/Registro**: Con JWT y verificación de email
- ✅ **Base de Datos**: PostgreSQL con Sequelize
- ✅ **Procesamiento de formularios**: Validación cliente y servidor
- ✅ **Funcionalidad en tiempo real**: Chat con WebSockets
- ✅ **Manejo de excepciones**: Middleware de error handler
- ✅ **Notificación de errores**: Mensajes claros al usuario

#### Extras
- ✅ **Dockerizado**: docker-compose.yml incluido
- ✅ **Observabilidad**: Prometheus + Grafana
- ✅ **Pagos**: Integración completa con Stripe

## 📝 Notas Técnicas

### WebSockets vs Polling
El chat ahora usa WebSockets (Socket.io) en lugar de polling cada 20 segundos, proporcionando:
- Comunicación bidireccional en tiempo real
- Menor latencia en mensajes
- Reducción de carga en el servidor
- Indicadores de escritura en tiempo real
- Notificaciones instantáneas

### Seguridad
- JWT con expiración configurable
- Contraseñas hasheadas con bcrypt
- Validación de dominios de email institucional
- CORS configurado
- Helmet para headers de seguridad
- Rate limiting (implementable)

### Testing
Endpoints de prueba disponibles:
- \`GET /health\` - Estado del servidor
- \`GET /debug/config\` - Configuración (solo desarrollo)
- \`GET /metrics\` - Métricas de Prometheus

## 🐛 Troubleshooting

### Error de conexión a base de datos
Verifica que PostgreSQL esté corriendo y las credenciales en \`.env\` sean correctas.

### Emails no se envían
En desarrollo, usa MailHog (puerto 1025). Verifica que \`EMAIL_BACKEND=mailhog\`.

### WebSocket no conecta
Asegúrate de que el frontend use la URL correcta y envíe el token JWT en el evento \`authenticate\`.

## 📚 Referencias

- Express.js: https://expressjs.com/
- Sequelize: https://sequelize.org/
- Socket.io: https://socket.io/
- Stripe API: https://stripe.com/docs/api
- Nodemailer: https://nodemailer.com/
