import pool from '../db/pool.js';

/**
 * Fase 11 — notificaciones internas (HU-19). Las funciones de generación
 * reciben el cliente de la transacción en curso: la notificación se crea
 * en el mismo COMMIT que el hecho que la produce (publicación, moderación,
 * insignia), igual que la bitácora y la gamificación.
 */

/**
 * Notifica una actividad recién publicada a todas las personas activas
 * cuyas temáticas de interés incluyen la de la actividad. Un solo
 * INSERT...SELECT: no se cargan los interesados en memoria.
 */
export async function crearNotificacionesActividadPublicada(cliente, actividad) {
  const mensaje =
    actividad.tipo === 'reto'
      ? `Nuevo reto en una temática que te interesa: «${actividad.titulo}»`
      : `Nueva actividad en una temática que te interesa: «${actividad.titulo}»`;
  await cliente.query(
    `INSERT INTO notificaciones (usuario_id, tipo, mensaje, actividad_id)
     SELECT i.usuario_id, 'nueva_actividad', $2, $3
       FROM intereses_usuario i
       JOIN usuarios u ON u.id = i.usuario_id
      WHERE i.tematica_id = $1 AND u.estado = 'activo'`,
    [actividad.tematica_id, mensaje, actividad.id]
  );
}

/** Notifica al dueño de una evidencia el resultado de la moderación. */
export async function crearNotificacionEvidencia(cliente, evidencia, decision) {
  const aprobada = decision === 'aprobar';
  const mensaje = aprobada
    ? `Tu evidencia del reto «${evidencia.titulo}» fue aprobada. ¡Puntos para ti!`
    : `Tu evidencia del reto «${evidencia.titulo}» fue rechazada. Revisa el comentario del gestor y vuelve a intentarlo.`;
  await cliente.query(
    `INSERT INTO notificaciones (usuario_id, tipo, mensaje, actividad_id)
     VALUES ($1, $2, $3, $4)`,
    [
      evidencia.usuario_id,
      aprobada ? 'evidencia_aprobada' : 'evidencia_rechazada',
      mensaje,
      evidencia.actividad_id,
    ]
  );
}

/** Notifica una insignia recién otorgada. */
export async function crearNotificacionInsignia(cliente, usuarioId, insignia) {
  await cliente.query(
    `INSERT INTO notificaciones (usuario_id, tipo, mensaje)
     VALUES ($1, 'insignia_otorgada', $2)`,
    [usuarioId, `¡Obtuviste la insignia «${insignia.nombre}»!`]
  );
}

/* --- Bandeja de la persona --- */

export async function listarNotificacionesDeUsuario(usuarioId, limite = 50) {
  const { rows } = await pool.query(
    `SELECT id, tipo, mensaje, actividad_id, leida, created_at
       FROM notificaciones
      WHERE usuario_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [usuarioId, limite]
  );
  return rows;
}

export async function contarNoLeidas(usuarioId) {
  const { rows: [fila] } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM notificaciones WHERE usuario_id = $1 AND NOT leida',
    [usuarioId]
  );
  return fila.total;
}

/** Marca como leídas todas las notificaciones de la persona. */
export async function marcarTodasLeidas(usuarioId) {
  const { rowCount } = await pool.query(
    'UPDATE notificaciones SET leida = true WHERE usuario_id = $1 AND NOT leida',
    [usuarioId]
  );
  return rowCount;
}
