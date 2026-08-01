# Manual técnico de despliegue

Guía para instalar la plataforma en un entorno local de desarrollo y para
desplegarla en producción (Render + Vercel + Firebase), tal como opera la
instancia oficial.

## 1. Arquitectura

```
┌─────────────┐   HTTPS    ┌──────────────────┐   SQL    ┌────────────────┐
│  SPA React   │ ─────────▶ │  API Express      │ ───────▶ │  PostgreSQL     │
│  (Vercel)    │            │  (Render)         │          │  (Render)       │
└──────┬──────┘            └────────┬─────────┘          └────────────────┘
       │  SDK Firebase Auth          │  firebase-admin
       ▼                             ▼
┌──────────────────────────────────────────────┐
│  Firebase: Authentication + Storage (fotos)   │
└──────────────────────────────────────────────┘
```

- **PostgreSQL es la base de datos principal**: usuarios (perfil de dominio),
  laboratorios, actividades, participación, gamificación, notificaciones y
  métricas. Firebase solo presta identidad (Auth) y almacenamiento de fotos
  (Storage); no se usa Firestore.
- La API verifica el ID token de Firebase en cada petición y carga el perfil
  desde PostgreSQL (roles y estado viven en la base de datos).
- El esquema se versiona con migraciones (`node-pg-migrate`); en producción se
  aplican automáticamente en cada arranque del servicio.

## 2. Requisitos

- Node.js 20 o superior y npm.
- PostgreSQL 14 o superior (el proyecto se desarrolló con 17 local y 18 en Render).
- Un proyecto de Firebase (plan Blaze si se usa Storage) con:
  - **Authentication** habilitado con proveedor *Correo electrónico/contraseña*.
  - **Storage** habilitado (bucket por defecto).
  - Una **cuenta de servicio** (Configuración → Cuentas de servicio → Generar
    nueva clave privada). El JSON resultante es **secreto**: nunca va al
    repositorio ni a un chat; guárdelo fuera del árbol del proyecto.
  - La **configuración web pública** (apiKey, authDomain, projectId, appId) de
    una app web registrada en el proyecto. Estos valores no son secretos.

## 3. Instalación local

### 3.1 Base de datos

```sh
psql -U postgres -c "CREATE DATABASE cultura_ciudadana;"
```

La base de pruebas (`cultura_ciudadana_pruebas`) la crea `npm test`
automáticamente.

### 3.2 API (`server/`)

```sh
cd server
npm install
cp .env.example .env
```

Variables de `server/.env`:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto de la API (3001 por defecto). |
| `DATABASE_URL` | Conexión a PostgreSQL local. |
| `DATABASE_URL_PRUEBAS` | Base exclusiva de las pruebas. |
| `CORS_ORIGIN` | Origen permitido (URL de la SPA). |
| `NODE_ENV` | `development` o `production`. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta al JSON de la cuenta de servicio (fuera del repo). |
| `FIREBASE_STORAGE_BUCKET` | Bucket de Storage (ej. `proyecto.firebasestorage.app`). |
| `QR_JWT_SECRETO` | Secreto para firmar los tokens QR de asistencia (cadena larga aleatoria). |

```sh
npm run migrar   # aplica las migraciones
npm run dev      # API con recarga en http://localhost:3001
```

Verificación: `GET http://localhost:3001/api/v1/salud` debe responder
`{"estado":"ok", ...}`.

### 3.3 SPA (`client/`)

```sh
cd client
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
```

Variables de `client/.env`: `VITE_API_URL` (URL de la API sin barra final) y
la configuración pública de Firebase (`VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_APP_ID`).

> Al agregar una variable nueva, actualice también el `.env.example`
> correspondiente. Los `.env` reales están en `.gitignore`.

### 3.4 Primer administrador

Cree una cuenta desde la SPA (registro normal) y promuévala por consola:

```sh
cd server
node scripts/promover-administrador.js correo@ejemplo.com
```

Desde el panel `/admin` ese administrador ya puede crear laboratorios,
asignar gestores y administrar el resto.

### 3.5 Pruebas

```sh
cd server
npm test    # 138 pruebas de integración; no requiere credenciales de Firebase
```

Las dependencias externas (verificador de tokens, Storage, cuentas de Auth)
se inyectan en `crearApp(...)`; las pruebas usan dobles.

## 4. Despliegue en producción

### 4.1 API + PostgreSQL en Render

1. *New → Blueprint* apuntando al repositorio: `render.yaml` crea el servicio
   web (`cultura-ciudadana-api`) y la base de datos. El plan gratuito de la
   base de datos **expira a los 90 días**: anote la fecha y migre o actualice
   el plan antes.
2. El `startCommand` es `npm run migrar && npm start`: cada deploy aplica las
   migraciones pendientes antes de arrancar (el plan gratuito no tiene
   `preDeployCommand`).
