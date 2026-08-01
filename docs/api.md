# Documentación de la API

API REST de la Plataforma de Laboratorios de Cultura Ciudadana.
Base de producción: `https://cultura-ciudadana-api.onrender.com/api/v1`.

## Convenciones

- **Autenticación**: encabezado `Authorization: Bearer <ID token de Firebase>`.
  El token se obtiene con el SDK de Firebase Auth en el cliente. La API lo
  verifica con firebase-admin y carga el perfil desde PostgreSQL.
- **Roles**: `ciudadano`, `gestor`, `administrador`. Los gestores además se
  autorizan por pertenencia al laboratorio (tabla `asignaciones_gestor`):
  tener el rol no basta para operar un laboratorio ajeno.
- **Errores**: siempre JSON `{ "error": "mensaje en español" }` con el código
  HTTP correspondiente: `400` entrada inválida, `401` sin token o token
  inválido, `403` sin permiso o cuenta desactivada, `404` no existe, `409`
  conflicto, `429` límite de tasa superado.
- **Límites de tasa**: 600 peticiones/15 min por IP en toda la API; límites
  específicos en registro (10/15 min por IP), asistencia (15/5 min por
  usuario), evidencias (20/15 min por usuario) y Habeas Data (5/15 min por
  usuario). Al superarlos responde `429`.
- Los cuerpos de petición y respuesta son JSON (UTF-8) salvo el envío de
  evidencias (multipart) y las exportaciones CSV.

## Salud e información

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /salud` | público | Estado de la API y conexión a la base de datos. |
| `GET /info` | público | Nombre y versión de la plataforma. |

## Usuarios y sesión

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /usuarios/opciones-registro` | público | Versión vigente del consentimiento y avatares permitidos. |
| `POST /usuarios/registro` | token Firebase | Crea el perfil. Cuerpo: `{ alias, avatar?, telefono?, aceptaConsentimiento: true }`. `409` si ya existe. |
| `GET /usuarios/me` | sesión | Perfil propio. |
| `PATCH /usuarios/me` | sesión | Edita `alias`, `avatar` y/o `telefono`. |
| `GET /usuarios/me/intereses` | sesión | Temáticas de interés propias `[{ id, nombre }]`. |
| `PUT /usuarios/me/intereses` | sesión | Reemplaza el conjunto. Cuerpo: `{ tematicas: [ids] }` (solo temáticas activas). |
| `POST /usuarios/me/baja` | sesión | Baja voluntaria: desactiva la cuenta (reversible por un administrador). |
| `DELETE /usuarios/me` | sesión | Eliminación definitiva. Cuerpo: `{ "confirmacion": "ELIMINAR" }`. Anonimiza el perfil, borra el contenido personal, la cuenta de Firebase y las fotos; conserva la bitácora anonimizada. |
| `GET /usuarios?buscar=texto` | admin | Busca usuarios por alias o correo (mínimo 2 caracteres; excluye cuentas eliminadas). |
| `PATCH /usuarios/:id/estado` | admin | Cambia `estado` a `activo` o `desactivado`. No aplica a cuentas eliminadas ni a la propia. |

## Laboratorios

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /laboratorios` | público | Vitrina: laboratorios activos. |
| `GET /laboratorios/:id` | público | Detalle de un laboratorio activo. |
| `GET /laboratorios/mios` | gestor/admin | Laboratorios que la persona administra (el admin los ve todos). |
| `GET /laboratorios/:id/admin` | gestor asignado/admin | Detalle administrable (incluye inactivos). |
| `POST /laboratorios` | admin | Crea un laboratorio. Cuerpo: `{ nombre, descripcion, ubicacion, imagenUrl? }`. |
| `PATCH /laboratorios/:id` | gestor asignado/admin | Edita campos; `activo` solo lo cambia el admin. |
| `GET /laboratorios/:id/gestores` | admin | Gestores asignados. |
| `POST /laboratorios/:id/gestores` | admin | Asigna gestor (`{ usuarioId }`); promueve el rol si era ciudadano. |
| `DELETE /laboratorios/:id/gestores/:usuarioId` | admin | Revoca; degrada el rol si era su última asignación. |

## Temáticas

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /tematicas` | público | Temáticas activas. |
| `GET /tematicas/todas` | admin | Todas, incluidas inactivas. |
| `POST /tematicas` | admin | Crea (`{ nombre }`). `409` si el nombre ya existe. |
| `PATCH /tematicas/:id` | admin | Renombra o activa/desactiva. |

## Actividades (eventos y retos)

