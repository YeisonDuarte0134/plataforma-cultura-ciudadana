# Manual de usuario

Guía de uso de la Plataforma de Laboratorios de Cultura Ciudadana de
Bucaramanga: <https://plataforma-cultura-ciudadana.vercel.app>.

La plataforma funciona en el navegador del computador o del celular, sin
instalar nada. Hay tres perfiles: **ciudadano**, **gestor de laboratorio** y
**administrador**.

---

## 1. Para la ciudadanía

### 1.1 Explorar sin cuenta

Cualquier persona puede, sin registrarse:

- Ver los **laboratorios** en la portada y el detalle de cada uno con su
  agenda de actividades.
- Ver los **eventos** (fecha, lugar, cupo) y los **retos** (puntos, fecha
  límite, tipo de evidencia).
- Consultar el **ranking** de la comunidad (menú *Ranking*), que solo muestra
  alias y avatares.

Para participar sí se necesita una cuenta.

### 1.2 Crear la cuenta

1. Botón **Crear cuenta** (arriba a la derecha).
2. Ingrese correo, contraseña (mínimo 6 caracteres) y un **alias público**
   (así le verá la comunidad; puede elegir también un avatar).
3. Lea y acepte la **política de tratamiento de datos personales**
   (Ley 1581 de 2012). Sin aceptarla no es posible registrarse.
4. Al terminar queda con la sesión iniciada. Para volver a entrar use
   **Entrar** con su correo y contraseña.

### 1.3 Elegir temáticas de interés

En **Perfil → Temáticas de interés** marque las que le interesen (medio
ambiente, movilidad, convivencia…). Cuando un laboratorio publique una
actividad de esas temáticas, le llegará una **notificación interna**.

### 1.4 Inscribirse a un evento y registrar asistencia

1. Abra el evento desde la portada o el laboratorio y pulse **Inscribirme**
   (si hay cupo, la plataforma se lo reserva). Puede cancelar la inscripción
   desde la misma página o desde su perfil.
2. El día del evento, el gestor muestra un **código QR** en el lugar.
   Escanéelo con la cámara del celular: se abre la plataforma y registra su
   asistencia (solo funciona desde 1 hora antes hasta 4 horas después del
   inicio, y hay que estar inscrito).
3. La asistencia otorga **puntos** automáticamente.
4. Si no puede escanear (sin datos, sin cámara), pida al gestor que registre
   su asistencia manualmente.

### 1.5 Completar un reto

1. Abra el reto y revise qué evidencia exige: **foto**, **texto** o ambas, y
   la fecha límite.
2. Pulse **Enviar evidencia**, adjunte la foto (JPG/PNG/WebP, máximo 5 MB)
   y/o escriba el texto, y envíe.
3. Un gestor revisará el envío:
   - **Aprobada**: recibe los puntos del reto y una notificación.
   - **Rechazada**: recibe una notificación con el comentario del gestor
     explicando qué corregir; puede **reenviar** la evidencia.
4. El estado de sus envíos está en **Perfil → Mis retos**.

### 1.6 Puntos, niveles, insignias y ranking

- En **Perfil → Mi progreso** ve sus puntos, su nivel actual, cuánto falta
  para el siguiente, sus insignias y el historial de participación.
- Las **insignias** se ganan por logros (primera asistencia, primer reto,
  constancia, explorar temáticas distintas…).
- En **Ranking** puede ver su posición en la comunidad, general o por
  laboratorio. Solo se muestran alias y avatares.

### 1.7 Notificaciones

La **campana** de la parte superior muestra cuántas notificaciones tiene sin
leer. Al abrirla verá las novedades: actividades nuevas de sus temáticas,
resultados de sus evidencias e insignias obtenidas. Al entrar quedan marcadas
como leídas.

### 1.8 Sus datos personales (Habeas Data)

En **Perfil → Privacidad y datos personales**:

- **Darme de baja**: desactiva su cuenta (deja de aparecer en la plataforma).
  Si cambia de opinión, un administrador puede reactivarla.
- **Eliminar mi cuenta definitivamente**: borra sus datos personales (correo,
  alias, teléfono, fotos de evidencia y su cuenta de acceso). Es
  **irreversible**; por eso debe escribir `ELIMINAR` para confirmar. Las
  estadísticas de participación se conservan de forma anónima, sin manera de
  vincularlas con usted.

