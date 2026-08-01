import {
  consultarMiProgreso,
  consultarRanking,
  consultarConfiguracion,
  cambiarRegla,
  definirNiveles,
  crearNuevaInsignia,
  editarInsignia,
} from '../servicios/gamificacion.servicio.js';

export async function miProgreso(req, res, next) {
  try {
    res.json(await consultarMiProgreso(req.perfil));
  } catch (error) {
    next(error);
  }
}

export async function ranking(req, res, next) {
  try {
    res.json(await consultarRanking(req.query));
  } catch (error) {
    next(error);
  }
}

/* --- Configuración del motor (Fase 9) --- */

export async function configuracion(req, res, next) {
  try {
    res.json(await consultarConfiguracion());
  } catch (error) {
    next(error);
  }
}

export async function actualizarRegla(req, res, next) {
  try {
    res.json(await cambiarRegla(req.params.accion, req.body));
  } catch (error) {
    next(error);
  }
}

export async function reemplazarNiveles(req, res, next) {
  try {
    res.json(await definirNiveles(req.body));
  } catch (error) {
    next(error);
  }
}

export async function crearInsignia(req, res, next) {
  try {
    res.status(201).json(await crearNuevaInsignia(req.body));
  } catch (error) {
    next(error);
  }
}

export async function actualizarInsignia(req, res, next) {
  try {
    res.json(await editarInsignia(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}