3. Variables/secretos en el panel del servicio:
   - `CORS_ORIGIN`: URL exacta de la SPA en Vercel (sin barra final).
   - `FIREBASE_STORAGE_BUCKET`: bucket del proyecto (ya viene en el blueprint).
   - `QR_JWT_SECRETO`: el blueprint lo autogenera (`generateValue`).
   - **Secret File**: suba el JSON de la cuenta de servicio como
     `firebase-service-account.json` y defina
     `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json`.
4. Render redespliega automáticamente con cada push a `main`.

### 4.2 SPA en Vercel

1. Importe el repositorio con **Root Directory = `client`** (framework Vite).
2. Variables de entorno del proyecto: `VITE_API_URL` (URL del servicio de
   Render) y las cuatro `VITE_FIREBASE_*` públicas.
3. Cada push a `main` publica automáticamente.

### 4.3 Firebase

- En **Authentication → Settings → Dominios autorizados** agregue el dominio
  de Vercel (p. ej. `plataforma-cultura-ciudadana.vercel.app`).
- Las reglas de Storage pueden quedar cerradas: la API sube y borra las fotos
  con el Admin SDK y entrega URLs con token de descarga.

### 4.4 Particularidades del plan gratuito

- **Arranque en frío**: tras ~15 minutos sin tráfico, la primera petición
  tarda 25–60 s. Una lista vacía al abrir la SPA no es un error: espere y
  recargue.
- La instancia se reinicia en cada deploy; los límites de tasa (en memoria)
  se reinician con ella, lo cual es aceptable para este alcance.

## 5. Seguridad

- **Autenticación**: Firebase Auth (las contraseñas nunca tocan la API).
  Cada petición valida el ID token con firebase-admin.
- **Autorización en dos niveles**: rol (`ciudadano`/`gestor`/`administrador`)
  y pertenencia (`asignaciones_gestor`): un gestor solo opera sus laboratorios.
- **Validación y sanitización**: toda entrada se valida en la capa de
  servicios (tipos, rangos, formatos; los textos eliminan caracteres de
  control); el SQL usa exclusivamente consultas parametrizadas (sin
  concatenación), y React escapa la salida por defecto (sin `innerHTML`).
- **Cabeceras y CORS**: `helmet` activo y CORS restringido al origen de la SPA.
- **Límites de tasa** (`express-rate-limit`, con `trust proxy` para la IP
  real detrás de Render): global 600/15 min por IP; registro 10/15 min por
  IP; asistencia 15/5 min **por usuario** (en un evento muchas personas
  comparten la IP del lugar); evidencias 20/15 min y Habeas Data 5/15 min por
  usuario. Responden `429` con mensaje en español.
- **Cuerpos acotados**: JSON máx. 100 kB; fotos máx. 5 MB (JPG/PNG/WebP).
- **Secretos**: cuenta de servicio y URL externa de la BD fuera del
  repositorio; `server/.env` y `client/.env` ignorados por Git; en Render los
  secretos viven como variables/Secret Files.
- **Datos personales (Ley 1581 de 2012)**: consentimiento versionado en el
  registro, reportes solo agregados/anonimizados, baja y eliminación
  definitiva con anonimización de la bitácora.

### Estado de la auditoría de dependencias (cierre del proyecto)

`npm audit` no reporta vulnerabilidades **críticas**. Quedan avisos conocidos
y analizados, sin vector aplicable en esta plataforma:

- `glob` (high, vía `node-pg-migrate`): el aviso es del **CLI** de glob
  (inyección con `-c/--cmd`); aquí glob se usa solo como librería para listar
  los archivos de migración del propio repositorio. Actualizar exigiría
  `node-pg-migrate` 9 (cambio mayor).
- `react-router` (high, GHSA-qwww-vcr4-c8h2): afecta el **modo RSC**
  (acciones de servidor), que esta SPA no usa (enrutador clásico en modo
  declarativo). Se mantiene la última versión estable (7.18.2); el único
  "arreglo" que ofrece npm es bajar a 7.11, un retroceso sin beneficio real.
- `uuid` (moderate, vía `firebase-admin`/`@google-cloud/storage`): uso
  interno de esas librerías; sin exposición propia.

## 6. Operación

- **Logs y métricas**: panel de Render (servicio `cultura-ciudadana-api`).
- **Base de datos de producción**: usar la *External Database URL* de Render
  con `psql` o scripts puntuales; para diagnóstico son preferibles consultas
  de solo lectura.
- **Copias de seguridad**: el plan gratuito de Render no incluye backups
  automáticos; exporte periódicamente con `pg_dump` usando la URL externa.
- **Reversión**: `npm run migrar:revertir` deshace la última migración
  (úselo solo en local; en producción cree una migración correctiva nueva).
