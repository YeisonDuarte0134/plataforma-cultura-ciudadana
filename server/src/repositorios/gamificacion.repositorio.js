import pool from '../db/pool.js';
import {
  accionDeEvento,
  puntosPorAccion,
  cumpleCriterio,
} from '../servicios/gamificacion.reglas.js';
import { crearNotificacionInsignia } from './notificaciones.repositorio.js';

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
    'SELECT id, nombre, criterio FROM insignias WHERE activa'
  );

  for (const insignia of insignias) {
    if (!cumpleCriterio(insignia.criterio, medidas)) continue;
    const { rows } = await cliente.query(
      `INSERT INTO insignias_otorgadas (usuario_id, insignia_id, evento_participacion_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, insignia_id) DO NOTHING
       RETURNING id`,
      [evento.usuario_id, insignia.id, evento.id]
    );
    // Solo el otorgamiento real notifica (Fase 11); si ya la tenía, el
    // ON CONFLICT no inserta y no hay nada que anunciar.
    if (rows.length > 0) {
      await crearNotificacionInsignia(cliente, evento.usuario_id, insignia);
    }
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

/* --- Configuración del motor (Fase 9, solo administrador) --- */

export async function listarReglas() {
  const { rows } = await pool.query('SELECT accion, puntos FROM reglas_puntos ORDER BY accion');
  return rows;
}

export async function actualizarRegla(accion, puntos) {
  const { rows } = await pool.query(
    `UPDATE reglas_puntos SET puntos = $2, updated_at = current_timestamp
      WHERE accion = $1 RETURNING accion, puntos`,
    [accion, puntos]
  );
  return rows[0] ?? null;
}

/**
 * Reemplaza el conjunto completo de niveles en una transacción: así la
 * validación de umbrales (orden, unicidad, base en cero) se hace sobre el
 * conjunto final y nunca queda un estado intermedio inconsistente.
 */
export async function reemplazarNiveles(niveles) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('DELETE FROM niveles');
    for (const nivel of niveles) {
      await cliente.query(
        'INSERT INTO niveles (numero, nombre, puntos_minimos) VALUES ($1, $2, $3)',
        [nivel.numero, nivel.nombre, nivel.puntos_minimos]
      );
    }
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
  return listarNiveles();
}

/** Catálogo completo de insignias para el panel (incluye inactivas y criterio). */
export async function listarInsigniasCompletas() {
  const { rows } = await pool.query(
    'SELECT id, codigo, nombre, descripcion, icono, criterio, activa FROM insignias ORDER BY id'
  );
  return rows;
}

export async function buscarInsigniaPorCodigo(codigo) {
  const { rows } = await pool.query('SELECT id FROM insignias WHERE codigo = $1', [codigo]);
  return rows[0] ?? null;
}

export async function buscarInsigniaPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, codigo, nombre, descripcion, icono, criterio, activa FROM insignias WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function crearInsignia(datos) {
  const { rows } = await pool.query(
    `INSERT INTO insignias (codigo, nombre, descripcion, icono, criterio)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, codigo, nombre, descripcion, icono, criterio, activa`,
    [datos.codigo, datos.nombre, datos.descripcion, datos.icono, JSON.stringify(datos.criterio)]
  );
  return rows[0];
}

export async function actualizarInsignia(id, cambios) {
  const { rows } = await pool.query(
    `UPDATE insignias SET
       nombre = COALESCE($2, nombre),
       descripcion = COALESCE($3, descripcion),
       icono = COALESCE($4, icono),
       criterio = COALESCE($5, criterio),
       activa = COALESCE($6, activa),
       updated_at = current_timestamp
     WHERE id = $1
     RETURNING id, codigo, nombre, descripcion, icono, criterio, activa`,
    [
      id,
      cambios.nombre,
      cambios.descripcion,
      cambios.icono,
      cambios.criterio !== undefined ? JSON.stringify(cambios.criterio) : undefined,
      cambios.activa,
    ]
  );
  return rows[0] ?? null;
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
