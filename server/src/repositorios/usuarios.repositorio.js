import pool from '../db/pool.js';

const COLUMNAS =
  'id, firebase_uid, correo, alias, avatar, telefono, rol, estado, consentimiento_version, consentimiento_fecha, created_at';

export async function buscarUsuarioPorFirebaseUid(firebaseUid) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM usuarios WHERE firebase_uid = $1`,
    [firebaseUid]
  );
  return rows[0] ?? null;
}

export async function crearUsuario({
  firebaseUid,
  correo,
  alias,
  avatar,
  telefono,
  consentimientoVersion,
}) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios
       (firebase_uid, correo, alias, avatar, telefono, consentimiento_version, consentimiento_fecha)
     VALUES ($1, $2, $3, $4, $5, $6, current_timestamp)
     RETURNING ${COLUMNAS}`,
    [firebaseUid, correo, alias, avatar, telefono, consentimientoVersion]
  );
  return rows[0];
}

/* --- Operaciones de administración (Fase 4) --- */

export async function buscarUsuarioPorId(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM usuarios WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function buscarUsuarios(texto, limite = 20) {
  const patron = `%${texto}%`;
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM usuarios
      WHERE alias ILIKE $1 OR correo ILIKE $1
      ORDER BY alias
      LIMIT $2`,
    [patron, limite]
  );
  return rows;
}

export async function cambiarEstadoUsuario(id, estado) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET estado = $2, updated_at = current_timestamp
      WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, estado]
  );
  return rows[0] ?? null;
}

export async function cambiarRolUsuario(id, rol) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET rol = $2, updated_at = current_timestamp
      WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, rol]
  );
  return rows[0] ?? null;
}

export async function actualizarUsuario(id, { alias, avatar, telefono }) {
  const { rows } = await pool.query(
    `UPDATE usuarios
        SET alias = COALESCE($2, alias),
            avatar = COALESCE($3, avatar),
            telefono = COALESCE($4, telefono),
            updated_at = current_timestamp
      WHERE id = $1
      RETURNING ${COLUMNAS}`,
    [id, alias, avatar, telefono]
  );
  return rows[0];
}