Tabla única discriminada por `tipo` (`evento` | `reto`) con ciclo de vida
`borrador → publicada → cerrada → archivada`. La vitrina pública solo ve las
publicadas.

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /actividades?laboratorio=&tipo=&tematica=` | público | Actividades publicadas con filtros opcionales. |
| `GET /actividades/:id` | público | Detalle de una actividad publicada. |
| `GET /actividades/admin?laboratorio=` | gestor asignado/admin | Todas las del laboratorio (cualquier estado). |
| `GET /actividades/:id/admin` | gestor asignado/admin | Detalle administrable. |
| `POST /actividades` | gestor asignado/admin | Crea en borrador. Evento: `{ laboratorioId, tematicaId, tipo:'evento', titulo, descripcion, fechaInicio, lugar, cupo? }`. Reto: `{ ..., tipo:'reto', puntos (1-10000), fechaLimite, tipoEvidencia: 'foto'|'texto'|'foto_y_texto' }`. |
| `PATCH /actividades/:id` | gestor asignado/admin | Edita los campos propios de su tipo. |
| `PATCH /actividades/:id/estado` | gestor asignado/admin | Transición del ciclo de vida (`{ estado }`). Publicar dispara las notificaciones a interesados. |
| `GET /actividades/:id/qr` | gestor asignado/admin | Token QR firmado del evento (JWT propio, válido desde 1 h antes hasta 4 h después del inicio). Codifica la URL `/asistencia/<token>`. |
| `GET /actividades/:id/participantes` | gestor asignado/admin | Inscritos y su asistencia (para el respaldo manual). |

## Inscripciones y asistencia

| Método y ruta | Quién | Descripción |
|---|---|---|
| `POST /inscripciones` | sesión | Inscribe al evento (`{ actividadId }`). Controla cupo con bloqueo (`409` si se llena) y re-inscripción tras cancelar. |
| `GET /inscripciones/mias` | sesión | Inscripciones propias con datos del evento. |
| `DELETE /inscripciones/:id` | sesión (dueño) | Cancela la inscripción. |
| `POST /asistencias` | sesión | Registra asistencia con el token del QR (`{ token }`). `400` fuera de ventana, `409` si ya está registrada. Otorga puntos (idempotente). |
| `POST /asistencias/manual` | gestor asignado/admin | Respaldo manual: `{ actividadId, usuarioId }` (el usuario debe estar inscrito). |

## Evidencias (retos)

| Método y ruta | Quién | Descripción |
|---|---|---|
| `POST /evidencias` | sesión | Envío multipart: campos `actividadId`, `texto?` y archivo `foto?` (JPG/PNG/WebP, máx. 5 MB). Reglas según `tipoEvidencia` del reto. `409` si hay envío pendiente o aprobado; el reenvío tras rechazo reutiliza la fila. |
| `GET /evidencias/mias` | sesión | Envíos propios con estado y comentario del gestor. |
| `GET /evidencias/pendientes?laboratorio=` | gestor asignado/admin | Cola de moderación del laboratorio. |
| `PATCH /evidencias/:id` | gestor asignado/admin | Decisión: `{ decision: 'aprobar'|'rechazar', comentario? }`. El comentario es obligatorio al rechazar. Aprobar otorga los puntos del reto y notifica. |

## Gamificación

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /gamificacion/ranking?laboratorio=` | público | Tabla de clasificación anonimizada (posición, alias, avatar, puntos, nivel). |
| `GET /gamificacion/mi-progreso` | sesión | Puntos, nivel actual y siguiente, insignias (obtenidas y por obtener) e historial. |
| `GET /gamificacion/configuracion` | admin | Reglas de puntos, niveles e insignias completas. |
| `PATCH /gamificacion/reglas/:accion` | admin | Cambia los puntos de una regla (`{ puntos }`, 1-10000). Rige solo hacia adelante. |
| `PUT /gamificacion/niveles` | admin | Reemplaza el conjunto de niveles (consecutivos desde 1, base 0, umbrales estrictamente crecientes). |
| `POST /gamificacion/insignias` | admin | Crea insignia: `{ codigo, nombre, descripcion, icono, criterio }`. Criterios: `{tipo:'contador', accion, umbral}` o `{tipo:'tematicas_distintas', umbral}`. |
| `PATCH /gamificacion/insignias/:id` | admin | Edita (el código es inmutable) o activa/desactiva sin revocar las otorgadas. |

## Notificaciones

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /notificaciones` | sesión | Bandeja propia: `{ noLeidas, notificaciones: [...] }` (últimas 50). |
| `PATCH /notificaciones/leidas` | sesión | Marca todas como leídas. |

## Métricas y reportes

Todos los indicadores se agregan sobre la bitácora `eventos_participacion`;
nada expone identificadores de personas. Con `?formato=csv` responden el
mismo reporte como descarga CSV (secciones separadas, UTF-8 con BOM).

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /metricas/laboratorios/:id?desde=&hasta=&actividad=&tematica=` | gestor asignado/admin | Dashboard del laboratorio: resumen del periodo, asistencia por evento (inscritos vs. asistentes con tasa), finalización por reto y preferencias temáticas. Fechas `AAAA-MM-DD` (`hasta` inclusivo). |
| `GET /metricas/globales?desde=&hasta=` | admin | Consolidado de la plataforma y comparativa entre laboratorios. |

## Bitácora de participación

`eventos_participacion` es una tabla solo-inserción que registra
`inscripcion`, `cancelacion_inscripcion`, `asistencia`, `envio_evidencia`,
`aprobacion_evidencia` y `rechazo_evidencia` con marca de tiempo. De ella
derivan la gamificación y todas las métricas; al eliminar una cuenta se
conserva anonimizada.
