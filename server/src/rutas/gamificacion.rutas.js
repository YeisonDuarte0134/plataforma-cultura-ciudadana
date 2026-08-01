import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import {
  miProgreso,
  ranking,
  configuracion,
  actualizarRegla,
  reemplazarNiveles,
  crearInsignia,
  actualizarInsignia,
} from '../controladores/gamificacion.controlador.js';

export default function crearGamificacionRutas(verificarToken) {
  const router = Router();

  // El ranking es público (datos anonimizados: alias y avatar).
  router.get('/ranking', ranking);

  // El progreso propio exige sesión (cualquier rol).
  router.get('/mi-progreso', verificarToken, cargarPerfil, miProgreso);

  // Configuración del motor (Fase 9): exclusiva del administrador.
  const soloAdmin = [verificarToken, cargarPerfil, requerirRol('administrador')];
  router.get('/configuracion', ...soloAdmin, configuracion);
  router.patch('/reglas/:accion', ...soloAdmin, actualizarRegla);
  router.put('/niveles', ...soloAdmin, reemplazarNiveles);
  router.post('/insignias', ...soloAdmin, crearInsignia);
  router.patch('/insignias/:id', ...soloAdmin, actualizarInsignia);

  return router;
}
