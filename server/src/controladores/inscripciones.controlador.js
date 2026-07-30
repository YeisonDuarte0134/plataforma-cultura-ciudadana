import {
  crearInscripcion,
  cancelarMiInscripcion,
  consultarMisInscripciones,
} from '../servicios/inscripciones.servicio.js';

export async function inscribirse(req, res, next) {
  try {
    res.status(201).json(await crearInscripcion(req.perfil, req.body));
  } catch (error) {
    next(error);
  }
}

export async function cancelar(req, res, next) {
  try {
    await cancelarMiInscripcion(req.perfil, req.params.id);
    res.json({ mensaje: 'Inscripción cancelada' });
  } catch (error) {
    next(error);
  }
}

export async function misInscripciones(req, res, next) {
  try {
    res.json(await consultarMisInscripciones(req.perfil));
  } catch (error) {
    next(error);
  }
}
