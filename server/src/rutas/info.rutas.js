import { Router } from 'express';
import { obtenerInfo } from '../controladores/info.controlador.js';

const router = Router();

router.get('/', obtenerInfo);

export default router;
