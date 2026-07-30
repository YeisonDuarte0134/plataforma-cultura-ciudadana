import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import { registrarPorQr, registrarManual } from '../controladores/asistencias.controlador.js';

export default function crearAsistenciasRutas(verificarToken) {
  const router = Router();

  router.use(verificarToken, cargarPerfil);

  // El ciudadano registra su asistencia con el token del QR escaneado.
  router.post('/', registrarPorQr);

  // Respaldo manual del gestor asignado (o el admin).
  router.post('/manual', requerirRol('gestor', 'administrador'), registrarManual);

  return router;
}
