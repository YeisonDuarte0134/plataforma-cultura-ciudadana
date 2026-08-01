import ErrorHttp from '../errores/ErrorHttp.js';
import { validarId } from './laboratorios.servicio.js';
import { buscarLaboratorioPorId } from '../repositorios/laboratorios.repositorio.js';
import { existeAsignacion } from '../repositorios/asignaciones.repositorio.js';
import {
  resumenParticipacion,
  asistenciaPorEvento,
  finalizacionPorReto,
  participacionPorTematica,
  comparativaLaboratorios,
} from '../repositorios/metricas.repositorio.js';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function validarFecha(valor, campo) {
  if (valor === undefined || valor === '') return null;
  if (typeof valor !== 'string' || !FORMATO_FECHA.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw new ErrorHttp(400, `La fecha '${campo}' debe tener el formato AAAA-MM-DD`);
  }
  return valor;
}

/**
 * Normaliza los filtros del reporte. `hasta` llega como fecha inclusiva
 * (así la entiende quien llena el formulario) y se convierte al día
 * siguiente exclusivo, que es lo que comparan las consultas.
 */
export function validarFiltros(consulta = {}) {
  const desde = validarFecha(consulta.desde, 'desde');
  const hasta = validarFecha(consulta.hasta, 'hasta');
  if (desde && hasta && desde > hasta) {
    throw new ErrorHttp(400, "El rango de fechas es inválido: 'desde' es posterior a 'hasta'");
  }

  let hastaExclusivo = null;
  if (hasta) {
    const dia = new Date(`${hasta}T00:00:00`);
    dia.setDate(dia.getDate() + 1);
    hastaExclusivo = dia;
  }

  return {
    desde: desde ? new Date(`${desde}T00:00:00`) : null,
    hastaExclusivo,
    actividadId: consulta.actividad ? validarId(consulta.actividad) : null,
    tematicaId: consulta.tematica ? validarId(consulta.tematica) : null,
    // Eco de lo aplicado, para que el reporte declare su propio alcance.
    aplicados: {
      desde: desde ?? null,
      hasta: hasta ?? null,
      actividad: consulta.actividad ? Number(consulta.actividad) : null,
      tematica: consulta.tematica ? Number(consulta.tematica) : null,
    },
  };
}

/** Porcentaje con un decimal, o null cuando no hay base de cálculo. */
export function tasa(numerador, denominador) {
  if (!denominador) return null;
  return Math.round((numerador / denominador) * 1000) / 10;
}

/**
 * Dashboard del laboratorio (HU-30/31): visible para el administrador o
 * para un gestor asignado a ese laboratorio; nadie más.
 */
export async function consultarMetricasLaboratorio(perfil, laboratorioIdCrudo, consulta) {
  const laboratorioId = validarId(laboratorioIdCrudo);
  const laboratorio = await buscarLaboratorioPorId(laboratorioId);
  if (!laboratorio) {
    throw new ErrorHttp(404, 'El laboratorio no existe');
  }
  if (perfil.rol !== 'administrador' && !(await existeAsignacion(perfil.id, laboratorioId))) {
    throw new ErrorHttp(403, 'No tiene asignado este laboratorio');
  }

  const filtros = { ...validarFiltros(consulta), laboratorioId };
  const [resumen, eventos, retos, tematicas] = await Promise.all([
    resumenParticipacion(filtros),
    asistenciaPorEvento(filtros),
    finalizacionPorReto(filtros),
    participacionPorTematica(filtros),
  ]);

  return {
    laboratorio: { id: laboratorio.id, nombre: laboratorio.nombre },
    filtros: filtros.aplicados,
    resumen,
    asistencia: {
      inscritos: eventos.reduce((suma, e) => suma + e.inscritos, 0),
      asistentes: eventos.reduce((suma, e) => suma + e.asistentes, 0),
      porEvento: eventos.map((e) => ({ ...e, tasa: tasa(e.asistentes, e.inscritos) })),
    },
    retos: {
      participantes: retos.reduce((suma, r) => suma + r.participantes, 0),
      finalizados: retos.reduce((suma, r) => suma + r.finalizados, 0),
      porReto: retos.map((r) => ({ ...r, tasa: tasa(r.finalizados, r.participantes) })),
    },
    tematicas,
  };
}

/**
 * Métricas globales del administrador (HU-38): el consolidado de toda la
 * plataforma más la comparativa entre laboratorios. Solo admite el filtro
 * de fechas: comparar laboratorios filtrando por un laboratorio no tiene
 * sentido, y actividad/temática pertenecen al dashboard por laboratorio.
 */
