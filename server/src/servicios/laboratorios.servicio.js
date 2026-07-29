import ErrorHttp from '../errores/ErrorHttp.js';
import {
  listarLaboratoriosActivos,
  buscarLaboratorioActivoPorId,
  listarTodosLosLaboratorios,
  listarLaboratoriosDeGestor,
  buscarLaboratorioPorId,
  crearLaboratorio,
  actualizarLaboratorio,
} from '../repositorios/laboratorios.repositorio.js';
import { existeAsignacion } from '../repositorios/asignaciones.repositorio.js';

export function consultarLaboratorios() {
  return listarLaboratoriosActivos();
}

export async function consultarLaboratorioPorId(idCrudo) {
  const id = validarId(idCrudo);
  const laboratorio = await buscarLaboratorioActivoPorId(id);

  if (!laboratorio) {
    throw new ErrorHttp(404, 'El laboratorio no existe o no está disponible');
  }

  return laboratorio;
}

/* --- Administración (Fase 4) --- */

export function validarId(idCrudo) {
  const id = Number(idCrudo);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorHttp(400, 'El identificador no es válido');
  }
  return id;
}

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
    throw new ErrorHttp(
      400,
      `El campo ${campo} debe tener entre ${minimo} y ${maximo} caracteres`
    );
  }
  return limpio;
}

function validarImagenUrl(valor) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  let url;
  try {
    url = new URL(valor);
  } catch {
    throw new ErrorHttp(400, 'La URL de la imagen no es válida');
  }
  if (url.protocol !== 'https:') {
    throw new ErrorHttp(400, 'La imagen debe servirse por https');
  }
  return url.href;
}

/** Laboratorios visibles en el panel: todos para el admin, los asignados para el gestor. */
export function consultarLaboratoriosAdministrables(perfil) {
  return perfil.rol === 'administrador'
    ? listarTodosLosLaboratorios()
    : listarLaboratoriosDeGestor(perfil.id);
}

export async function consultarLaboratorioAdministrable(perfil, idCrudo) {
  const id = validarId(idCrudo);
  const laboratorio = await buscarLaboratorioPorId(id);

  if (!laboratorio) {
    throw new ErrorHttp(404, 'El laboratorio no existe');
  }

  if (
    perfil.rol !== 'administrador' &&
    !(await existeAsignacion(perfil.id, id))
  ) {
    throw new ErrorHttp(403, 'No tiene asignado este laboratorio');
  }

  return laboratorio;
}

export function crearNuevoLaboratorio(cuerpo) {
  return crearLaboratorio({
    nombre: validarTexto(cuerpo?.nombre, 'nombre', 3, 120),
    descripcion: validarTexto(cuerpo?.descripcion, 'descripción', 10, 2000),
    ubicacion: validarTexto(cuerpo?.ubicacion, 'ubicación', 5, 200),
    imagenUrl: validarImagenUrl(cuerpo?.imagenUrl) ?? null,
  });
}

export async function editarLaboratorio(perfil, idCrudo, cuerpo) {
  const laboratorio = await consultarLaboratorioAdministrable(perfil, idCrudo);

  // Activar/desactivar es exclusivo del administrador.
  if (cuerpo?.activo !== undefined && perfil.rol !== 'administrador') {
    throw new ErrorHttp(403, 'Solo el administrador puede activar o desactivar laboratorios');
  }

  if (cuerpo?.activo !== undefined && typeof cuerpo.activo !== 'boolean') {
    throw new ErrorHttp(400, 'El campo activo debe ser booleano');
  }

  const cambios = {
    nombre: validarTexto(cuerpo?.nombre, 'nombre', 3, 120, { opcional: true }),
    descripcion: validarTexto(cuerpo?.descripcion, 'descripción', 10, 2000, { opcional: true }),
    ubicacion: validarTexto(cuerpo?.ubicacion, 'ubicación', 5, 200, { opcional: true }),
    imagenUrl: validarImagenUrl(cuerpo?.imagenUrl),
    activo: cuerpo?.activo,
  };

  if (Object.values(cambios).every((v) => v === undefined)) {
    throw new ErrorHttp(400, 'No hay cambios para aplicar');
  }

  return actualizarLaboratorio(laboratorio.id, cambios);
}
