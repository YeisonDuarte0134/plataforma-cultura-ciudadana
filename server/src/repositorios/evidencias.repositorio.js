import pool from '../db/pool.js';
import { insertarEventoParticipacion } from './participacion.repositorio.js';

export async function buscarEvidenciaDeUsuario(actividadId, usuarioId) {
  const { rows } = await pool.query(
    `SELECT id, estado, texto, foto_url, comentario_gestor, created_at, updated_at
       FROM evidencias
      WHERE actividad_id = $1 AND usuario_id = $2`,
    [actividadId, usuarioId]
  );
  return rows[0] ?? null;
}

export async function buscarEvidenciaPorId(id) {
  const { rows } = await pool.query(
    `SELECT e.id, e.actividad_id, e.usuario_id, e.estado, e.texto, e.foto_url,
            e.comentario_gestor, a.laboratorio_id, a.tematica_id
       FROM evidencias e
       JOIN actividades a ON a.id = e.actividad_id
      WHERE e.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Registra un envío de evidencia. El reenvío tras un rechazo reutiliza la
 * fila (única por reto↔usuario) y vuelve el estado a `pendiente`, limpiando
 * la moderación anterior. El evento de bitácora queda en la misma
 * transacción, igual que en inscripciones y asistencias.
 */
export async function guardarEnvio(actividad, usuarioId, { texto, fotoUrl }) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rows } = await cliente.query(
      `INSERT INTO evidencias (actividad_id, usuario_id, texto, foto_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (actividad_id, usuario_id) DO UPDATE SET
         texto = EXCLUDED.texto,
         foto_url = EXCLUDED.foto_url,
         estado = 'pendiente',
         comentario_gestor = NULL,
         moderada_por = NULL,
         moderada_en = NULL,
         updated_at = current_timestamp
       RETURNING id, actividad_id, usuario_id, estado, texto, foto_url, created_at, updated_at`,
      [actividad.id, usuarioId, texto, fotoUrl]
    );

    await insertarEventoParticipacion(cliente, {
      usuarioId,
      actividadId: actividad.id,
      laboratorioId: actividad.laboratorio_id,
      tematicaId: actividad.tematica_id,
      tipoEvento: 'envio_evidencia',
    });

    await cliente.query('COMMIT');
    return rows[0];
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

/**
 * Aplica la decisión del gestor sobre una evidencia pendiente y deja el
 * evento correspondiente en la bitácora (a nombre del ciudadano dueño del
 * envío: la bitácora registra su participación, no la del moderador).
 */
export async function moderarEvidencia(evidencia, decision, comentario, gestorId) {
  const estado = decision === 'aprobar' ? 'aprobada' : 'rechazada';
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rows } = await cliente.query(
      `UPDATE evidencias SET
         estado = $2,
         comentario_gestor = $3,
         moderada_por = $4,
         moderada_en = current_timestamp,
         updated_at = current_timestamp
       WHERE id = $1
       RETURNING id, actividad_id, usuario_id, estado, comentario_gestor, moderada_en`,
      [evidencia.id, estado, comentario, gestorId]
    );

    await insertarEventoParticipacion(cliente, {
      usuarioId: evidencia.usuario_id,
      actividadId: evidencia.actividad_id,
      laboratorioId: evidencia.laboratorio_id,
      tematicaId: evidencia.tematica_id,
      tipoEvento: decision === 'aprobar' ? 'aprobacion_evidencia' : 'rechazo_evidencia',
    });

    await cliente.query('COMMIT');
    return rows[0];
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

/** Envíos del ciudadano con los datos del reto, para "mis evidencias". */
export async function listarEvidenciasDeUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT e.id, e.estado, e.texto, e.foto_url, e.comentario_gestor,
            e.created_at, e.updated_at,
            a.id AS actividad_id, a.titulo, a.puntos, a.fecha_limite,
            a.tipo_evidencia, a.estado AS actividad_estado,
            l.nombre AS laboratorio_nombre
       FROM evidencias e
       JOIN actividades a ON a.id = e.actividad_id
       JOIN laboratorios l ON l.id = a.laboratorio_id
      WHERE e.usuario_id = $1
      ORDER BY e.updated_at DESC`,
    [usuarioId]
  );
  return rows;
}

/** Cola de moderación de un laboratorio: pendientes, la más antigua primero. */
export async function listarEvidenciasPendientes(laboratorioId) {
  const { rows } = await pool.query(
    `SELECT e.id, e.texto, e.foto_url, e.created_at, e.updated_at,
            a.id AS actividad_id, a.titulo, a.puntos, a.fecha_limite, a.tipo_evidencia,
            u.alias, u.correo, u.avatar
       FROM evidencias e
       JOIN actividades a ON a.id = e.actividad_id
       JOIN usuarios u ON u.id = e.usuario_id
      WHERE a.laboratorio_id = $1 AND e.estado = 'pendiente'
      ORDER BY e.updated_at`,
    [laboratorioId]
  );
  return rows;
}
