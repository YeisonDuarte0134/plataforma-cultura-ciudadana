import pool from '../db/pool.js';
import { insertarEventoParticipacion } from './participacion.repositorio.js';

/**
 * Inscribe respetando el cupo incluso ante peticiones concurrentes: la
 * fila de la actividad se bloquea (SELECT ... FOR UPDATE) durante la
 * transacción, de modo que el conteo de inscripciones activas y la
 * inserción son atómicos.
 *
 * Devuelve: 'creada' | 'reactivada' | 'duplicada' | 'sin_cupo'.
 */
export async function inscribirConCupo(actividad, usuarioId) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    await cliente.query('SELECT id FROM actividades WHERE id = $1 FOR UPDATE', [actividad.id]);

    const { rows: [existente] } = await cliente.query(
      'SELECT id, estado FROM inscripciones WHERE actividad_id = $1 AND usuario_id = $2',
      [actividad.id, usuarioId]
    );

    if (existente?.estado === 'activa') {
      await cliente.query('ROLLBACK');
      return { resultado: 'duplicada' };
    }

    if (actividad.cupo !== null) {
      const { rows: [{ activas }] } = await cliente.query(
        `SELECT COUNT(*)::int AS activas FROM inscripciones
          WHERE actividad_id = $1 AND estado = 'activa'`,
        [actividad.id]
      );
      if (activas >= actividad.cupo) {
        await cliente.query('ROLLBACK');
        return { resultado: 'sin_cupo' };
      }
    }

    let inscripcion;
    if (existente) {
      const { rows } = await cliente.query(
        `UPDATE inscripciones SET estado = 'activa', updated_at = current_timestamp
          WHERE id = $1 RETURNING id, actividad_id, usuario_id, estado, created_at`,
        [existente.id]
      );
      inscripcion = rows[0];
    } else {
      const { rows } = await cliente.query(
        `INSERT INTO inscripciones (actividad_id, usuario_id)
         VALUES ($1, $2) RETURNING id, actividad_id, usuario_id, estado, created_at`,
        [actividad.id, usuarioId]
      );
      inscripcion = rows[0];
    }

    await insertarEventoParticipacion(cliente, {
      usuarioId,
      actividadId: actividad.id,
      laboratorioId: actividad.laboratorio_id,
      tematicaId: actividad.tematica_id,
      tipoEvento: 'inscripcion',
    });

    await cliente.query('COMMIT');
    return { resultado: existente ? 'reactivada' : 'creada', inscripcion };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

export async function buscarInscripcionPorId(id) {
  const { rows } = await pool.query(
    `SELECT i.id, i.actividad_id, i.usuario_id, i.estado,
            a.laboratorio_id, a.tematica_id
       FROM inscripciones i
       JOIN actividades a ON a.id = i.actividad_id
      WHERE i.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function buscarInscripcionActiva(actividadId, usuarioId) {
  const { rows } = await pool.query(
    `SELECT id, estado FROM inscripciones
      WHERE actividad_id = $1 AND usuario_id = $2 AND estado = 'activa'`,
    [actividadId, usuarioId]
  );
  return rows[0] ?? null;
}

export async function cancelarInscripcion(inscripcion) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    await cliente.query(
      `UPDATE inscripciones SET estado = 'cancelada', updated_at = current_timestamp
        WHERE id = $1`,
      [inscripcion.id]
    );

    await insertarEventoParticipacion(cliente, {
      usuarioId: inscripcion.usuario_id,
      actividadId: inscripcion.actividad_id,
      laboratorioId: inscripcion.laboratorio_id,
      tematicaId: inscripcion.tematica_id,
      tipoEvento: 'cancelacion_inscripcion',
    });

    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

export async function listarInscripcionesDeUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT i.id, i.estado, i.created_at,
            a.id AS actividad_id, a.titulo, a.fecha_inicio, a.lugar, a.estado AS actividad_estado,
            l.nombre AS laboratorio_nombre,
            (SELECT 1 FROM asistencias s WHERE s.actividad_id = a.id AND s.usuario_id = i.usuario_id) IS NOT NULL AS asistio
       FROM inscripciones i
       JOIN actividades a ON a.id = i.actividad_id
       JOIN laboratorios l ON l.id = a.laboratorio_id
      WHERE i.usuario_id = $1 AND i.estado = 'activa'
      ORDER BY a.fecha_inicio`,
    [usuarioId]
  );
  return rows;
}

/** Inscritos activos de un evento con su estado de asistencia (vista del gestor). */
export async function listarParticipantes(actividadId) {
  const { rows } = await pool.query(
    `SELECT u.id AS usuario_id, u.alias, u.correo, u.avatar,
            i.created_at AS inscrito_en,
            s.metodo AS asistencia_metodo, s.created_at AS asistio_en
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN asistencias s ON s.actividad_id = i.actividad_id AND s.usuario_id = i.usuario_id
      WHERE i.actividad_id = $1 AND i.estado = 'activa'
      ORDER BY u.alias`,
    [actividadId]
  );
  return rows;
}
