import {
  consultarActividadesPublicas,
  consultarActividadPublica,
  consultarActividadesAdministrables,
  consultarActividadAdministrable,
  crearNuevaActividad,
  editarActividadExistente,
  transicionarEstado,
} from '../servicios/actividades.servicio.js';
import { generarTokenQr } from '../servicios/asistencias.servicio.js';
import { consultarParticipantes } from '../servicios/inscripciones.servicio.js';

export async function listarPublicas(req, res, next) {
  try {
    res.json(await consultarActividadesPublicas(req.query));
  } catch (error) {
    next(error);
  }
}

export async function obtenerPublica(req, res, next) {
  try {
    res.json(await consultarActividadPublica(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function listarDeLaboratorio(req, res, next) {
  try {
    res.json(await consultarActividadesAdministrables(req.perfil, req.query.laboratorio));
  } catch (error) {
    next(error);
  }
}

export async function obtenerAdministrable(req, res, next) {
  try {
    res.json(await consultarActividadAdministrable(req.perfil, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await crearNuevaActividad(req.perfil, req.body));
  } catch (error) {
    next(error);
  }
}

export async function editar(req, res, next) {
  try {
    res.json(await editarActividadExistente(req.perfil, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function cambiarEstado(req, res, next) {
  try {
    res.json(await transicionarEstado(req.perfil, req.params.id, req.body?.estado));
  } catch (error) {
    next(error);
  }
}

/* --- Participación (Fase 6) --- */

export async function obtenerQr(req, res, next) {
  try {
    res.json(await generarTokenQr(req.perfil, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function listarParticipantes(req, res, next) {
  try {
    res.json(await consultarParticipantes(req.perfil, req.params.id));
  } catch (error) {
    next(error);
  }
}
