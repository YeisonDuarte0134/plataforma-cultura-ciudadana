import { consultarInfoPlataforma } from '../servicios/info.servicio.js';

export async function obtenerInfo(req, res, next) {
  try {
    const info = await consultarInfoPlataforma();
    res.json(info);
  } catch (error) {
    next(error);
  }
}
