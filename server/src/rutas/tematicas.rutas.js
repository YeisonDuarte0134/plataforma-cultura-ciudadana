import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import { listarPublicas, listarTodas, crear, editar } from '../controladores/tematicas.controlador.js';

export default function crearTematicasRutas(verificarToken) {
  const router = Router();

  const soloAdmin = [verificarToken, cargarPerfil, requerirRol('administrador')];

  // Lectura pública del catálogo activo; administración solo para el admin.
  router.get('/', listarPublicas);
  router.get('/todas', ...soloAdmin, listarTodas);
  router.post('/', ...soloAdmin, crear);
  router.patch('/:id', ...soloAdmin, editar);

  return router;
}
