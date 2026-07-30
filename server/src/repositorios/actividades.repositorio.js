import pool from '../db/pool.js';

const COLUMNAS = `
  a.id, a.laboratorio_id, a.tematica_id, a.tipo, a.titulo, a.descripcion,
  a.estado, a.fecha_inicio, a.lugar, a.cupo, a.puntos, a.fecha_limite,
  a.tipo_evidencia, a.created_at, a.updated_at,
  t.nombre AS tematica_nombre, l.nombre AS laboratorio_nombre,
  (SELECT COUNT(*)::int FROM inscripciones i
    WHERE i.actividad_id = a.id AND i.estado = 'activa') AS inscritos_activos
`;

const DESDE = `
  FROM actividades a
  JOIN tematicas t ON t.id = a.tematica_id
  JOIN laboratorios l ON l.id = a.laboratorio_id
`;

/** Vitrina pública: solo publicadas, con filtros opcionales. */
export async function listarActividadesPublicadas({ laboratorioId, tipo, tematicaId }) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE}
      WHERE a.estado = 'publicada'
        AND ($1::int IS NULL OR a.laboratorio_id = $1)
        AND ($2::text IS NULL OR a.tipo = $2)
        AND ($3::int IS NULL OR a.tematica_id = $3)
      ORDER BY a.fecha_inicio NULLS LAST, a.id`,
    [laboratorioId ?? null, tipo ?? null, tematicaId ?? null]
  );
  return rows;
}

export async function buscarActividadPublicadaPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE} WHERE a.id = $1 AND a.estado = 'publicada'`,
    [id]
  );
  return rows[0] ?? null;
}

/* --- Panel de administración --- */

export async function listarActividadesDeLaboratorio(laboratorioId) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE}
      WHERE a.laboratorio_id = $1
      ORDER BY a.estado = 'archivada', a.fecha_inicio DESC NULLS LAST, a.id DESC`,
    [laboratorioId]
  );
  return rows;
}

export async function buscarActividadPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} ${DESDE} WHERE a.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function crearActividad(datos) {
  const { rows } = await pool.query(
    `INSERT INTO actividades
       (laboratorio_id, tematica_id, tipo, titulo, descripcion, fecha_inicio, lugar, cupo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      datos.laboratorioId,
      datos.tematicaId,
      datos.tipo,
      datos.titulo,
      datos.descripcion,
      datos.fechaInicio,
      datos.lugar,
      datos.cupo,
    ]
  );
  return buscarActividadPorId(rows[0].id);
}

export async function actualizarActividad(id, cambios) {
  await pool.query(
    `UPDATE actividades
        SET tematica_id = COALESCE($2, tematica_id),
            titulo = COALESCE($3, titulo),
            descripcion = COALESCE($4, descripcion),
            fecha_inicio = COALESCE($5, fecha_inicio),
            lugar = COALESCE($6, lugar),
            cupo = COALESCE($7, cupo),
            updated_at = current_timestamp
      WHERE id = $1`,
    [id, cambios.tematicaId, cambios.titulo, cambios.descripcion, cambios.fechaInicio, cambios.lugar, cambios.cupo]
  );
  return buscarActividadPorId(id);
}

export async function cambiarEstadoActividad(id, estado) {
  await pool.query(
    `UPDATE actividades SET estado = $2, updated_at = current_timestamp WHERE id = $1`,
    [id, estado]
  );
  return buscarActividadPorId(id);
}
