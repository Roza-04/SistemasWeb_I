# Sistema de Migraciones de Base de Datos

Este proyecto usa **Sequelize CLI** para gestionar las migraciones de la base de datos.

## 📋 Configuración Inicial

### 1. Instalar dependencias
```bash
cd src/backend
npm install
```

### 2. Configurar variables de entorno
Copia `.env.example` a `.env` y configura:
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=unigo_dev
DB_USER=postgres
DB_PASSWORD=postgres
```

### 3. Crear la base de datos
```bash
createdb unigo_dev
# O desde PostgreSQL:
# psql -U postgres -c "CREATE DATABASE unigo_dev;"
```

## 🚀 Comandos de Migración

### Ejecutar todas las migraciones
```bash
npm run migrate
# O desde el root:
make migrate
```

### Deshacer la última migración
```bash
npm run migrate:undo
```

### Crear una nueva migración
```bash
npm run migrate:create -- nombre-de-la-migracion
```

## 📁 Estructura de Migraciones

Las migraciones están en: `src/database/migrations/`

**Orden de ejecución:**
1. `20241208000001-create-users.js` - Tabla users
2. `20241208000002-create-email-codes.js` - Tabla email_codes
3. `20241208000003-create-rides.js` - Tabla rides
4. `20241208000004-create-bookings.js` - Tabla bookings
5. `20241208000005-create-messages.js` - Tabla messages
6. `20241208000006-create-payments.js` - Tabla payments
7. `20241208000007-create-ratings.js` - Tabla ratings
8. `20241208000008-create-trip-group-messages.js` - Tabla trip_group_messages

## 🔄 Para Nuevos Desarrolladores

Al clonar el repositorio:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env (copiar de .env.example)
cp .env.example .env

# 3. Crear base de datos
createdb unigo_dev

# 4. Ejecutar migraciones
npm run migrate

# 5. (Opcional) Cargar datos de prueba
npm run seed
```

## ⚠️ Importante

- **NUNCA** modifiques migraciones que ya se ejecutaron en producción
- **SIEMPRE** crea una nueva migración para cambios de schema
- Las migraciones se ejecutan en orden cronológico según su timestamp
- Sequelize guarda el estado en la tabla `SequelizeMeta`
