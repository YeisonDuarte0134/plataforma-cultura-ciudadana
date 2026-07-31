import { randomUUID } from 'node:crypto';
import ErrorHttp from '../errores/ErrorHttp.js';
import { validarId } from './laboratorios.servicio.js';
import { buscarActividadPorId } from '../repositorios/actividades.repositorio.js';
import { buscarLaboratorioPorId } from '../repositorios/laboratorios.repositorio.js';
import { existeAsignacion } from '../repositorios/asignaciones.repositorio.js';
import {
  buscarEvidenciaDeUsuario,
  buscarEvidenciaPorId,
  guardarEnvio,
  moderarEvidencia,
  listarEvidenciasDeUsuario,
  listarEvidenciasPendientes,
} from '../repositorios/evidencias.repositorio.js';

/** Extensión de archivo por tipo MIME admitido (la subida filtra el resto). */
const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function validarTextoEvidencia(valor, { obligatorio }) {
  if (valor === undefined || valor === null || valor === '') {
    if (obligatorio) {
      throw new ErrorHttp(400, 'Este reto requiere un texto como evidencia');
    }
    return null;
  }
  if (typeof valor !== 'string') {
    throw new ErrorHttp(400, 'El texto de la evidencia no es válido');
  }
  const limpio = valor.replace(/[\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (limpio.length < 10 || limpio.length > 2000) {
    throw new ErrorHttp(400, 'El texto de la evidencia debe tener entre 10 y 2000 caracteres');
  }
  return limpio;
}

/** Obtiene un reto abierto a envíos o falla con el error HTTP apropiado. */
async function exigirRetoAbierto(actividadIdCrudo) {
  const actividad = await buscarActividadPorId(validarId(actividadIdCrudo));

  if (!actividad || actividad.tipo !== 'reto') {
    throw new ErrorHttp(404, 'El reto no existe');
  }
  if (actividad.estado !== 'publicada') {
    throw new ErrorHttp(400, 'El reto no está abierto a envíos');
  }
  if (actividad.fecha_limite && new Date(actividad.fecha_limite) < new Date()) {
    throw new ErrorHttp(400, 'La fecha límite del reto ya pasó');
  }
  return actividad;
}

/**
 * Envío de evidencia del ciudadano. `archivo` es el adjunto de multer
 * (opcional) y `almacenArchivos` el almacén inyectado (Firebase Storage en
 * producción, un doble en pruebas).
 */
export async function enviarEvidencia(perfil, cuerpo, archivo, almacenArchivos) {
  const actividad = await exigirRetoAbierto(cuerpo?.actividadId);

  const existente = await buscarEvidenciaDeUsuario(actividad.id, perfil.id);
  if (existente?.estado === 'pendiente') {
    throw new ErrorHttp(409, 'Ya tienes un envío pendiente de revisión para este reto');
  }
  if (existente?.estado === 'aprobada') {
    throw new ErrorHttp(409, 'Tu evidencia para este reto ya fue aprobada');
  }

  const requiereFoto = ['foto', 'foto_y_texto'].includes(actividad.tipo_evidencia);
  const requiereTexto = ['texto', 'foto_y_texto'].includes(actividad.tipo_evidencia);

  if (requiereFoto && !archivo) {
    throw new ErrorHttp(400, 'Este reto requiere una foto como evidencia');
  }
  if (!requiereFoto && archivo) {
    throw new ErrorHttp(400, 'Este reto solo admite evidencia de texto');
  }

  const texto = validarTextoEvidencia(cuerpo?.texto, { obligatorio: requiereTexto });

  let fotoUrl = null;
  if (archivo) {
    const extension = EXTENSIONES[archivo.mimetype];
    if (!extension) {
      throw new ErrorHttp(400, 'La foto debe ser JPG, PNG o WebP');
    }
    fotoUrl = await almacenArchivos.subirFotoEvidencia({
      buffer: archivo.buffer,
      tipoContenido: archivo.mimetype,
      ruta: `evidencias/${perfil.id}/reto-${actividad.id}-${randomUUID()}.${extension}`,
    });
  }

  const evidencia = await guardarEnvio(actividad, perfil.id, { texto, fotoUrl });
  return { ...evidencia, reenvio: Boolean(existente) };
}

export function consultarMisEvidencias(perfil) {
  return listarEvidenciasDeUsuario(perfil.id);
}

/** Cola de moderación del laboratorio, para el gestor asignado o el admin. */
export async function consultarCola(perfil, laboratorioIdCrudo) {
  const laboratorioId = validarId(laboratorioIdCrudo);
  if (!(await buscarLaboratorioPorId(laboratorioId))) {
    throw new ErrorHttp(404, 'El laboratorio no existe');
  }
  if (
    perfil.rol !== 'administrador' &&
    !(await existeAsignacion(perfil.id, laboratorioId))
  ) {
    throw new ErrorHttp(403, 'No tiene asignado este laboratorio');
  }
  return listarEvidenciasPendientes(laboratorioId);
}

/** Decisión del gestor: aprobar, o rechazar con comentario obligatorio. */
export async function decidirSobreEvidencia(perfil, evidenciaIdCrudo, cuerpo) {
  const evidencia = await buscarEvidenciaPorId(validarId(evidenciaIdCrudo));
  if (!evidencia) {
    throw new ErrorHttp(404, 'La evidencia no existe');
  }

  if (
    perfil.rol !== 'administrador' &&
    !(await existeAsignacion(perfil.id, evidencia.laboratorio_id))
  ) {
    throw new ErrorHttp(403, 'No tiene asignado este laboratorio');
  }

  const decision = cuerpo?.decision;
  if (!['aprobar', 'rechazar'].includes(decision)) {
    throw new ErrorHttp(400, "La decisión debe ser 'aprobar' o 'rechazar'");
  }
  if (evidencia.estado !== 'pendiente') {
    throw new ErrorHttp(400, 'La evidencia ya fue moderada');
  }

  // El comentario es obligatorio al rechazar: el ciudadano necesita saber
  // qué corregir para reenviar. Al aprobar es opcional.
  let comentario = null;
  if (cuerpo?.comentario !== undefined && cuerpo.comentario !== null && cuerpo.comentario !== '') {
    if (typeof cuerpo.comentario !== 'string') {
      throw new ErrorHttp(400, 'El comentario no es válido');
    }
    comentario = cuerpo.comentario.replace(/[\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (comentario.length < 5 || comentario.length > 1000) {
      throw new ErrorHttp(400, 'El comentario debe tener entre 5 y 1000 caracteres');
    }
  }
  if (decision === 'rechazar' && !comentario) {
    throw new ErrorHttp(400, 'Para rechazar una evidencia debes explicar el motivo en el comentario');
  }

  return moderarEvidencia(evidencia, decision, comentario, perfil.id);
}
