import pool from '../db/pool.js';
import { insertarEventoParticipacion } from './participacion.repositorio.js';

/**
 * Registra la asistencia y su evento de participación en una sola
 * transacción. La restricción de unicidad (actividad, usuario) es la
 * última línea de defensa contra dobles registros: si la fila ya existe
 * devuelve null y no toca la bitácora.
 */
export async function crearAsistencia({ actividad, usuarioId, metodo, registradaPor = null }) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rows } = await cliente.query(
      `INSERT INTO asistencias (actividad_id, usuario_id, metodo, registrada_por)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (actividad_id, usuario_id) DO NOTHING
       RETURNING id, actividad_id, usuario_id, metodo, created_at`,
      [actividad.id, usuarioId, metodo, registradaPor]
    );

    if (rows.length === 0) {
      await cliente.query('ROLLBACK');
      return null;
    }

    await insertarEventoParticipacion(cliente, {
      usuarioId,
      actividadId: actividad.id,
      laboratorioId: actividad.laboratorio_id,
      tematicaId: actividad.tematica_id,
      tipoEvento: 'asistencia',
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
