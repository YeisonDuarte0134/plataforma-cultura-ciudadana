import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import {
  registrar,
  obtenerMiPerfil,
  actualizarMiPerfil,
  obtenerOpcionesRegistro,
  buscarUsuariosComoAdmin,
  cambiarEstadoUsuario,
} from '../controladores/usuarios.controlador.js';

/**
 * Recibe el middleware verificarToken ya fabricado (inyección desde app.js)
 * para que las pruebas usen un verificador falso sin tocar firebase-admin.
 */
export default function crearUsuariosRutas(verificarToken) {
  const router = Router();

  const soloAdmin = [verificarToken, cargarPerfil, requerirRol('administrador')];

  router.get('/opciones-registro', obtenerOpcionesRegistro);
  router.post('/registro', verificarToken, registrar);
  router.get('/me', verificarToken, cargarPerfil, obtenerMiPerfil);
  router.patch('/me', verificarToken, cargarPerfil, actualizarMiPerfil);

  // Administración de usuarios (Fase 4).
  router.get('/', ...soloAdmin, buscarUsuariosComoAdmin);
  router.patch('/:id/estado', ...soloAdmin, cambiarEstadoUsuario);

  return router;
}
