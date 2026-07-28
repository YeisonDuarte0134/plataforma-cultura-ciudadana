import ErrorHttp from '../errores/ErrorHttp.js';
import {
  listarLaboratoriosActivos,
  buscarLaboratorioActivoPorId,
} from '../repositorios/laboratorios.repositorio.js';

export function consultarLaboratorios() {
  return listarLaboratoriosActivos();
}

export async function consultarLaboratorioPorId(idCrudo) {
  const id = Number(idCrudo);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorHttp(400, 'El identificador del laboratorio no es válido');
  }

  const laboratorio = await buscarLaboratorioActivoPorId(id);

  if (!laboratorio) {
    throw new ErrorHttp(404, 'El laboratorio no existe o no está disponible');
  }

  return laboratorio;
}
