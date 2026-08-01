import ErrorHttp from '../errores/ErrorHttp.js';
import {
  buscarUsuarioPorFirebaseUid,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  eliminarDatosDeUsuario,
} from '../repositorios/usuarios.repositorio.js';
import { listarTematicasActivas } from '../repositorios/tematicas.repositorio.js';
import {
  listarInteresesDeUsuario,
  reemplazarIntereses,
} from '../repositorios/intereses.repositorio.js';

/** Versión vigente de la política de tratamiento de datos (Ley 1581 de 2012). */
export const VERSION_CONSENTIMIENTO = '1.0 (2026-07-28)';

/** Avatares permitidos: conjunto cerrado para evitar contenido arbitrario. */
export const AVATARES_PERMITIDOS = [
  '🙂', '🌳', '🚲', '🏙️', '🌻', '🎭', '📚', '⚽', '🐦', '♻️', '🎨', '🤝',
];

function validarAlias(aliasCrudo) {
  if (typeof aliasCrudo !== 'string') {
    throw new ErrorHttp(400, 'El alias es obligatorio');
  }

  // Sanitización: sin caracteres de control ni espacios repetidos.
  const alias = aliasCrudo.replace(/[\p{C}]/gu, '').replace(/\s+/g, ' ').trim();

  if (alias.length < 3 || alias.length > 30) {
    throw new ErrorHttp(400, 'El alias debe tener entre 3 y 30 caracteres');
  }

  if (!/^[\p{L}\p{N} ._-]+$/u.test(alias)) {
    throw new ErrorHttp(
      400,
      'El alias solo admite letras, números, espacios y los signos . _ -'
    );
  }

  return alias;
}

function validarAvatar(avatar) {
  if (avatar === undefined || avatar === null || avatar === '') return null;
  if (!AVATARES_PERMITIDOS.includes(avatar)) {
    throw new ErrorHttp(400, 'El avatar seleccionado no es válido');
  }
  return avatar;
}

function validarTelefono(telefono) {
  if (telefono === undefined || telefono === null || telefono === '') return null;
  if (typeof telefono !== 'string' || !/^\+?[\d ]{7,15}$/.test(telefono.trim())) {
    throw new ErrorHttp(400, 'El teléfono no tiene un formato válido');
  }
  return telefono.trim();
}

export async function registrarUsuario(autenticado, cuerpo) {
  if (cuerpo?.aceptaConsentimiento !== true) {
    throw new ErrorHttp(
      400,
      'Debe aceptar la política de tratamiento de datos para registrarse'
    );
  }

  const existente = await buscarUsuarioPorFirebaseUid(autenticado.uid);
  if (existente) {
    throw new ErrorHttp(409, 'El perfil ya existe para esta cuenta');
  }

  return crearUsuario({
    firebaseUid: autenticado.uid,
    correo: autenticado.email,
    alias: validarAlias(cuerpo.alias),
    avatar: validarAvatar(cuerpo.avatar),
    telefono: validarTelefono(cuerpo.telefono),
    consentimientoVersion: VERSION_CONSENTIMIENTO,
  });
}

export async function actualizarPerfil(perfil, cuerpo) {
  const cambios = {};

  if (cuerpo?.alias !== undefined) cambios.alias = validarAlias(cuerpo.alias);
  if (cuerpo?.avatar !== undefined) cambios.avatar = validarAvatar(cuerpo.avatar);
  if (cuerpo?.telefono !== undefined) cambios.telefono = validarTelefono(cuerpo.telefono);

  if (Object.keys(cambios).length === 0) {
    throw new ErrorHttp(400, 'No hay cambios para aplicar');
  }

  return actualizarUsuario(perfil.id, cambios);
}

/* --- Temáticas de interés (Fase 11, HU-7) --- */

export function consultarMisIntereses(perfil) {
  return listarInteresesDeUsuario(perfil.id);
}

/**
 * Reemplaza el conjunto de intereses con la selección del formulario.
 * Solo se aceptan temáticas activas: una temática desactivada no puede
 * ganar interesados nuevos.
 */
export async function definirMisIntereses(perfil, cuerpo) {
  const tematicas = cuerpo?.tematicas;
  if (!Array.isArray(tematicas)) {
    throw new ErrorHttp(400, "El cuerpo debe traer 'tematicas' como arreglo de ids");
  }

  const activas = new Set((await listarTematicasActivas()).map((t) => t.id));
  const ids = [...new Set(tematicas.map(Number))];
  for (const id of ids) {
    if (!Number.isInteger(id) || !activas.has(id)) {
      throw new ErrorHttp(400, 'Alguna de las temáticas elegidas no existe o no está activa');
    }
  }

  return reemplazarIntereses(perfil.id, ids);
}

/* --- Habeas Data (Fase 11, HU-21) --- */

/** Baja voluntaria: desactiva la cuenta; un administrador puede revertirla. */
export async function darseDeBaja(perfil) {
  await cambiarEstadoUsuario(perfil.id, 'desactivado');
  return { mensaje: 'Tu cuenta quedó desactivada. Puedes pedir su reactivación cuando quieras.' };
}

/**
 * Eliminación definitiva: exige confirmación explícita en el cuerpo, borra
 * los datos personales y el contenido propio en una transacción (la
 * bitácora queda anonimizada, ver el repositorio) y después intenta borrar
 * la cuenta de Firebase y las fotos del almacén. Esos sistemas externos no
 * participan de la transacción: si fallan se registra la advertencia y la
 * respuesta sigue siendo exitosa, porque la fuente de verdad (PostgreSQL)
 * ya no conserva datos personales y esa sesión ya no encuentra perfil.
 */
export async function eliminarCuentaPropia(perfil, cuerpo, { cuentasAuth, almacenArchivos }) {
  if (cuerpo?.confirmacion !== 'ELIMINAR') {
    throw new ErrorHttp(400, "Para eliminar la cuenta debes enviar la confirmación 'ELIMINAR'");
  }

  const fotos = await eliminarDatosDeUsuario(perfil.id);

  try {
    await cuentasAuth.eliminarCuenta(perfil.firebase_uid);
  } catch (error) {
    console.error('No se pudo eliminar la cuenta de Firebase Auth:', error.message);
  }

  for (const url of fotos) {
    try {
      await almacenArchivos.eliminarFotoPorUrl(url);
    } catch (error) {
      console.error('No se pudo eliminar una foto de evidencia del almacén:', error.message);
    }
  }

  return { mensaje: 'Tu cuenta y tus datos personales fueron eliminados definitivamente.' };
}
