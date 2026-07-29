import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import {
  listarLaboratorios,
  obtenerLaboratorio,
  listarAdministrables,
  obtenerAdministrable,
  crear,
  editar,
  listarGestores,
  agregarGestor,
  quitarGestor,
} from '../controladores/laboratorios.controlador.js';

export default function crearLaboratoriosRutas(verificarToken) {
  const router = Router();

  const soloGestorOAdmin = [verificarToken, cargarPerfil, requerirRol('gestor', 'administrador')];
  const soloAdmin = [verificarToken, cargarPerfil, requerirRol('administrador')];

  // Lectura pública (vitrina). "mios" va antes de "/:id" para no colisionar.
  router.get('/', listarLaboratorios);
  router.get('/mios', ...soloGestorOAdmin, listarAdministrables);
  router.get('/:id', obtenerLaboratorio);

  // Panel: detalle administrable (incluye inactivos, con control de pertenencia).
  router.get('/:id/admin', ...soloGestorOAdmin, obtenerAdministrable);

  // Escritura: crear y activar/desactivar son de admin; editar admite al gestor asignado.
  router.post('/', ...soloAdmin, crear);
  router.patch('/:id', ...soloGestorOAdmin, editar);

  // Asignación de gestores (solo admin).
  router.get('/:id/gestores', ...soloAdmin, listarGestores);
  router.post('/:id/gestores', ...soloAdmin, agregarGestor);
  router.delete('/:id/gestores/:usuarioId', ...soloAdmin, quitarGestor);

  return router;
}
