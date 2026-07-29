import pool from '../db/pool.js';

export async function existeAsignacion(usuarioId, laboratorioId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM asignaciones_gestor WHERE usuario_id = $1 AND laboratorio_id = $2',
    [usuarioId, laboratorioId]
  );
  return rowCount > 0;
}

export async function listarGestoresDeLaboratorio(laboratorioId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.alias, u.correo, u.avatar, u.estado, a.created_at AS asignado_en
       FROM asignaciones_gestor a
       JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.laboratorio_id = $1
      ORDER BY u.alias`,
    [laboratorioId]
  );
  return rows;
}

export async function crearAsignacion(usuarioId, laboratorioId) {
  const { rows } = await pool.query(
    `INSERT INTO asignaciones_gestor (usuario_id, laboratorio_id)
     VALUES ($1, $2)
     ON CONFLICT (usuario_id, laboratorio_id) DO NOTHING
     RETURNING id`,
    [usuarioId, laboratorioId]
  );
  return rows[0] ?? null;
}

export async function eliminarAsignacion(usuarioId, laboratorioId) {
  const { rowCount } = await pool.query(
    'DELETE FROM asignaciones_gestor WHERE usuario_id = $1 AND laboratorio_id = $2',
    [usuarioId, laboratorioId]
  );
  return rowCount > 0;
}

export async function contarAsignacionesDeUsuario(usuarioId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM asignaciones_gestor WHERE usuario_id = $1',
    [usuarioId]
  );
  return rows[0].total;
}
