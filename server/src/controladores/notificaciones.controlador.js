import {
  consultarMisNotificaciones,
  marcarMisNotificacionesLeidas,
} from '../servicios/notificaciones.servicio.js';

export async function misNotificaciones(req, res, next) {
  try {
    res.json(await consultarMisNotificaciones(req.perfil));
  } catch (error) {
    next(error);
  }
}

export async function marcarLeidas(req, res, next) {
  try {
    res.json(await marcarMisNotificacionesLeidas(req.perfil));
  } catch (error) {
    next(error);
  }
}
