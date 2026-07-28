import { obtenerInfoPlataforma } from '../repositorios/info.repositorio.js';

export async function consultarInfoPlataforma() {
  const filas = await obtenerInfoPlataforma();
  // Se expone como objeto { clave: valor } para consumo directo de la SPA.
  return Object.fromEntries(filas.map(({ clave, valor }) => [clave, valor]));
}
