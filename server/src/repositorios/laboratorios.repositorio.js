import pool from '../db/pool.js';

const COLUMNAS = 'id, nombre, descripcion, ubicacion, imagen_url';

export async function listarLaboratoriosActivos() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM laboratorios WHERE activo = true ORDER BY nombre`
  );
  return rows;
}

export async function buscarLaboratorioActivoPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM laboratorios WHERE activo = true AND id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
