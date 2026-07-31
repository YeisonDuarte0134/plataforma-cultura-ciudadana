import pool from '../db/pool.js';
import {
  accionDeEvento,
  puntosPorAccion,
  cumpleCriterio,
} from '../servicios/gamificacion.reglas.js';

/**
 * Procesa un evento de participación dentro de la transacción en curso:
 * otorga los puntos que correspondan y evalúa las insignias. Se llama en
 * el mismo COMMIT que registra la asistencia o la aprobación, así el
 * otorgamiento es atómico con el hecho que lo produce.
 *
 * Idempotente por diseño: la unicidad de `evento_participacion_id` hace
 * que reprocesar el mismo evento no inserte nada (ON CONFLICT DO NOTHING),
 * y la unicidad usuario+insignia hace lo propio con las insignias.
 */
export async function procesarEventoGamificacion(cliente, evento, actividad) {
  const accion = accionDeEvento(evento.tipo_evento);
  if (!accion) return null;

  const { rows: filasReglas } = await cliente.query('SELECT accion, puntos FROM reglas_puntos');
  const reglas = Object.fromEntries(filasReglas.map((r) => [r.accion, r.puntos]));

  const puntos = puntosPorAccion(accion, actividad, reglas);
  if (!puntos) return null;

  const { rows } = await cliente.query(
    `INSERT INTO puntos_otorgados
       (usuario_id, evento_participacion_id, actividad_id, laboratorio_id, tematica_id, accion, puntos)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (evento_participacion_id) DO NOTHING
     RETURNING id, puntos`,
    [
      evento.usuario_id,
      evento.id,
      evento.actividad_id,
      evento.laboratorio_id,
      evento.tematica_id,
      accion,
      puntos,
    ]
  );

  // Evento ya procesado antes: no hay nada nuevo que evaluar.
  if (rows.length === 0) return null;

  await evaluarInsignias(cliente, evento);
  return rows[0];
}

/** Otorga las insignias activas cuyo criterio la persona ya cumple. */
async function evaluarInsignias(cliente, evento) {
  const { rows: [medidasCrudas] } = await cliente.query(
    `SELECT
       COUNT(*) FILTER (WHERE accion = 'asistencia')::int AS asistencias,
       COUNT(*) FILTER (WHERE accion = 'reto_aprobado')::int AS retos_aprobados,
       COUNT(DISTINCT tematica_id)::int AS tematicas_distintas
     FROM puntos_otorgados WHERE usuario_id = $1`,
    [evento.usuario_id]
  );

  const medidas = {
    contadores: {
      asistencia: medidasCrudas.asistencias,
      reto_aprobado: medidasCrudas.retos_aprobados,
    },
    tematicasDistintas: medidasCrudas.tematicas_distintas,
  };

  const { rows: insignias } = await cliente.query(
    'SELECT id, criterio FROM insignias WHERE activa'
  );

  for (const insignia of insignias) {
    if (!cumpleCriterio(insignia.criterio, medidas)) continue;
    await cliente.query(
      `INSERT INTO insignias_otorgadas (usuario_id, insignia_id, evento_participacion_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, insignia_id) DO NOTHING`,
      [evento.usuario_id, insignia.id, evento.id]
    );
  }
}

/* --- Consultas del perfil gamificado y los rankings --- */

export async function obtenerPuntosDeUsuario(usuarioId) {
  const { rows: [fila] } = await pool.query(
    'SELECT COALESCE(SUM(puntos), 0)::int AS total FROM puntos_otorgados WHERE usuario_id = $1',
    [usuarioId]
  );
  return fila.total;
}

export async function listarNiveles() {
  const { rows } = await pool.query(
    'SELECT numero, nombre, puntos_minimos FROM niveles ORDER BY puntos_minimos'
  );
  return rows;
}

/** Catálogo de insignias activas con la marca de si la persona las tiene. */
export async function listarInsigniasDeUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT i.codigo, i.nombre, i.descripcion, i.icono,
            io.created_at AS obtenida_en
       FROM insignias i
       LEFT JOIN insignias_otorgadas io
         ON io.insignia_id = i.id AND io.usuario_id = $1
      WHERE i.activa
      ORDER BY io.created_at NULLS LAST, i.id`,
    [usuarioId]
  );
  return rows.map((i) => ({ ...i, obtenida: i.obtenida_en !== null }));
}

/** Historial de participación: cada otorgamiento con su actividad. */
export async function listarHistorialDeUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT p.accion, p.puntos, p.created_at,
            a.id AS actividad_id, a.titulo AS actividad_titulo,
            l.nombre AS laboratorio_nombre
       FROM puntos_otorgados p
       JOIN actividades a ON a.id = p.actividad_id
       JOIN laboratorios l ON l.id = p.laboratorio_id
      WHERE p.usuario_id = $1
      ORDER BY p.created_at DESC
      LIMIT 100`,
    [usuarioId]
  );
  return rows;
}

/**
 * Ranking público: solo alias y avatar (datos anonimizados), personas
 * activas con al menos un otorgamiento, opcionalmente por laboratorio.
 */
export async function listarRanking({ laboratorioId = null, limite = 50 }) {
  const { rows } = await pool.query(
    `SELECT u.alias, u.avatar, SUM(p.puntos)::int AS puntos
       FROM puntos_otorgados p
       JOIN usuarios u ON u.id = p.usuario_id
      WHERE u.estado = 'activo'
        AND ($1::int IS NULL OR p.laboratorio_id = $1)
      GROUP BY u.id, u.alias, u.avatar
      ORDER BY puntos DESC, MIN(p.created_at)
      LIMIT $2`,
    [laboratorioId, limite]
  );
  return rows;
}
