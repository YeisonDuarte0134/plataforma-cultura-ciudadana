import pool from '../db/pool.js';

const COLUMNAS = 'id, nombre, descripcion, ubicacion, imagen_url';
const COLUMNAS_ADMIN = `${COLUMNAS}, activo, created_at, updated_at`;

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

/* --- Operaciones de administración (Fase 4) --- */

export async function listarTodosLosLaboratorios() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_ADMIN} FROM laboratorios ORDER BY nombre`
  );
  return rows;
}

export async function listarLaboratoriosDeGestor(usuarioId) {
  const columnas = COLUMNAS_ADMIN.split(', ').map((c) => `l.${c}`).join(', ');
  const { rows } = await pool.query(
    `SELECT ${columnas}
       FROM laboratorios l
       JOIN asignaciones_gestor a ON a.laboratorio_id = l.id
      WHERE a.usuario_id = $1
      ORDER BY l.nombre`,
    [usuarioId]
  );
  return rows;
}

export async function buscarLaboratorioPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_ADMIN} FROM laboratorios WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function crearLaboratorio({ nombre, descripcion, ubicacion, imagenUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO laboratorios (nombre, descripcion, ubicacion, imagen_url)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNAS_ADMIN}`,
    [nombre, descripcion, ubicacion, imagenUrl]
  );
  return rows[0];
}

export async function actualizarLaboratorio(id, { nombre, descripcion, ubicacion, imagenUrl, activo }) {
  const { rows } = await pool.query(
    `UPDATE laboratorios
        SET nombre = COALESCE($2, nombre),
            descripcion = COALESCE($3, descripcion),
            ubicacion = COALESCE($4, ubicacion),
            imagen_url = COALESCE($5, imagen_url),
            activo = COALESCE($6, activo),
            updated_at = current_timestamp
      WHERE id = $1
      RETURNING ${COLUMNAS_ADMIN}`,
    [id, nombre, descripcion, ubicacion, imagenUrl, activo]
  );
  return rows[0] ?? null;
}
