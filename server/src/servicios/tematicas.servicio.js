import ErrorHttp from '../errores/ErrorHttp.js';
import { validarId } from './laboratorios.servicio.js';
import {
  listarTematicasActivas,
  listarTodasLasTematicas,
  buscarTematicaPorId,
  crearTematica,
  actualizarTematica,
  existeNombreTematica,
} from '../repositorios/tematicas.repositorio.js';

function validarNombre(nombre) {
  if (typeof nombre !== 'string') {
    throw new ErrorHttp(400, 'El nombre de la temática es obligatorio');
  }
  const limpio = nombre.replace(/[\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (limpio.length < 3 || limpio.length > 60) {
    throw new ErrorHttp(400, 'El nombre debe tener entre 3 y 60 caracteres');
  }
  return limpio;
}

function validarDescripcion(descripcion) {
  if (descripcion === undefined || descripcion === null || descripcion === '') return null;
  if (typeof descripcion !== 'string' || descripcion.trim().length > 300) {
    throw new ErrorHttp(400, 'La descripción no puede superar 300 caracteres');
  }
  return descripcion.replace(/[\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function consultarTematicasPublicas() {
  return listarTematicasActivas();
}

export function consultarTodasLasTematicas() {
  return listarTodasLasTematicas();
}

export async function crearNuevaTematica(cuerpo) {
  const nombre = validarNombre(cuerpo?.nombre);

  if (await existeNombreTematica(nombre)) {
    throw new ErrorHttp(409, 'Ya existe una temática con ese nombre');
  }

  return crearTematica({ nombre, descripcion: validarDescripcion(cuerpo?.descripcion) });
}

export async function editarTematica(idCrudo, cuerpo) {
  const id = validarId(idCrudo);
  const existente = await buscarTematicaPorId(id);
  if (!existente) throw new ErrorHttp(404, 'La temática no existe');

  const cambios = {};
  if (cuerpo?.nombre !== undefined) {
    cambios.nombre = validarNombre(cuerpo.nombre);
    if (await existeNombreTematica(cambios.nombre, id)) {
      throw new ErrorHttp(409, 'Ya existe una temática con ese nombre');
    }
  }
  if (cuerpo?.descripcion !== undefined) cambios.descripcion = validarDescripcion(cuerpo.descripcion);
  if (cuerpo?.activa !== undefined) {
    if (typeof cuerpo.activa !== 'boolean') {
      throw new ErrorHttp(400, 'El campo activa debe ser booleano');
    }
    cambios.activa = cuerpo.activa;
  }

  if (Object.keys(cambios).length === 0) {
    throw new ErrorHttp(400, 'No hay cambios para aplicar');
  }

  return actualizarTematica(id, cambios);
}

/** Valida que una temática exista y esté activa (para clasificar actividades). */
export async function exigirTematicaActiva(idCrudo) {
  const id = validarId(idCrudo);
  const tematica = await buscarTematicaPorId(id);
  if (!tematica || !tematica.activa) {
    throw new ErrorHttp(400, 'La temática indicada no existe o está inactiva');
  }
  return tematica;
}
