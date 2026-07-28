import { Router } from 'express';
import { obtenerSalud } from '../controladores/salud.controlador.js';

const router = Router();

router.get('/', obtenerSalud);

export default router;