export async function consultarMetricasGlobales(consulta) {
  const filtros = validarFiltros({ desde: consulta?.desde, hasta: consulta?.hasta });
  const [resumen, tematicas, laboratorios] = await Promise.all([
    resumenParticipacion(filtros),
    participacionPorTematica(filtros),
    comparativaLaboratorios(filtros),
  ]);

  return {
    filtros: filtros.aplicados,
    resumen,
    tematicas,
    laboratorios: laboratorios.map((l) => ({
      ...l,
      tasa_asistencia: tasa(l.asistentes, l.inscritos),
      tasa_finalizacion: tasa(l.retos_finalizados, l.participantes_retos),
    })),
  };
}

/* --- Exportación CSV (HU-32) --- */

/** Escapa un valor para CSV: comillas dobladas y celda entrecomillada. */
function celda(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

const fila = (valores) => valores.map(celda).join(',');

/**
 * Arma un CSV por secciones (una tabla por bloque del dashboard, separadas
 * por una línea en blanco). El BOM inicial hace que Excel reconozca UTF-8
 * y los acentos del español no se corrompan.
 */
function armarCsv(secciones, filtros) {
  const lineas = [];
  lineas.push(fila(['Filtros aplicados']));
  lineas.push(fila(['desde', 'hasta', 'actividad', 'tematica']));
  lineas.push(fila([filtros.desde, filtros.hasta, filtros.actividad, filtros.tematica]));

  for (const seccion of secciones) {
    lineas.push('');
    lineas.push(fila([seccion.titulo]));
    lineas.push(fila(seccion.columnas));
    for (const filaDatos of seccion.filas) {
      lineas.push(fila(filaDatos));
    }
  }
  const BOM = String.fromCharCode(0xfeff); // marca UTF-8 para Excel
  return BOM + lineas.join('\r\n') + '\r\n';
}

const filasResumen = (resumen) => [
  ['Participantes activos', resumen.participantes_activos],
  ['Eventos de participación', resumen.eventos_totales],
  ['Inscripciones', resumen.inscripciones],
  ['Cancelaciones', resumen.cancelaciones],
  ['Asistencias', resumen.asistencias],
  ['Envíos de evidencia', resumen.envios_evidencia],
  ['Evidencias aprobadas', resumen.aprobaciones],
  ['Evidencias rechazadas', resumen.rechazos],
];

const seccionTematicas = (tematicas) => ({
  titulo: 'Preferencias temáticas',
  columnas: ['Temática', 'Participaciones', 'Participantes'],
  filas: tematicas.map((t) => [t.nombre, t.participaciones, t.participantes]),
});

/** El mismo agregado del dashboard del laboratorio, como CSV descargable. */
export function csvMetricasLaboratorio(datos) {
  return armarCsv(
    [
      {
        titulo: `Resumen — ${datos.laboratorio.nombre}`,
        columnas: ['Indicador', 'Valor'],
        filas: filasResumen(datos.resumen),
      },
      {
        titulo: 'Asistencia a convocatorias',
        columnas: ['Evento', 'Estado', 'Inscritos', 'Asistentes', 'Tasa de asistencia (%)'],
        filas: datos.asistencia.porEvento.map((e) => [e.titulo, e.estado, e.inscritos, e.asistentes, e.tasa]),
      },
      {
        titulo: 'Finalización de retos',
        columnas: ['Reto', 'Estado', 'Participantes', 'Finalizados', 'Tasa de finalización (%)'],
        filas: datos.retos.porReto.map((r) => [r.titulo, r.estado, r.participantes, r.finalizados, r.tasa]),
      },
      seccionTematicas(datos.tematicas),
    ],
    datos.filtros
  );
}

/** El consolidado global y la comparativa entre laboratorios, como CSV. */
export function csvMetricasGlobales(datos) {
  return armarCsv(
    [
      {
        titulo: 'Consolidado global',
        columnas: ['Indicador', 'Valor'],
        filas: filasResumen(datos.resumen),
      },
      {
        titulo: 'Comparativa entre laboratorios',
        columnas: [
          'Laboratorio', 'Activo', 'Participantes activos', 'Inscritos', 'Asistentes',
          'Tasa de asistencia (%)', 'Participantes en retos', 'Retos finalizados',
          'Tasa de finalización (%)',
        ],
        filas: datos.laboratorios.map((l) => [
          l.nombre, l.activo ? 'sí' : 'no', l.participantes_activos, l.inscritos, l.asistentes,
          l.tasa_asistencia, l.participantes_retos, l.retos_finalizados, l.tasa_finalizacion,
        ]),
      },
      seccionTematicas(datos.tematicas),
    ],
    datos.filtros
  );
}
