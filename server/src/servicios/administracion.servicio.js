import ErrorHttp from '../errores/ErrorHttp.js';
import { validarId } from './laboratorios.servicio.js';
import { buscarLaboratorioPorId } from '../repositorios/laboratorios.repositorio.js';
import {
  listarGestoresDeLaboratorio,
  crearAsignacion,
  eliminarAsignacion,
  contarAsignacionesDeUsuario,
} from '../repositorios/asignaciones.repositorio.js';
import {
  buscarUsuarioPorId,
  buscarUsuarios,
  cambiarEstadoUsuario,
  cambiarRolUsuario,
} from '../repositorios/usuarios.repositorio.js';

async function obtenerLaboratorioExistente(idCrudo) {
  const laboratorio = await buscarLaboratorioPorId(validarId(idCrudo));
  if (!laboratorio) throw new ErrorHttp(404, 'El laboratorio no existe');
  return laboratorio;
}

/* --- Gestores por laboratorio --- */

export async function consultarGestores(laboratorioIdCrudo) {
  const laboratorio = await obtenerLaboratorioExistente(laboratorioIdCrudo);
  return listarGestoresDeLaboratorio(laboratorio.id);
}

/**
 * Asigna un gestor. Si el usuario es ciudadano se promueve a gestor;
 * un administrador conserva su rol (su alcance ya es global).
 */
export async function asignarGestor(laboratorioIdCrudo, usuarioIdCrudo) {
  const laboratorio = await obtenerLaboratorioExistente(laboratorioIdCrudo);
  const usuario = await buscarUsuarioPorId(validarId(usuarioIdCrudo));

  if (!usuario) throw new ErrorHttp(404, 'El usuario no existe');
  if (usuario.estado !== 'activo') {
    throw new ErrorHttp(400, 'No se puede asignar un usuario desactivado');
  }

  const creada = await crearAsignacion(usuario.id, laboratorio.id);
  if (!creada) {
    throw new ErrorHttp(409, 'El usuario ya es gestor de este laboratorio');
  }

  if (usuario.rol === 'ciudadano') {
    await cambiarRolUsuario(usuario.id, 'gestor');
  }

  return listarGestoresDeLaboratorio(laboratorio.id);
}

/**
 * Revoca un gestor. Si era su última asignación y su rol es gestor,
 * vuelve a ser ciudadano.
 */
export async function revocarGestor(laboratorioIdCrudo, usuarioIdCrudo) {
  const laboratorio = await obtenerLaboratorioExistente(laboratorioIdCrudo);
  const usuario = await buscarUsuarioPorId(validarId(usuarioIdCrudo));

  if (!usuario) throw new ErrorHttp(404, 'El usuario no existe');

  const eliminada = await eliminarAsignacion(usuario.id, laboratorio.id);
  if (!eliminada) {
    throw new ErrorHttp(404, 'El usuario no es gestor de este laboratorio');
  }

  if (usuario.rol === 'gestor' && (await contarAsignacionesDeUsuario(usuario.id)) === 0) {
    await cambiarRolUsuario(usuario.id, 'ciudadano');
  }

  return listarGestoresDeLaboratorio(laboratorio.id);
}

/* --- Administración de usuarios --- */

export function buscarUsuariosAdmin(textoCrudo) {
  const texto = typeof textoCrudo === 'string' ? textoCrudo.trim() : '';
  // Sin texto se lista el directorio completo (la pestaña Usuarios abre con
  // todos a la vista); con texto se filtra. Se escapan los comodines de
  // ILIKE para que la búsqueda sea literal.
  return buscarUsuarios(texto.replace(/[%_\\]/g, '\\$&'));
}

export async function cambiarEstado(adminPerfil, usuarioIdCrudo, estado) {
  if (!['activo', 'desactivado'].includes(estado)) {
    throw new ErrorHttp(400, "El estado debe ser 'activo' o 'desactivado'");
  }

  const usuario = await buscarUsuarioPorId(validarId(usuarioIdCrudo));
  if (!usuario) throw new ErrorHttp(404, 'El usuario no existe');

  if (usuario.id === adminPerfil.id) {
    throw new ErrorHttp(400, 'No puede desactivar su propia cuenta');
  }

  // El estado 'eliminado' es terminal (Habeas Data): nadie lo revierte.
  if (usuario.estado === 'eliminado') {
    throw new ErrorHttp(400, 'Una cuenta eliminada no se puede modificar');
  }

  return cambiarEstadoUsuario(usuario.id, estado);
}
