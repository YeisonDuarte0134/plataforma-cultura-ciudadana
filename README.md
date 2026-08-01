# Plataforma de Laboratorios de Cultura Ciudadana

Plataforma web gamificada para gestionar, hacer seguimiento y dinamizar los
laboratorios de cultura ciudadana de Bucaramanga: vitrina pública, eventos con
inscripción y asistencia por código QR, retos con evidencia y moderación,
puntos/niveles/insignias con rankings, métricas por laboratorio, notificaciones
internas y ejercicio del Habeas Data.

Proyecto de grado (UTS) — propuesta aprobada 125-2026-027.
Autores: Yeison Duarte y Janson Ardila. Director: Víctor Ochoa.

**Producción**: SPA en <https://plataforma-cultura-ciudadana.vercel.app> ·
API en <https://cultura-ciudadana-api.onrender.com>.

## Documentación

- [Documentación de la API](docs/api.md) — todos los endpoints, roles y errores.
- [Manual técnico de despliegue](docs/manual-tecnico.md) — instalación local y despliegue en Render/Vercel/Firebase.
- [Manual de usuario](docs/manual-usuario.md) — guía para ciudadanos, gestores y administradores.

## Stack

- **PostgreSQL** — base de datos principal (todo el dominio vive aquí).
- **Express.js / Node.js** — API REST (`server/`), capas estrictas
  rutas → controladores → servicios → repositorios.
- **React 18 + Vite** — SPA (`client/`), CSS propio sin frameworks de UI.
- **Firebase** — solo Authentication (identidad) y Storage (fotos de
  evidencia); no se usa Firestore.

## Estructura del repositorio

```
├── server/            # API Express + migraciones de PostgreSQL
│   ├── migrations/    # Migraciones versionadas (node-pg-migrate)
│   ├── pruebas/       # Suite de integración (Jest + Supertest)
│   └── src/
│       ├── rutas/  → controladores/ → servicios/ → repositorios/
│       ├── middleware/   # autenticación, límites de tasa, errores
│       └── db/
├── client/            # SPA React (Vite)
│   └── src/
│       ├── paginas/       # públicas, de usuario y panel /admin
│       ├── componentes/
│       └── contexto/      # sesión (Firebase Auth)
├── docs/              # documentación de API y manuales
└── render.yaml        # Blueprint de despliegue en Render
```

## Funcionalidades

- **Vitrina pública**: laboratorios, agenda de eventos y retos, ranking
  anonimizado. Participar exige cuenta (correo y contraseña vía Firebase Auth)
  con consentimiento informado versionado (Ley 1581 de 2012).
- **Participación**: inscripción con control de cupo, asistencia por QR firmado
  con ventana temporal (con respaldo manual del gestor), retos con evidencia de
  foto/texto moderada por el gestor.
- **Gamificación**: motor idempotente definido por datos (reglas de puntos,
  niveles e insignias configurables desde el panel); libro mayor auditable;
  perfil con progreso y ranking público por laboratorio.
- **Métricas**: dashboard por laboratorio (asistencia, finalización de retos,
  preferencias temáticas, participantes activos) con filtros y exportación CSV;
  consolidado global comparado para el administrador. Todo agregado y anónimo.
- **Notificaciones internas**: nuevas actividades según temáticas de interés,
  resultados de evidencias e insignias obtenidas.
- **Habeas Data**: baja voluntaria y eliminación definitiva de la cuenta con
  bitácora anonimizada (las métricas históricas no se corrompen).
- **Seguridad**: validación y sanitización de toda entrada, autorización por
  rol y por asignación de laboratorio, cabeceras de seguridad (helmet), CORS
  restringido y límites de tasa en los endpoints sensibles.

## Ejecución local

Requisitos: Node.js 20+, PostgreSQL 14+ y un proyecto de Firebase (para el
detalle completo ver el [manual técnico](docs/manual-tecnico.md)).

```sh
# 1. Base de datos
psql -U postgres -c "CREATE DATABASE cultura_ciudadana;"

# 2. API
cd server
npm install
cp .env.example .env    # configurar DATABASE_URL y credenciales de Firebase
npm run migrar
npm run dev             # http://localhost:3001

# 3. SPA (en otra terminal)
cd client
npm install
cp .env.example .env    # configurar las variables VITE_*
npm run dev             # http://localhost:5173
```

El primer administrador se promueve por consola (una sola vez):

```sh
cd server
node scripts/promover-administrador.js correo@ejemplo.com
```

## Pruebas automatizadas

```sh
cd server
npm test
```

La suite (Jest + Supertest, 138 pruebas) crea la base
`cultura_ciudadana_pruebas`, le aplica las migraciones y cubre los cuatro
módulos críticos exigidos por la propuesta: **motor de gamificación**
(otorgamiento, idempotencia, insignias, configuración), **API de
participación** (inscripciones, cupo, QR, evidencias y moderación),
**métricas** (cálculos contra datasets conocidos, filtros, CSV, anonimización)
y **autenticación/permisos** (401/403 por rol y por asignación, Habeas Data,
límites de tasa). Firebase se reemplaza por dobles inyectados: las pruebas no
necesitan credenciales.

## Migraciones

```sh
cd server
npm run migrar            # aplica las pendientes
npm run migrar:revertir   # revierte la última
npm run migrar:crear nombre-de-la-migracion
```

Nunca se edita una migración ya aplicada en producción: se crea una nueva.
En Render las migraciones corren automáticamente en cada arranque.

## Créditos de imágenes

Las fotografías de los laboratorios semilla provienen de
[Wikimedia Commons](https://commons.wikimedia.org) y se usan conforme a sus
licencias (alojadas en Firebase Storage del proyecto):

| Laboratorio | Obra original | Autor | Licencia |
|---|---|---|---|
| Parque de los Niños | [Parque San Pío de Bucaramanga juegos](https://commons.wikimedia.org/wiki/File:Parque_San_Pio_de_Bucaramanga_juegos.JPG) | Angel Paez | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| Café Madrid | [Tardes de Bucaramanga desde el parque El Bosque](https://commons.wikimedia.org/wiki/File:Tardes_de_bucaramanga_desde_el_parque_el_bosque.jpg) | Valery Susej Parra | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Parque García Rovira | [Parque García Rovira 1910-1920](https://commons.wikimedia.org/wiki/File:Parque_Garcia_Rovira_1910-1920.jpg) | Quintilio Gavassa Mibelli | Dominio público |
| Cerro del Santísimo | [Jesus Statue, Floridablanca, Santander, Colombia](https://commons.wikimedia.org/wiki/File:Jesus_Statue,_Floridablanca,_Santander,_Colombia.jpg) | Tisquesusa | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

Las imágenes fueron redimensionadas y optimizadas para la web. Para subirlas a
Firebase Storage se usa `server/scripts/subir-imagenes-laboratorios.js`.
