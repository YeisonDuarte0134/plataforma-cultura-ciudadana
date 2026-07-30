import {
  consultarTematicasPublicas,
  consultarTodasLasTematicas,
  crearNuevaTematica,
  editarTematica,
} from '../servicios/tematicas.servicio.js';

export async function listarPublicas(req, res, next) {
  try {
    res.json(await consultarTematicasPublicas());
  } catch (error) {
    next(error);
  }
}

export async function listarTodas(req, res, next) {
  try {
    res.json(await consultarTodasLasTematicas());
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await crearNuevaTematica(req.body));
  } catch (error) {
    next(error);
  }
}

export async function editar(req, res, next) {
  try {
    res.json(await editarTematica(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}
