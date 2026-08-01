import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import { limitadorAsistencias } from '../middleware/limitadores.js';
import { registrarPorQr, registrarManual } from '../controladores/asistencias.controlador.js';

export default function crearAsistenciasRutas(verificarToken) {
  const router = Router();

  router.use(verificarToken, cargarPerfil);

  // El ciudadano registra su asistencia con el token del QR escaneado.
  // El límite cuenta por usuario, no por IP: en el lugar del evento muchas
  // personas comparten la misma red.
  router.post('/', limitadorAsistencias, registrarPorQr);

  // Respaldo manual del gestor asignado (o el admin).
  router.post('/manual', requerirRol('gestor', 'administrador'), registrarManual);

  return router;
}
