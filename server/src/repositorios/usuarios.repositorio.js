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
      WHERE (alias ILIKE $1 OR correo ILIKE $1)
        AND estado <> 'eliminado'
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

/* --- Habeas Data (Fase 11) --- */

/**
 * Eliminación definitiva de la cuenta (HU-21). La fila de `usuarios` no se
 * borra —la bitácora y el libro mayor la referencian y las métricas
 * agregadas dependen de poder distinguir personas históricas—: se
 * ANONIMIZA. Se borran los datos personales (correo, alias, avatar,
 * teléfono, uid de Firebase) y todo el contenido que la persona produjo
 * (evidencias, notificaciones, intereses, inscripciones, asistencias).
 * `eventos_participacion`, `puntos_otorgados` e `insignias_otorgadas` se
 * conservan: solo contienen ids opacos, y el ranking ya excluye a quien no
 * está activo.
 *
 * Devuelve las URLs de las fotos de evidencia para que el servicio las
 * borre del almacén después del COMMIT (el almacén es externo a la BD).
 */
export async function eliminarDatosDeUsuario(usuarioId) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rows: fotos } = await cliente.query(
      'SELECT foto_url FROM evidencias WHERE usuario_id = $1 AND foto_url IS NOT NULL',
      [usuarioId]
    );

    await cliente.query('DELETE FROM notificaciones WHERE usuario_id = $1', [usuarioId]);
    await cliente.query('DELETE FROM intereses_usuario WHERE usuario_id = $1', [usuarioId]);
    await cliente.query('DELETE FROM evidencias WHERE usuario_id = $1', [usuarioId]);
    await cliente.query('DELETE FROM asistencias WHERE usuario_id = $1', [usuarioId]);
    await cliente.query('DELETE FROM inscripciones WHERE usuario_id = $1', [usuarioId]);
    await cliente.query('DELETE FROM asignaciones_gestor WHERE usuario_id = $1', [usuarioId]);

    // La tumba anonimizada: sin datos personales, estado terminal. El uid
    // sintético mantiene la unicidad y jamás coincidirá con uno real.
    await cliente.query(
      `UPDATE usuarios SET
         estado = 'eliminado',
         firebase_uid = 'eliminado-' || id,
         correo = 'eliminado-' || id || '@cuenta-eliminada.invalido',
         alias = '[cuenta eliminada]',
         avatar = NULL,
         telefono = NULL,
         updated_at = current_timestamp
       WHERE id = $1`,
      [usuarioId]
    );

    await cliente.query('COMMIT');
    return fotos.map((f) => f.foto_url);
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
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
