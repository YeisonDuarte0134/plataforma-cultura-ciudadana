import pool from '../db/pool.js';

/**
 * Fase 10 — métricas y reportes.
 *
 * Todas las agregaciones se calculan sobre la bitácora inmutable
 * `eventos_participacion` (no sobre contadores sueltos), como exige el PRD,
 * para que los reportes sean auditables y recalculables. Ningún resultado
 * incluye identificadores de personas: solo conteos agregados.
 *
 * Las cinco consultas comparten el mismo juego de filtros opcionales, en
 * este orden de parámetros:
 *   $1 laboratorio_id  $2 desde (inclusivo)  $3 hasta (exclusivo)
 *   $4 actividad_id    $5 tematica_id
 * Un parámetro en NULL desactiva ese filtro (mismo patrón que el ranking).
 */
const FILTRO = `
      ($1::int IS NULL OR ep.laboratorio_id = $1)
  AND ($2::timestamptz IS NULL OR ep.created_at >= $2)
  AND ($3::timestamptz IS NULL OR ep.created_at < $3)
  AND ($4::int IS NULL OR ep.actividad_id = $4)
  AND ($5::int IS NULL OR ep.tematica_id = $5)`;

const aValores = (f) => [
  f.laboratorioId ?? null,
  f.desde ?? null,
  f.hastaExclusivo ?? null,
  f.actividadId ?? null,
  f.tematicaId ?? null,
];

/**
 * Conteos generales del periodo: participantes activos (personas distintas
 * con al menos una acción propia — la cancelación no cuenta como
 * participación) y el volumen de cada tipo de evento de la bitácora.
 */
export async function resumenParticipacion(filtros) {
  const { rows: [fila] } = await pool.query(
    `SELECT
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento <> 'cancelacion_inscripcion')::int AS participantes_activos,
       COUNT(*)::int AS eventos_totales,
       COUNT(*) FILTER (WHERE ep.tipo_evento = 'inscripcion')::int AS inscripciones,
       COUNT(*) FILTER (WHERE ep.tipo_evento = 'cancelacion_inscripcion')::int AS cancelaciones,
       COUNT(*) FILTER (WHERE ep.tipo_evento = 'asistencia')::int AS asistencias,
       COUNT(*) FILTER (WHERE ep.tipo_evento = 'envio_evidencia')::int AS envios_evidencia,
       COUNT(*) FILTER (WHERE ep.tipo_evento = 'aprobacion_evidencia')::int AS aprobaciones,
       COUNT(*) FILTER (WHERE ep.tipo_evento = 'rechazo_evidencia')::int AS rechazos
     FROM eventos_participacion ep
     WHERE ${FILTRO}`,
    aValores(filtros)
  );
  return fila;
}

/**
 * Asistencia a convocatorias, por evento presencial: personas distintas
 * inscritas frente a personas distintas que asistieron en el periodo.
 */
export async function asistenciaPorEvento(filtros) {
  const { rows } = await pool.query(
    `SELECT a.id AS actividad_id, a.titulo, a.estado,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento = 'inscripcion')::int AS inscritos,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento = 'asistencia')::int AS asistentes
     FROM eventos_participacion ep
     JOIN actividades a ON a.id = ep.actividad_id
     WHERE a.tipo = 'evento' AND ${FILTRO}
     GROUP BY a.id, a.titulo, a.estado
     ORDER BY a.fecha_inicio DESC NULLS LAST, a.id`,
    aValores(filtros)
  );
  return rows;
}

/**
 * Finalización de retos, por reto: personas distintas que enviaron
 * evidencia frente a personas distintas cuya evidencia fue aprobada.
 */
export async function finalizacionPorReto(filtros) {
  const { rows } = await pool.query(
    `SELECT a.id AS actividad_id, a.titulo, a.estado,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento = 'envio_evidencia')::int AS participantes,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento = 'aprobacion_evidencia')::int AS finalizados
     FROM eventos_participacion ep
     JOIN actividades a ON a.id = ep.actividad_id
     WHERE a.tipo = 'reto' AND ${FILTRO}
     GROUP BY a.id, a.titulo, a.estado
     ORDER BY a.id`,
    aValores(filtros)
  );
  return rows;
}

/**
 * Preferencias temáticas: cuántas participaciones y cuántas personas
 * distintas movió cada temática. La cancelación se excluye porque deshace
 * una participación en vez de expresar una preferencia.
 */
export async function participacionPorTematica(filtros) {
  const { rows } = await pool.query(
    `SELECT t.id AS tematica_id, t.nombre,
       COUNT(*)::int AS participaciones,
       COUNT(DISTINCT ep.usuario_id)::int AS participantes
     FROM eventos_participacion ep
     JOIN tematicas t ON t.id = ep.tematica_id
     WHERE ep.tipo_evento <> 'cancelacion_inscripcion' AND ${FILTRO}
     GROUP BY t.id, t.nombre
     ORDER BY participaciones DESC, t.nombre`,
    aValores(filtros)
  );
  return rows;
}

/**
 * Comparativa entre laboratorios para el administrador. El LEFT JOIN parte
 * de `laboratorios` para que un laboratorio sin actividad en el periodo
 * aparezca con ceros en vez de desaparecer de la comparación.
 */
export async function comparativaLaboratorios(filtros) {
  const { rows } = await pool.query(
    `SELECT l.id AS laboratorio_id, l.nombre, l.activo,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento <> 'cancelacion_inscripcion')::int AS participantes_activos,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento = 'inscripcion')::int AS inscritos,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento = 'asistencia')::int AS asistentes,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento = 'envio_evidencia')::int AS participantes_retos,
       COUNT(DISTINCT ep.usuario_id) FILTER (WHERE ep.tipo_evento = 'aprobacion_evidencia')::int AS retos_finalizados
     FROM laboratorios l
     LEFT JOIN eventos_participacion ep
       ON ep.laboratorio_id = l.id
      AND ($1::timestamptz IS NULL OR ep.created_at >= $1)
      AND ($2::timestamptz IS NULL OR ep.created_at < $2)
     GROUP BY l.id, l.nombre, l.activo
     ORDER BY participantes_activos DESC, l.nombre`,
    [filtros.desde ?? null, filtros.hastaExclusivo ?? null]
  );
  return rows;
}
