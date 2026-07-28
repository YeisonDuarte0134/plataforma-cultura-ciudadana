import { verificarSalud } from '../servicios/salud.servicio.js';

export async function obtenerSalud(req, res, next) {
  try {
    const salud = await verificarSalud();
    const codigo = salud.estado === 'ok' ? 200 : 503;
    res.status(codigo).json(salud);
  } catch (error) {
    next(error);
  }
}
