# 📚 Carpool Universitario --- README

## 👥 Miembros del Proyecto

-   Javier Rozalén
-   Alberto Fernández
-   Javier de Quadros
-   Pablo de la Cruz
-   Santiago Battat
-   Ignacio Loren
-   Enrique Muñoz

------------------------------------------------------------------------

## 🚗 Información Breve del Proyecto

Carpool Universitario es una plataforma de viajes compartidos
exclusivamente para estudiantes universitarios.\
Permite a los usuarios ofrecer plazas en sus vehículos o encontrar
viajes con compañeros de universidad, fomentando el ahorro económico, la
sostenibilidad y la colaboración dentro de la comunidad universitaria.

### 🎯 Objetivos Principales

-   Facilitar el transporte estudiantil mediante una herramienta
    sencilla y accesible.
-   Reducir los costes de desplazamiento.
-   Promover la sostenibilidad y la reducción de emisiones.
-   Fomentar la comunidad universitaria.

------------------------------------------------------------------------

## 🚀 Información de Despliegue

### 🗂 Estructura del Proyecto

    UniGOsw/
    ├── src/
    │   ├── backend/       # Backend Node.js + Express + Socket.IO
    │   ├── frontend/      # Frontend Next.js + React
    │   └── infra/         # Infraestructura Docker
    ├── docs/              # Documentación
    ├── Makefile
    └── README.md

------------------------------------------------------------------------

### 🧱 Tecnologías Utilizadas

-   **Backend:** Node.js, Express, Sequelize, Socket.IO\
-   **Frontend:** Next.js 15, React, TypeScript, TailwindCSS\
-   **Base de Datos:** PostgreSQL\
-   **Infraestructura:** Docker + Docker Compose\
-   **Pagos:** Stripe + Stripe Connect\
-   **Mapas:** Google Maps API

------------------------------------------------------------------------

### 🌐 Puertos del Sistema

  Servicio      Puerto
  ------------- --------
  Backend API   8000
  Frontend      3001
  PostgreSQL    5432
  MailHog       8025
  Grafana       3000
  Prometheus    9090
  pgAdmin       5050

------------------------------------------------------------------------

## 🏃 Información de Ejecución

### ✅ Requisitos Previos

-   Node.js 18 o superior
-   Docker y Docker Compose
-   PostgreSQL
-   Cuenta de Stripe
-   Clave de Google Maps API

------------------------------------------------------------------------

### 🔧 Variables de Entorno

Ejecutar: copy .env.backup .env

En src/frontend crear .env.local y añadir: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCVIhHblM1z5tC60ZB6C7FsKMNOdkaVd9k

#### Backend (`src/backend/.env`)

    DATABASE_URL=postgresql://unigo:unigo@localhost:5432/unigo
    JWT_SECRET=your_jwt_secret
    SECRET_KEY=your_secret_key

    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_email@gmail.com
    SMTP_PASS=your_app_password

    NODE_ENV=development
    PORT=8000

#### Frontend (`src/frontend/.env.local`)

    NEXT_PUBLIC_API_BASE=http://localhost:8000/api
    NEXT_PUBLIC_API_URL=http://localhost:8000
    NEXT_PUBLIC_WS_URL=http://localhost:8000

    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

------------------------------------------------------------------------

## ⚙️ Ejecución del Proyecto

### 1️⃣ Iniciar la infraestructura

    make infra-up

### 2️⃣ Instalar dependencias

    make backend-setup
    make frontend-setup

### 3️⃣ Ejecutar migraciones

    make migrate

### 4️⃣ Ejecutar backend

    make backend

### 5️⃣ Ejecutar frontend

    make frontend

### ✅ Todo junto en un solo comando

    make dev

------------------------------------------------------------------------

## 📘 Notas Importantes

-   El sistema de notificaciones no fue implementado por limitaciones de
    tiempo.
-   La recuperación de contraseña tampoco fue desarrollada.
-   El sistema incluye:
    -   Pagos con Stripe Connect
    -   Chat en tiempo real
    -   Cancelaciones con penalización
    -   Panel de conductor y pasajero
    -   Gestión de asientos en tiempo real

------------------------------------------------------------------------

✅ Plataforma desarrollada como proyecto universitario\
✅ Enfocada en seguridad, sostenibilidad y colaboración
