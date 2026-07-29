import {
  consultarLaboratorios,
  consultarLaboratorioPorId,
  consultarLaboratoriosAdministrables,
  consultarLaboratorioAdministrable,
  crearNuevoLaboratorio,
  editarLaboratorio,
} from '../servicios/laboratorios.servicio.js';
import {
  consultarGestores,
  asignarGestor,
  revocarGestor,
} from '../servicios/administracion.servicio.js';

export async function listarLaboratorios(req, res, next) {
  try {
    res.json(await consultarLaboratorios());
  } catch (error) {
    next(error);
  }
}

export async function obtenerLaboratorio(req, res, next) {
  try {
    res.json(await consultarLaboratorioPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

/* --- Panel de administración --- */

export async function listarAdministrables(req, res, next) {
  try {
    res.json(await consultarLaboratoriosAdministrables(req.perfil));
  } catch (error) {
    next(error);
  }
}

export async function obtenerAdministrable(req, res, next) {
  try {
    res.json(await consultarLaboratorioAdministrable(req.perfil, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await crearNuevoLaboratorio(req.body));
  } catch (error) {
    next(error);
  }
}

export async function editar(req, res, next) {
  try {
    res.json(await editarLaboratorio(req.perfil, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function listarGestores(req, res, next) {
  try {
    res.json(await consultarGestores(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function agregarGestor(req, res, next) {
  try {
    res.status(201).json(await asignarGestor(req.params.id, req.body?.usuarioId));
  } catch (error) {
    next(error);
  }
}

export async function quitarGestor(req, res, next) {
  try {
    res.json(await revocarGestor(req.params.id, req.params.usuarioId));
  } catch (error) {
    next(error);
  }
}
