import { Router } from 'express';
import {
  listarLaboratorios,
  obtenerLaboratorio,
} from '../controladores/laboratorios.controlador.js';

const router = Router();

// Lectura pública (vitrina); la escritura llega en la Fase 4 con autorización.
router.get('/', listarLaboratorios);
router.get('/:id', obtenerLaboratorio);

export default router;
