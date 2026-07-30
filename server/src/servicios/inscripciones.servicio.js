import ErrorHttp from '../errores/ErrorHttp.js';
import { validarId } from './laboratorios.servicio.js';
import { buscarActividadPorId } from '../repositorios/actividades.repositorio.js';
import { existeAsignacion } from '../repositorios/asignaciones.repositorio.js';
import {
  inscribirConCupo,
  buscarInscripcionPorId,
  cancelarInscripcion,
  listarInscripcionesDeUsuario,
  listarParticipantes,
} from '../repositorios/inscripciones.repositorio.js';

/** Obtiene un evento publicado o falla con el error HTTP apropiado. */
export async function exigirEventoPublicado(actividadIdCrudo) {
  const actividad = await buscarActividadPorId(validarId(actividadIdCrudo));

  if (!actividad || actividad.tipo !== 'evento') {
    throw new ErrorHttp(404, 'El evento no existe');
  }
  if (actividad.estado !== 'publicada') {
    throw new ErrorHttp(400, 'El evento no está abierto a inscripciones');
  }
  return actividad;
}

export async function crearInscripcion(perfil, cuerpo) {
  const actividad = await exigirEventoPublicado(cuerpo?.actividadId);

  const { resultado, inscripcion } = await inscribirConCupo(actividad, perfil.id);

  if (resultado === 'duplicada') {
    throw new ErrorHttp(409, 'Ya estás inscrito en este evento');
  }
  if (resultado === 'sin_cupo') {
    throw new ErrorHttp(409, 'El evento ya no tiene cupos disponibles');
  }

  return inscripcion;
}

export async function cancelarMiInscripcion(perfil, inscripcionIdCrudo) {
  const inscripcion = await buscarInscripcionPorId(validarId(inscripcionIdCrudo));

  // 404 también cuando la inscripción es de otra persona: no se revela
  // la existencia de inscripciones ajenas.
  if (!inscripcion || inscripcion.usuario_id !== perfil.id) {
    throw new ErrorHttp(404, 'La inscripción no existe');
  }
  if (inscripcion.estado !== 'activa') {
    throw new ErrorHttp(400, 'La inscripción ya está cancelada');
  }

  await cancelarInscripcion(inscripcion);
}

export function consultarMisInscripciones(perfil) {
  return listarInscripcionesDeUsuario(perfil.id);
}

/** Lista de inscritos/asistentes para el gestor asignado o el admin. */
export async function consultarParticipantes(perfil, actividadIdCrudo) {
  const actividad = await buscarActividadPorId(validarId(actividadIdCrudo));
  if (!actividad) throw new ErrorHttp(404, 'La actividad no existe');

  if (
    perfil.rol !== 'administrador' &&
    !(await existeAsignacion(perfil.id, actividad.laboratorio_id))
  ) {
    throw new ErrorHttp(403, 'No tiene asignado este laboratorio');
  }

  return listarParticipantes(actividad.id);
}
