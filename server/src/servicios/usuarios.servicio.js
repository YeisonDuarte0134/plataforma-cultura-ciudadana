import ErrorHttp from '../errores/ErrorHttp.js';
import {
  buscarUsuarioPorFirebaseUid,
  crearUsuario,
  actualizarUsuario,
} from '../repositorios/usuarios.repositorio.js';

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
