import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import { limitadorRegistro, limitadorHabeasData } from '../middleware/limitadores.js';
import {
  registrar,
  obtenerMiPerfil,
  actualizarMiPerfil,
  obtenerOpcionesRegistro,
  misIntereses,
  reemplazarMisIntereses,
  bajaVoluntaria,
  crearEliminarMiCuenta,
  buscarUsuariosComoAdmin,
  cambiarEstadoUsuario,
} from '../controladores/usuarios.controlador.js';

/**
 * Recibe el middleware verificarToken ya fabricado (inyección desde app.js)
 * para que las pruebas usen un verificador falso sin tocar firebase-admin.
 * `dependencias` trae la cuenta de Firebase y el almacén de fotos que la
 * eliminación definitiva necesita (Fase 11).
 */
export default function crearUsuariosRutas(verificarToken, dependencias) {
  const router = Router();

  const soloAdmin = [verificarToken, cargarPerfil, requerirRol('administrador')];

  router.get('/opciones-registro', obtenerOpcionesRegistro);
  router.post('/registro', limitadorRegistro, verificarToken, registrar);
  router.get('/me', verificarToken, cargarPerfil, obtenerMiPerfil);
  router.patch('/me', verificarToken, cargarPerfil, actualizarMiPerfil);

  // Temáticas de interés y Habeas Data (Fase 11).
  router.get('/me/intereses', verificarToken, cargarPerfil, misIntereses);
  router.put('/me/intereses', verificarToken, cargarPerfil, reemplazarMisIntereses);
  router.post('/me/baja', verificarToken, limitadorHabeasData, cargarPerfil, bajaVoluntaria);
  router.delete('/me', verificarToken, limitadorHabeasData, cargarPerfil, crearEliminarMiCuenta(dependencias));

  // Administración de usuarios (Fase 4).
  router.get('/', ...soloAdmin, buscarUsuariosComoAdmin);
  router.patch('/:id/estado', ...soloAdmin, cambiarEstadoUsuario);

  return router;
}
