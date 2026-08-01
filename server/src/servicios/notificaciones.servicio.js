import {
  listarNotificacionesDeUsuario,
  contarNoLeidas,
  marcarTodasLeidas,
} from '../repositorios/notificaciones.repositorio.js';

/**
 * Bandeja de notificaciones internas (Fase 11, HU-19). La generación no
 * pasa por aquí: ocurre dentro de las transacciones que registran el hecho
 * (publicar actividad, moderar evidencia, otorgar insignia).
 */
export async function consultarMisNotificaciones(perfil) {
  const [notificaciones, noLeidas] = await Promise.all([
    listarNotificacionesDeUsuario(perfil.id),
    contarNoLeidas(perfil.id),
  ]);
  return { noLeidas, notificaciones };
}

export async function marcarMisNotificacionesLeidas(perfil) {
  const marcadas = await marcarTodasLeidas(perfil.id);
  return { marcadas };
}
