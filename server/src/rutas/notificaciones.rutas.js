import { Router } from 'express';
import { cargarPerfil } from '../middleware/autenticacion.js';
import { misNotificaciones, marcarLeidas } from '../controladores/notificaciones.controlador.js';

/**
 * Fase 11 — bandeja de notificaciones internas. Todo es personal: exige
 * sesión y solo opera sobre las notificaciones de quien pregunta.
 */
export default function crearNotificacionesRutas(verificarToken) {
  const router = Router();

  router.get('/', verificarToken, cargarPerfil, misNotificaciones);
  router.patch('/leidas', verificarToken, cargarPerfil, marcarLeidas);

  return router;
}
