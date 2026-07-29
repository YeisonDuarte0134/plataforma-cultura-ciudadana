import {
  registrarUsuario,
  actualizarPerfil,
  VERSION_CONSENTIMIENTO,
  AVATARES_PERMITIDOS,
} from '../servicios/usuarios.servicio.js';

export async function registrar(req, res, next) {
  try {
    const perfil = await registrarUsuario(req.autenticado, req.body);
    res.status(201).json(perfil);
  } catch (error) {
    next(error);
  }
}

export function obtenerMiPerfil(req, res) {
  res.json(req.perfil);
}

export async function actualizarMiPerfil(req, res, next) {
  try {
    res.json(await actualizarPerfil(req.perfil, req.body));
  } catch (error) {
    next(error);
  }
}

/** Datos públicos que el formulario de registro necesita. */
export function obtenerOpcionesRegistro(req, res) {
  res.json({
    versionConsentimiento: VERSION_CONSENTIMIENTO,
    avataresPermitidos: AVATARES_PERMITIDOS,
  });
}
