import {
  registrarUsuario,
  actualizarPerfil,
  consultarMisIntereses,
  definirMisIntereses,
  darseDeBaja,
  eliminarCuentaPropia,
  VERSION_CONSENTIMIENTO,
  AVATARES_PERMITIDOS,
} from '../servicios/usuarios.servicio.js';
import {
  buscarUsuariosAdmin,
  cambiarEstado,
} from '../servicios/administracion.servicio.js';

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

/* --- Temáticas de interés y Habeas Data (Fase 11) --- */

export async function misIntereses(req, res, next) {
  try {
    res.json(await consultarMisIntereses(req.perfil));
  } catch (error) {
    next(error);
  }
}

export async function reemplazarMisIntereses(req, res, next) {
  try {
    res.json(await definirMisIntereses(req.perfil, req.body));
  } catch (error) {
    next(error);
  }
}

export async function bajaVoluntaria(req, res, next) {
  try {
    res.json(await darseDeBaja(req.perfil));
  } catch (error) {
    next(error);
  }
}

/**
 * Fábrica: la eliminación necesita las dependencias externas inyectadas en
 * crearApp (cuenta de Firebase y almacén de fotos), igual que evidencias.
 */
export function crearEliminarMiCuenta(dependencias) {
  return async function eliminarMiCuenta(req, res, next) {
    try {
      res.json(await eliminarCuentaPropia(req.perfil, req.body, dependencias));
    } catch (error) {
      next(error);
    }
  };
}

/* --- Administración (solo admin) --- */

export async function buscarUsuariosComoAdmin(req, res, next) {
  try {
    res.json(await buscarUsuariosAdmin(req.query.buscar));
  } catch (error) {
    next(error);
  }
}

export async function cambiarEstadoUsuario(req, res, next) {
  try {
    res.json(await cambiarEstado(req.perfil, req.params.id, req.body?.estado));
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
