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
  obtenerQr,
  listarParticipantes,
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

  // Participación (Fase 6): QR y lista de inscritos, solo panel.
  router.get('/:id/qr', ...soloGestorOAdmin, obtenerQr);
  router.get('/:id/participantes', ...soloGestorOAdmin, listarParticipantes);

  router.get('/:id', obtenerPublica);

  return router;
}
