/**
 * Bitácora `eventos_participacion`: inserciones únicamente (append-only).
 * Recibe el cliente de la transacción en curso para que el evento quede
 * atado atómicamente a la operación que lo produce. Devuelve la fila
 * insertada: el motor de gamificación la referencia para garantizar que
 * cada evento otorga puntos una sola vez.
 */
export async function insertarEventoParticipacion(cliente, {
  usuarioId,
  actividadId,
  laboratorioId,
  tematicaId,
  tipoEvento,
}) {
  const { rows } = await cliente.query(
    `INSERT INTO eventos_participacion
       (usuario_id, actividad_id, laboratorio_id, tematica_id, tipo_evento)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, usuario_id, actividad_id, laboratorio_id, tematica_id, tipo_evento`,
    [usuarioId, actividadId, laboratorioId, tematicaId, tipoEvento]
  );
  return rows[0];
}