---

## 2. Para gestores de laboratorio

Un administrador le asigna como gestor de uno o varios laboratorios. Con ello
aparece el enlace **Panel** en la parte superior.

### 2.1 Actividades

En **Panel → Laboratorios → (su laboratorio) → Actividades**:

- **+ Nueva actividad**: elija el tipo — **evento presencial** (fecha, lugar,
  cupo opcional) o **reto con evidencia** (puntos, fecha límite y tipo de
  evidencia) — y la temática.
- Las actividades nacen en **borrador**. Los estados avanzan:
  `borrador → publicada → cerrada → archivada`. Solo las **publicadas** son
  visibles al público. Al publicar, se notifica automáticamente a las
  personas interesadas en la temática.

### 2.2 Asistencia por QR

- En un evento publicado, use la acción **QR** para abrir el cartel imprimible
  con el código. Muéstrelo (impreso o en pantalla) el día del evento.
- El código es válido desde 1 hora antes hasta 4 horas después del inicio.
- En **Participantes** ve los inscritos y puede registrar **asistencia
  manual** de quien no pueda escanear.

### 2.3 Moderación de evidencias

En **Cola de evidencias** están los envíos pendientes de sus laboratorios:

- **Aprobar**: otorga automáticamente los puntos del reto al ciudadano.
- **Rechazar**: exige un comentario explicando el motivo; el ciudadano lo ve
  y puede reenviar la evidencia corregida.
- Cada envío se modera una sola vez.

### 2.4 Métricas del laboratorio

En **Métricas** (desde la barra de actividades) tiene el dashboard del
laboratorio: participantes activos, asistencia a convocatorias (inscritos vs.
asistentes con su tasa), finalización de retos y preferencias temáticas, con
**filtros** por rango de fechas, actividad y temática, y botón **Exportar
CSV** para informes institucionales. Todos los datos son agregados y
anónimos: ningún reporte identifica personas.

---

## 3. Para administradores

El administrador ve el panel completo, con todas las pestañas.

- **Laboratorios**: crear y editar laboratorios (nombre, descripción,
  ubicación, imagen), activarlos/desactivarlos y **asignar gestores** (buscar
  a la persona por alias o correo; al asignarla se promueve automáticamente a
  gestor, y al revocar su última asignación vuelve a ser ciudadana).
- **Temáticas**: catálogo de temáticas ciudadanas (crear, renombrar,
  activar/desactivar). Clasifican las actividades y alimentan la métrica de
  preferencias.
- **Gamificación**: configurar el motor por datos — puntos por acción
  (asistencia, reto aprobado como valor por defecto), el conjunto de
  **niveles** con sus umbrales y el catálogo de **insignias** (crear nuevas,
  editar, activar/desactivar). Los cambios rigen hacia adelante: nunca se
  recalculan puntos ya otorgados.
- **Métricas**: consolidado global de la plataforma y **comparativa entre
  laboratorios**, con filtro por fechas y exportación CSV.
- **Usuarios**: buscar cuentas, desactivarlas o reactivarlas (una cuenta
  eliminada por su titular no se puede modificar). Los administradores también
  pueden operar cualquier laboratorio como un gestor.

---

## 4. Preguntas frecuentes

**La página tarda en cargar la primera vez.**
El servidor gratuito "duerme" tras 15 minutos sin visitas; la primera petición
puede tardar hasta un minuto. Espere y recargue.

**Escaneé el QR y dice que está fuera de la ventana de tiempo.**
El código solo vale desde 1 hora antes hasta 4 horas después del inicio del
evento. Fuera de ese rango, pida el registro manual al gestor.

**No me deja inscribirme.**
Revise que tenga la sesión iniciada, que el evento siga publicado y que quede
cupo. Si canceló antes, puede volver a inscribirse.

**¿Quién ve mis datos?**
Su correo y teléfono solo son visibles para la administración. En el ranking y
los reportes públicos solo aparecen alias y avatares, y todas las métricas del
panel son agregadas y anónimas.

**Eliminé mi cuenta, ¿puedo volver?**
Sí: puede registrarse de nuevo con el mismo correo, pero empezará de cero (la
eliminación es irreversible y no conserva su historial personal).
