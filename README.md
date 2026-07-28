# Plataforma de Laboratorios de Cultura Ciudadana

Plataforma web para la gestión, seguimiento y gamificación de actividades en los laboratorios de cultura ciudadana de Bucaramanga. Proyecto de grado — propuesta aprobada 125-2026-027.

## Stack

- **PostgreSQL** — base de datos principal
- **Express.js / Node.js** — API REST (`server/`)
- **React (Vite)** — SPA (`client/`)
- Próximas fases: Firebase Authentication (identidad) y Firebase Storage (archivos)

## Estructura del repositorio

```
├── server/          # API Express + migraciones de PostgreSQL
│   ├── migrations/  # Migraciones versionadas (node-pg-migrate)
│   └── src/
│       ├── rutas/  → controladores/ → servicios/ → repositorios/
│       ├── middleware/
│       └── db/
├── client/          # SPA React (Vite)
│   └── src/
└── render.yaml      # Blueprint de despliegue en Render
```

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior en ejecución local

## Instalación y ejecución local

### 1. Base de datos

Cree la base de datos (una sola vez):

```sh
psql -U postgres -c "CREATE DATABASE cultura_ciudadana;"
```

### 2. Servidor (API)

```sh
cd server
npm install
copy .env.example .env   # En Linux/macOS: cp .env.example .env
```

Edite `server/.env` y configure `DATABASE_URL` con sus credenciales locales de PostgreSQL. **Nunca** suba el archivo `.env` al repositorio.

Ejecute las migraciones y arranque la API:

```sh
npm run migrar
npm run dev
```

La API queda en `http://localhost:3001`. Verifique: `http://localhost:3001/api/v1/salud`.

### 3. Cliente (SPA)

En otra terminal:

```sh
cd client
npm install
copy .env.example .env   # VITE_API_URL ya apunta a http://localhost:3001
npm run dev
```

Abra `http://localhost:5173`: la página muestra el mensaje almacenado en PostgreSQL, servido por la API.

## Variables de entorno

### `server/.env`

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la API | `3001` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgres://postgres:...@localhost:5432/cultura_ciudadana` |
| `CORS_ORIGIN` | Origen permitido (URL del frontend) | `http://localhost:5173` |
| `NODE_ENV` | `development` o `production` | `development` |

### `client/.env`

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API, sin barra final | `http://localhost:3001` |

## Migraciones

Las migraciones viven en `server/migrations/` y se versionan en Git.

```sh
npm run migrar            # aplica las pendientes
npm run migrar:revertir   # revierte la última
npm run migrar:crear nombre-de-la-migracion   # crea una nueva
```

## Despliegue

- **Backend + PostgreSQL — Render (plan gratuito)**: en el panel de Render use *New → Blueprint* apuntando a este repositorio; `render.yaml` crea el servicio web y la base de datos. Configure la variable `CORS_ORIGIN` con la URL del frontend en Vercel. Las migraciones se ejecutan automáticamente en cada arranque.
- **Frontend — Vercel (plan gratuito)**: importe el repositorio en Vercel con *Root Directory* = `client` (framework: Vite). Configure la variable `VITE_API_URL` con la URL del servicio de Render (sin barra final).

> Nota del plan gratuito de Render: el servicio se "duerme" tras 15 minutos sin tráfico; la primera petición posterior puede tardar ~1 minuto (arranque en frío).

## API

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/v1/salud` | Estado de la API y conectividad a PostgreSQL | Público |
| GET | `/api/v1/info` | Información de la plataforma leída de la base de datos | Público |
