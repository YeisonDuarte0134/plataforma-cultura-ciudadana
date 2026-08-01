import ErrorHttp from '../errores/ErrorHttp.js';
import { validarId } from './laboratorios.servicio.js';
import { exigirTematicaActiva } from './tematicas.servicio.js';
import { existeAsignacion } from '../repositorios/asignaciones.repositorio.js';
import { buscarLaboratorioPorId } from '../repositorios/laboratorios.repositorio.js';
import {
  listarActividadesPublicadas,
  buscarActividadPublicadaPorId,
  listarActividadesDeLaboratorio,
  buscarActividadPorId,
  crearActividad,
  actualizarActividad,
  cambiarEstadoActividad,
} from '../repositorios/actividades.repositorio.js';

/** Transiciones válidas del ciclo de vida. */
const TRANSICIONES = {
  borrador: ['publicada', 'archivada'],
  publicada: ['cerrada', 'archivada'],
  cerrada: ['archivada'],
  archivada: [],
};

function validarTexto(valor, campo, minimo, maximo, { opcional = false } = {}) {
  if (valor === undefined) {
    if (opcional) return undefined;
    throw new ErrorHttp(400, `El campo ${campo} es obligatorio`);
  }
  if (typeof valor !== 'string') {
    throw new ErrorHttp(400, `El campo ${campo} no es válido`);
  }
  const limpio = valor.replace(/[\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (limpio.length < minimo || limpio.length > maximo) {
    throw new ErrorHttp(400, `El campo ${campo} debe tener entre ${minimo} y ${maximo} caracteres`);
  }
  return limpio;
}

function validarFecha(valor, campo, { opcional = false } = {}) {
  if (valor === undefined) {
    if (opcional) return undefined;
    throw new ErrorHttp(400, `El campo ${campo} es obligatorio`);
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    throw new ErrorHttp(400, `El campo ${campo} no es una fecha válida`);
  }
  return fecha.toISOString();
}

function validarCupo(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const cupo = Number(valor);
  if (!Number.isInteger(cupo) || cupo <= 0 || cupo > 100000) {
    throw new ErrorHttp(400, 'El cupo debe ser un entero positivo');
  }
  return cupo;
}

function validarPuntos(valor) {
  const puntos = Number(valor);
  if (valor === undefined || !Number.isInteger(puntos) || puntos <= 0 || puntos > 10000) {
    throw new ErrorHttp(400, 'Los puntos deben ser un entero entre 1 y 10000');
  }
  return puntos;
}

const TIPOS_EVIDENCIA = ['foto', 'texto', 'foto_y_texto'];

function validarTipoEvidencia(valor) {
  if (!TIPOS_EVIDENCIA.includes(valor)) {
    throw new ErrorHttp(400, "El tipo de evidencia debe ser 'foto', 'texto' o 'foto_y_texto'");
  }
  return valor;
}

/** Autorización: el perfil debe ser admin o gestor asignado al laboratorio. */
async function exigirAlcanceSobreLaboratorio(perfil, laboratorioId) {
  if (perfil.rol === 'administrador') return;
  if (!(await existeAsignacion(perfil.id, laboratorioId))) {
    throw new ErrorHttp(403, 'No tiene asignado este laboratorio');
  }
}

/* --- Vitrina pública --- */

export function consultarActividadesPublicas(query) {
  const filtros = {};
  if (query.laboratorio !== undefined) filtros.laboratorioId = validarId(query.laboratorio);
  if (query.tematica !== undefined) filtros.tematicaId = validarId(query.tematica);
  if (query.tipo !== undefined) {
    if (!['evento', 'reto'].includes(query.tipo)) {
      throw new ErrorHttp(400, "El tipo debe ser 'evento' o 'reto'");
    }
    filtros.tipo = query.tipo;
  }
  return listarActividadesPublicadas(filtros);
}

export async function consultarActividadPublica(idCrudo) {
  const actividad = await buscarActividadPublicadaPorId(validarId(idCrudo));
  if (!actividad) {
    throw new ErrorHttp(404, 'La actividad no existe o no está publicada');
  }
  return actividad;
}

/* --- Panel de administración --- */

export async function consultarActividadesAdministrables(perfil, laboratorioIdCrudo) {
  const laboratorioId = validarId(laboratorioIdCrudo);
  if (!(await buscarLaboratorioPorId(laboratorioId))) {
    throw new ErrorHttp(404, 'El laboratorio no existe');
  }
  await exigirAlcanceSobreLaboratorio(perfil, laboratorioId);
  return listarActividadesDeLaboratorio(laboratorioId);
}

export async function crearNuevaActividad(perfil, cuerpo) {
  const tipo = cuerpo?.tipo ?? 'evento';
  if (!['evento', 'reto'].includes(tipo)) {
    throw new ErrorHttp(400, "El tipo debe ser 'evento' o 'reto'");
  }

  const laboratorioId = validarId(cuerpo?.laboratorioId);
  if (!(await buscarLaboratorioPorId(laboratorioId))) {
    throw new ErrorHttp(404, 'El laboratorio no existe');
  }
  await exigirAlcanceSobreLaboratorio(perfil, laboratorioId);

  const tematica = await exigirTematicaActiva(cuerpo?.tematicaId);

  const base = {
    laboratorioId,
    tematicaId: tematica.id,
    tipo,
    titulo: validarTexto(cuerpo?.titulo, 'título', 5, 150),
    descripcion: validarTexto(cuerpo?.descripcion, 'descripción', 10, 3000),
  };

  if (tipo === 'evento') {
    return crearActividad({
      ...base,
      fechaInicio: validarFecha(cuerpo?.fechaInicio, 'fecha de inicio'),
      lugar: validarTexto(cuerpo?.lugar, 'lugar', 5, 200),
      cupo: validarCupo(cuerpo?.cupo),
    });
  }

  return crearActividad({
    ...base,
    puntos: validarPuntos(cuerpo?.puntos),
    fechaLimite: validarFecha(cuerpo?.fechaLimite, 'fecha límite'),
    tipoEvidencia: validarTipoEvidencia(cuerpo?.tipoEvidencia),
  });
}

async function obtenerActividadConAlcance(perfil, idCrudo) {
  const actividad = await buscarActividadPorId(validarId(idCrudo));
  if (!actividad) throw new ErrorHttp(404, 'La actividad no existe');
  await exigirAlcanceSobreLaboratorio(perfil, actividad.laboratorio_id);
  return actividad;
}

export async function consultarActividadAdministrable(perfil, idCrudo) {
  return obtenerActividadConAlcance(perfil, idCrudo);
}

export async function editarActividadExistente(perfil, idCrudo, cuerpo) {
  const actividad = await obtenerActividadConAlcance(perfil, idCrudo);

  if (actividad.estado === 'archivada') {
    throw new ErrorHttp(400, 'Una actividad archivada no se puede editar');
  }

  const cambios = {
    titulo: validarTexto(cuerpo?.titulo, 'título', 5, 150, { opcional: true }),
    descripcion: validarTexto(cuerpo?.descripcion, 'descripción', 10, 3000, { opcional: true }),
    tematicaId:
      cuerpo?.tematicaId !== undefined
        ? (await exigirTematicaActiva(cuerpo.tematicaId)).id
        : undefined,
  };

  // Cada tipo solo admite sus propios campos; los del otro tipo se ignoran.
  if (actividad.tipo === 'evento') {
    cambios.fechaInicio = validarFecha(cuerpo?.fechaInicio, 'fecha de inicio', { opcional: true });
    cambios.lugar = validarTexto(cuerpo?.lugar, 'lugar', 5, 200, { opcional: true });
    cambios.cupo = cuerpo?.cupo !== undefined ? validarCupo(cuerpo.cupo) : undefined;
  } else {
    cambios.puntos = cuerpo?.puntos !== undefined ? validarPuntos(cuerpo.puntos) : undefined;
    cambios.fechaLimite = validarFecha(cuerpo?.fechaLimite, 'fecha límite', { opcional: true });
    cambios.tipoEvidencia =
      cuerpo?.tipoEvidencia !== undefined ? validarTipoEvidencia(cuerpo.tipoEvidencia) : undefined;
  }

  if (Object.values(cambios).every((v) => v === undefined)) {
    throw new ErrorHttp(400, 'No hay cambios para aplicar');
  }

  return actualizarActividad(actividad.id, cambios);
}

export async function transicionarEstado(perfil, idCrudo, estadoDestino) {
  const actividad = await obtenerActividadConAlcance(perfil, idCrudo);

  const permitidas = TRANSICIONES[actividad.estado] ?? [];
  if (!permitidas.includes(estadoDestino)) {
    throw new ErrorHttp(
      400,
      `No se puede pasar de '${actividad.estado}' a '${estadoDestino ?? '?'}'`
    );
  }

  return cambiarEstadoActividad(actividad, estadoDestino);
}
