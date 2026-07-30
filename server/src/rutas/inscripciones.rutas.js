import { Router } from 'express';
import { cargarPerfil } from '../middleware/autenticacion.js';
import {
  inscribirse,
  cancelar,
  misInscripciones,
} from '../controladores/inscripciones.controlador.js';

export default function crearInscripcionesRutas(verificarToken) {
  const router = Router();

  // Toda la gestión de inscripciones exige sesión (cualquier rol).
  router.use(verificarToken, cargarPerfil);

  router.get('/mias', misInscripciones);
  router.post('/', inscribirse);
  router.delete('/:id', cancelar);

  return router;
}
