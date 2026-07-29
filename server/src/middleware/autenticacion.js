import ErrorHttp from '../errores/ErrorHttp.js';
import { buscarUsuarioPorFirebaseUid } from '../repositorios/usuarios.repositorio.js';

/**
 * Fabrica el middleware de autenticación a partir de un verificador de
 * tokens (inyectable: en producción es firebase-admin; en pruebas, un
 * verificador falso). Deja en req.autenticado = { uid, email }.
 */
export function crearVerificarToken(verificadorTokens) {
  return async function verificarToken(req, res, next) {
    try {
      const encabezado = req.headers.authorization ?? '';
      const [esquema, token] = encabezado.split(' ');

      if (esquema !== 'Bearer' || !token) {
        throw new ErrorHttp(401, 'Se requiere un token de autenticación');
      }

      try {
        req.autenticado = await verificadorTokens(token);
      } catch {
        throw new ErrorHttp(401, 'El token de autenticación no es válido');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Carga el perfil de PostgreSQL del usuario autenticado en req.perfil.
 * Responde 404 si aún no existe (el cliente redirige a completar el
 * registro) y 403 si la cuenta está desactivada.
 */
export async function cargarPerfil(req, res, next) {
  try {
    const perfil = await buscarUsuarioPorFirebaseUid(req.autenticado.uid);

    if (!perfil) {
      throw new ErrorHttp(404, 'El perfil no existe; complete su registro');
    }

    if (perfil.estado !== 'activo') {
      throw new ErrorHttp(403, 'La cuenta está desactivada');
    }

    req.perfil = perfil;
    next();
  } catch (error) {
    next(error);
  }
}

/** Autorización por rol; usar después de cargarPerfil. */
export function requerirRol(...rolesPermitidos) {
  return function verificarRol(req, res, next) {
    if (!rolesPermitidos.includes(req.perfil.rol)) {
      return next(new ErrorHttp(403, 'No tiene permisos para esta operación'));
    }
    next();
  };
}
