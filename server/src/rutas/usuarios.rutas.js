import { Router } from 'express';
import { cargarPerfil } from '../middleware/autenticacion.js';
import {
  registrar,
  obtenerMiPerfil,
  actualizarMiPerfil,
  obtenerOpcionesRegistro,
} from '../controladores/usuarios.controlador.js';

/**
 * Recibe el middleware verificarToken ya fabricado (inyección desde app.js)
 * para que las pruebas usen un verificador falso sin tocar firebase-admin.
 */
export default function crearUsuariosRutas(verificarToken) {
  const router = Router();

  router.get('/opciones-registro', obtenerOpcionesRegistro);
  router.post('/registro', verificarToken, registrar);
  router.get('/me', verificarToken, cargarPerfil, obtenerMiPerfil);
  router.patch('/me', verificarToken, cargarPerfil, actualizarMiPerfil);

  return router;
}
