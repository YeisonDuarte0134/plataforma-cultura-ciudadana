import ErrorHttp from '../errores/ErrorHttp.js';
import { validarId } from './laboratorios.servicio.js';
import { buscarLaboratorioPorId } from '../repositorios/laboratorios.repositorio.js';
import { calcularNivel, calcularSiguienteNivel } from './gamificacion.reglas.js';
import {
  obtenerPuntosDeUsuario,
  listarNiveles,
  listarInsigniasDeUsuario,
  listarHistorialDeUsuario,
  listarRanking,
} from '../repositorios/gamificacion.repositorio.js';

/** Progreso gamificado del perfil: puntos, nivel, insignias e historial. */
export async function consultarMiProgreso(perfil) {
  const [puntos, niveles, insignias, historial] = await Promise.all([
    obtenerPuntosDeUsuario(perfil.id),
    listarNiveles(),
    listarInsigniasDeUsuario(perfil.id),
    listarHistorialDeUsuario(perfil.id),
  ]);

  const nivel = calcularNivel(puntos, niveles);
  const siguiente = calcularSiguienteNivel(puntos, niveles);

  return {
    puntos,
    nivel,
    siguienteNivel: siguiente && { ...siguiente, faltan: siguiente.puntos_minimos - puntos },
    insignias,
    historial,
  };
}

/**
 * Ranking público (general o por laboratorio), con datos anonimizados:
 * solo alias, avatar, puntos y nivel.
 */
export async function consultarRanking(query) {
  let laboratorioId = null;
  if (query.laboratorio !== undefined) {
    laboratorioId = validarId(query.laboratorio);
    if (!(await buscarLaboratorioPorId(laboratorioId))) {
      throw new ErrorHttp(404, 'El laboratorio no existe');
    }
  }

  const [filas, niveles] = await Promise.all([
    listarRanking({ laboratorioId }),
    listarNiveles(),
  ]);

  return filas.map((fila, indice) => ({
    posicion: indice + 1,
    alias: fila.alias,
    avatar: fila.avatar,
    puntos: fila.puntos,
    nivel: calcularNivel(fila.puntos, niveles)?.nombre ?? null,
  }));
}
