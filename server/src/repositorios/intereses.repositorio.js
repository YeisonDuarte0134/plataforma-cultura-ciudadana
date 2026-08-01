import pool from '../db/pool.js';

/** Temáticas de interés del perfil (Fase 11, HU-7). */
export async function listarInteresesDeUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT t.id, t.nombre
       FROM intereses_usuario i
       JOIN tematicas t ON t.id = i.tematica_id
      WHERE i.usuario_id = $1
      ORDER BY t.nombre`,
    [usuarioId]
  );
  return rows;
}

/**
 * Reemplaza el conjunto completo de intereses en una transacción: el
 * formulario del perfil envía la selección final, no deltas, así que el
 * estado guardado siempre refleja exactamente lo que la persona marcó.
 */
export async function reemplazarIntereses(usuarioId, tematicaIds) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('DELETE FROM intereses_usuario WHERE usuario_id = $1', [usuarioId]);
    for (const tematicaId of tematicaIds) {
      await cliente.query(
        'INSERT INTO intereses_usuario (usuario_id, tematica_id) VALUES ($1, $2)',
        [usuarioId, tematicaId]
      );
    }
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
  return listarInteresesDeUsuario(usuarioId);
}
