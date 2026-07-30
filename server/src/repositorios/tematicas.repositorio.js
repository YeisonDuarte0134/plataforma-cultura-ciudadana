import pool from '../db/pool.js';

const COLUMNAS = 'id, nombre, descripcion, activa';

export async function listarTematicasActivas() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM tematicas WHERE activa = true ORDER BY nombre`
  );
  return rows;
}

export async function listarTodasLasTematicas() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM tematicas ORDER BY nombre`
  );
  return rows;
}

export async function buscarTematicaPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM tematicas WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function crearTematica({ nombre, descripcion }) {
  const { rows } = await pool.query(
    `INSERT INTO tematicas (nombre, descripcion) VALUES ($1, $2)
     RETURNING ${COLUMNAS}`,
    [nombre, descripcion]
  );
  return rows[0];
}

export async function actualizarTematica(id, { nombre, descripcion, activa }) {
  const { rows } = await pool.query(
    `UPDATE tematicas
        SET nombre = COALESCE($2, nombre),
            descripcion = COALESCE($3, descripcion),
            activa = COALESCE($4, activa),
            updated_at = current_timestamp
      WHERE id = $1
      RETURNING ${COLUMNAS}`,
    [id, nombre, descripcion, activa]
  );
  return rows[0] ?? null;
}

export async function existeNombreTematica(nombre, exceptoId = null) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM tematicas WHERE lower(nombre) = lower($1) AND ($2::int IS NULL OR id <> $2)',
    [nombre, exceptoId]
  );
  return rowCount > 0;
}
