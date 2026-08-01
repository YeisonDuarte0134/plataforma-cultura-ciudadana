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
  listarReglas,
  actualizarRegla,
  reemplazarNiveles,
  listarInsigniasCompletas,
  buscarInsigniaPorCodigo,
  buscarInsigniaPorId,
  crearInsignia,
  actualizarInsignia,
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

/* --- Configuración del motor (Fase 9, solo administrador) --- */

const ACCIONES = ['asistencia', 'reto_aprobado'];

function validarTextoCorto(valor, campo, minimo, maximo, { opcional = false } = {}) {
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

function validarEntero(valor, campo, minimo, maximo) {
  const numero = Number(valor);
  if (valor === undefined || valor === null || !Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw new ErrorHttp(400, `El campo ${campo} debe ser un entero entre ${minimo} y ${maximo}`);
  }
  return numero;
}

/** Configuración completa para el panel del administrador. */
export async function consultarConfiguracion() {
  const [reglas, niveles, insignias] = await Promise.all([
    listarReglas(),
    listarNiveles(),
    listarInsigniasCompletas(),
  ]);
  return { reglas, niveles, insignias };
}

/**
 * Cambia los puntos de una regla. El cambio aplica solo hacia adelante:
 * el libro mayor `puntos_otorgados` nunca se recalcula, y el motor lee
 * las reglas de la BD en cada procesamiento, así el nuevo valor rige el
 * siguiente evento sin tocar los puntajes históricos.
 */
export async function cambiarRegla(accionCruda, cuerpo) {
  if (!ACCIONES.includes(accionCruda)) {
    throw new ErrorHttp(404, 'La regla no existe');
  }
  const puntos = validarEntero(cuerpo?.puntos, 'puntos', 1, 10000);

  const regla = await actualizarRegla(accionCruda, puntos);
  if (!regla) throw new ErrorHttp(404, 'La regla no existe');
  return regla;
}

/**
 * Reemplaza el conjunto de niveles. Se valida el conjunto completo:
 * números consecutivos desde 1, el primero con 0 puntos (todos tienen
 * nivel) y umbrales estrictamente crecientes (no hay desorden posible).
 */
export async function definirNiveles(cuerpo) {
  const lista = cuerpo?.niveles;
  if (!Array.isArray(lista) || lista.length < 1 || lista.length > 20) {
    throw new ErrorHttp(400, 'Se requiere una lista de entre 1 y 20 niveles');
  }

  const niveles = lista.map((nivel, indice) => ({
    numero: validarEntero(nivel?.numero, `número del nivel ${indice + 1}`, 1, 20),
    nombre: validarTextoCorto(nivel?.nombre, `nombre del nivel ${indice + 1}`, 3, 50),
    puntos_minimos: validarEntero(
      nivel?.puntosMinimos ?? nivel?.puntos_minimos,
      `puntos mínimos del nivel ${indice + 1}`,
      0,
      1000000
    ),
  }));

  const ordenados = [...niveles].sort((a, b) => a.numero - b.numero);
  for (const [indice, nivel] of ordenados.entries()) {
    if (nivel.numero !== indice + 1) {
      throw new ErrorHttp(400, 'Los números de nivel deben ser consecutivos desde el 1');
    }
    if (indice === 0 && nivel.puntos_minimos !== 0) {
      throw new ErrorHttp(400, 'El primer nivel debe empezar en 0 puntos');
    }
    if (indice > 0 && nivel.puntos_minimos <= ordenados[indice - 1].puntos_minimos) {
      throw new ErrorHttp(
        400,
        'Los umbrales de puntos deben ser estrictamente crecientes con el nivel'
      );
    }
  }

  return reemplazarNiveles(ordenados);
}

/** Criterio parametrizado de insignia: las dos formas que evalúa el motor. */
function validarCriterio(criterio) {
  if (criterio?.tipo === 'contador') {
    if (!ACCIONES.includes(criterio.accion)) {
      throw new ErrorHttp(400, "La acción del criterio debe ser 'asistencia' o 'reto_aprobado'");
    }
    return {
      tipo: 'contador',
      accion: criterio.accion,
      umbral: validarEntero(criterio.umbral, 'umbral', 1, 1000),
    };
  }
  if (criterio?.tipo === 'tematicas_distintas') {
    return {
      tipo: 'tematicas_distintas',
      umbral: validarEntero(criterio.umbral, 'umbral', 1, 100),
    };
  }
  throw new ErrorHttp(400, "El tipo de criterio debe ser 'contador' o 'tematicas_distintas'");
}

export async function crearNuevaInsignia(cuerpo) {
  const codigo = cuerpo?.codigo;
  if (typeof codigo !== 'string' || !/^[a-z0-9_]{3,40}$/.test(codigo)) {
    throw new ErrorHttp(
      400,
      'El código debe tener entre 3 y 40 caracteres en minúsculas, números o guion bajo'
    );
  }
  if (await buscarInsigniaPorCodigo(codigo)) {
    throw new ErrorHttp(409, 'Ya existe una insignia con ese código');
  }

  return crearInsignia({
    codigo,
    nombre: validarTextoCorto(cuerpo?.nombre, 'nombre', 3, 60),
    descripcion: validarTextoCorto(cuerpo?.descripcion, 'descripción', 5, 200),
    icono: validarTextoCorto(cuerpo?.icono, 'icono', 1, 8),
    criterio: validarCriterio(cuerpo?.criterio),
  });
}

/**
 * Edita una insignia (el código es su identificador y no cambia). Las ya
 * otorgadas no se revocan: el criterio nuevo rige las próximas
 * evaluaciones; desactivarla la excluye del motor y del catálogo público.
 */
export async function editarInsignia(idCrudo, cuerpo) {
  const insignia = await buscarInsigniaPorId(validarId(idCrudo));
  if (!insignia) throw new ErrorHttp(404, 'La insignia no existe');

  const cambios = {
    nombre: validarTextoCorto(cuerpo?.nombre, 'nombre', 3, 60, { opcional: true }),
    descripcion: validarTextoCorto(cuerpo?.descripcion, 'descripción', 5, 200, { opcional: true }),
    icono: validarTextoCorto(cuerpo?.icono, 'icono', 1, 8, { opcional: true }),
    criterio: cuerpo?.criterio !== undefined ? validarCriterio(cuerpo.criterio) : undefined,
    activa: undefined,
  };
  if (cuerpo?.activa !== undefined) {
    if (typeof cuerpo.activa !== 'boolean') {
      throw new ErrorHttp(400, 'El campo activa debe ser verdadero o falso');
    }
    cambios.activa = cuerpo.activa;
  }

  if (Object.values(cambios).every((valor) => valor === undefined)) {
    throw new ErrorHttp(400, 'No hay cambios para aplicar');
  }

  return actualizarInsignia(insignia.id, cambios);
}
