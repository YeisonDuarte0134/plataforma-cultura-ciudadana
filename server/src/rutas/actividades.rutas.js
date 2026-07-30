import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import {
  listarPublicas,
  obtenerPublica,
  listarDeLaboratorio,
  obtenerAdministrable,
  crear,
  editar,
  cambiarEstado,
} from '../controladores/actividades.controlador.js';

export default function crearActividadesRutas(verificarToken) {
  const router = Router();

  const soloGestorOAdmin = [verificarToken, cargarPerfil, requerirRol('gestor', 'administrador')];

  // Vitrina pública: solo actividades publicadas.
  router.get('/', listarPublicas);

  // Panel: "admin" va antes de "/:id" para no colisionar con el parámetro.
  router.get('/admin', ...soloGestorOAdmin, listarDeLaboratorio);
  router.get('/:id/admin', ...soloGestorOAdmin, obtenerAdministrable);
  router.post('/', ...soloGestorOAdmin, crear);
  router.patch('/:id', ...soloGestorOAdmin, editar);
  router.patch('/:id/estado', ...soloGestorOAdmin, cambiarEstado);

  router.get('/:id', obtenerPublica);

  return router;
}
