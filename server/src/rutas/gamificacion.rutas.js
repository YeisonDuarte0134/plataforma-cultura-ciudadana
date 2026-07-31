import { Router } from 'express';
import { cargarPerfil } from '../middleware/autenticacion.js';
import { miProgreso, ranking } from '../controladores/gamificacion.controlador.js';

export default function crearGamificacionRutas(verificarToken) {
  const router = Router();

  // El ranking es público (datos anonimizados: alias y avatar).
  router.get('/ranking', ranking);

  // El progreso propio exige sesión (cualquier rol).
  router.get('/mi-progreso', verificarToken, cargarPerfil, miProgreso);

  return router;
}
