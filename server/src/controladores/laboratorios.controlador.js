import {
  consultarLaboratorios,
  consultarLaboratorioPorId,
} from '../servicios/laboratorios.servicio.js';

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
