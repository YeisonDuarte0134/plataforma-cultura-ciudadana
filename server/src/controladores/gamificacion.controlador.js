import { consultarMiProgreso, consultarRanking } from '../servicios/gamificacion.servicio.js';

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
