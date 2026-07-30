import jwt from 'jsonwebtoken';
import config from '../config.js';
import ErrorHttp from '../errores/ErrorHttp.js';
import { validarId } from './laboratorios.servicio.js';
import { buscarActividadPorId } from '../repositorios/actividades.repositorio.js';
import { existeAsignacion } from '../repositorios/asignaciones.repositorio.js';
import { buscarUsuarioPorId } from '../repositorios/usuarios.repositorio.js';
import { buscarInscripcionActiva } from '../repositorios/inscripciones.repositorio.js';
import { crearAsistencia } from '../repositorios/asistencias.repositorio.js';

/**
 * Ventana de asistencia de un evento: desde 1 hora antes de su inicio
 * hasta 4 horas después. El token QR solo es válido dentro de ella
 * (claims nbf y exp del JWT), aunque el gestor puede generarlo e
 * imprimirlo con anticipación.
 */
const HORAS_ANTES = 1;
const HORAS_DESPUES = 4;

export function calcularVentana(fechaInicio) {
  const inicio = new Date(fechaInicio).getTime();
  return {
    desde: new Date(inicio - HORAS_ANTES * 3600_000),
    hasta: new Date(inicio + HORAS_DESPUES * 3600_000),
  };
}

async function exigirAlcance(perfil, laboratorioId) {
  if (perfil.rol === 'administrador') return;
  if (!(await existeAsignacion(perfil.id, laboratorioId))) {
    throw new ErrorHttp(403, 'No tiene asignado este laboratorio');
  }
}

/** Genera el token QR del evento (gestor asignado o admin). */
export async function generarTokenQr(perfil, actividadIdCrudo) {
  const actividad = await buscarActividadPorId(validarId(actividadIdCrudo));

  if (!actividad || actividad.tipo !== 'evento') {
    throw new ErrorHttp(404, 'El evento no existe');
  }
  await exigirAlcance(perfil, actividad.laboratorio_id);

  if (actividad.estado !== 'publicada') {
    throw new ErrorHttp(400, 'Solo los eventos publicados tienen código QR de asistencia');
  }
  if (!actividad.fecha_inicio) {
    throw new ErrorHttp(400, 'El evento no tiene fecha de inicio');
  }

  const ventana = calcularVentana(actividad.fecha_inicio);

  const token = jwt.sign(
    {
      act: actividad.id,
      nbf: Math.floor(ventana.desde.getTime() / 1000),
      exp: Math.floor(ventana.hasta.getTime() / 1000),
    },
    config.secretoQr
  );

  return {
    token,
    urlAsistencia: `${config.origenCors}/asistencia/${token}`,
    ventana,
    actividad: {
      id: actividad.id,
      titulo: actividad.titulo,
      fecha_inicio: actividad.fecha_inicio,
      lugar: actividad.lugar,
    },
  };
}

/** Registra la asistencia del ciudadano autenticado a partir del token del QR. */
export async function registrarAsistenciaPorQr(perfil, cuerpo) {
  let datos;
  try {
    datos = jwt.verify(cuerpo?.token ?? '', config.secretoQr);
  } catch {
    // Firma inválida, token expirado (exp) o aún no vigente (nbf).
    throw new ErrorHttp(
      400,
      'El código QR no es válido o está fuera de la ventana de tiempo del evento'
    );
  }

  const actividad = await buscarActividadPorId(datos.act);
  if (!actividad || actividad.estado !== 'publicada') {
    throw new ErrorHttp(400, 'El evento ya no está disponible');
  }

  if (!(await buscarInscripcionActiva(actividad.id, perfil.id))) {
    throw new ErrorHttp(400, 'Debes estar inscrito en el evento para registrar tu asistencia');
  }

  const asistencia = await crearAsistencia({
    actividad,
    usuarioId: perfil.id,
    metodo: 'qr',
  });

  if (!asistencia) {
    throw new ErrorHttp(409, 'Tu asistencia a este evento ya estaba registrada');
  }

  return { ...asistencia, actividad_titulo: actividad.titulo };
}

/** Asistencia manual: respaldo del gestor para inscritos sin acceso al QR. */
export async function registrarAsistenciaManual(perfil, cuerpo) {
  const actividad = await buscarActividadPorId(validarId(cuerpo?.actividadId));
  if (!actividad || actividad.tipo !== 'evento') {
    throw new ErrorHttp(404, 'El evento no existe');
  }
  await exigirAlcance(perfil, actividad.laboratorio_id);

  if (actividad.estado !== 'publicada') {
    throw new ErrorHttp(400, 'El evento no está publicado');
  }

  const usuario = await buscarUsuarioPorId(validarId(cuerpo?.usuarioId));
  if (!usuario) throw new ErrorHttp(404, 'El usuario no existe');

  if (!(await buscarInscripcionActiva(actividad.id, usuario.id))) {
    throw new ErrorHttp(400, 'El usuario no está inscrito en el evento');
  }

  const asistencia = await crearAsistencia({
    actividad,
    usuarioId: usuario.id,
    metodo: 'manual',
    registradaPor: perfil.id,
  });

  if (!asistencia) {
    throw new ErrorHttp(409, 'La asistencia de este usuario ya estaba registrada');
  }

  return asistencia;
}
