/**
 * Bitácora `eventos_participacion`: inserciones únicamente (append-only).
 * Recibe el cliente de la transacción en curso para que el evento quede
 * atado atómicamente a la operación que lo produce.
 */
export function insertarEventoParticipacion(cliente, {
  usuarioId,
  actividadId,
  laboratorioId,
  tematicaId,
  tipoEvento,
}) {
  return cliente.query(
    `INSERT INTO eventos_participacion
       (usuario_id, actividad_id, laboratorio_id, tematica_id, tipo_evento)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuarioId, actividadId, laboratorioId, tematicaId, tipoEvento]
  );
}
