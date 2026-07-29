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
