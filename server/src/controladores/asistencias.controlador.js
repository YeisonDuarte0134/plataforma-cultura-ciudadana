import {
  registrarAsistenciaPorQr,
  registrarAsistenciaManual,
} from '../servicios/asistencias.servicio.js';

export async function registrarPorQr(req, res, next) {
  try {
    res.status(201).json(await registrarAsistenciaPorQr(req.perfil, req.body));
  } catch (error) {
    next(error);
  }
}

export async function registrarManual(req, res, next) {
  try {
    res.status(201).json(await registrarAsistenciaManual(req.perfil, req.body));
  } catch (error) {
    next(error);
  }
}
