/**
 * Pruebas unitarias de las reglas puras del motor de gamificación:
 * mapeo evento→acción, puntos por acción, umbrales de nivel y criterios
 * de insignia parametrizados. Sin base de datos.
 */
import {
  accionDeEvento,
  puntosPorAccion,
  calcularNivel,
  calcularSiguienteNivel,
  cumpleCriterio,
} from '../src/servicios/gamificacion.reglas.js';

const NIVELES = [
  { numero: 3, nombre: 'Tejedor de barrio', puntos_minimos: 150 },
  { numero: 1, nombre: 'Semilla', puntos_minimos: 0 },
  { numero: 2, nombre: 'Vecino activo', puntos_minimos: 50 },
];

const REGLAS = { asistencia: 10, reto_aprobado: 25 };

describe('accionDeEvento', () => {
  test('solo la asistencia y la aprobación de evidencia otorgan puntos', () => {
    expect(accionDeEvento('asistencia')).toBe('asistencia');
    expect(accionDeEvento('aprobacion_evidencia')).toBe('reto_aprobado');
    expect(accionDeEvento('inscripcion')).toBeNull();
    expect(accionDeEvento('cancelacion_inscripcion')).toBeNull();
    expect(accionDeEvento('envio_evidencia')).toBeNull();
    expect(accionDeEvento('rechazo_evidencia')).toBeNull();
  });
});

describe('puntosPorAccion', () => {
  test('la asistencia usa la regla configurada', () => {
    expect(puntosPorAccion('asistencia', { puntos: 99 }, REGLAS)).toBe(10);
  });

  test('el reto aprobado usa los puntos propios del reto', () => {
    expect(puntosPorAccion('reto_aprobado', { puntos: 40 }, REGLAS)).toBe(40);
  });

  test('sin puntos propios, el reto aprobado cae a la regla por defecto', () => {
    expect(puntosPorAccion('reto_aprobado', { puntos: null }, REGLAS)).toBe(25);
    expect(puntosPorAccion('reto_aprobado', null, REGLAS)).toBe(25);
  });

  test('una acción sin regla no otorga puntos', () => {
    expect(puntosPorAccion('accion_desconocida', null, REGLAS)).toBeNull();
  });
});

describe('calcularNivel y calcularSiguienteNivel', () => {
  test('el nivel es el mayor umbral alcanzado, incluso en el límite exacto', () => {
    expect(calcularNivel(0, NIVELES).numero).toBe(1);
    expect(calcularNivel(49, NIVELES).numero).toBe(1);
    expect(calcularNivel(50, NIVELES).numero).toBe(2);
    expect(calcularNivel(149, NIVELES).numero).toBe(2);
    expect(calcularNivel(150, NIVELES).numero).toBe(3);
    expect(calcularNivel(9999, NIVELES).numero).toBe(3);
  });

  test('el siguiente nivel es el primer umbral por encima, o null en el máximo', () => {
    expect(calcularSiguienteNivel(0, NIVELES).numero).toBe(2);
    expect(calcularSiguienteNivel(50, NIVELES).numero).toBe(3);
    expect(calcularSiguienteNivel(150, NIVELES)).toBeNull();
  });
});

describe('cumpleCriterio', () => {
  const medidas = { contadores: { asistencia: 3, reto_aprobado: 1 }, tematicasDistintas: 2 };

  test('contador de acciones contra su umbral', () => {
    expect(cumpleCriterio({ tipo: 'contador', accion: 'asistencia', umbral: 3 }, medidas)).toBe(true);
    expect(cumpleCriterio({ tipo: 'contador', accion: 'asistencia', umbral: 4 }, medidas)).toBe(false);
    expect(cumpleCriterio({ tipo: 'contador', accion: 'reto_aprobado', umbral: 1 }, medidas)).toBe(true);
    expect(cumpleCriterio({ tipo: 'contador', accion: 'otra_accion', umbral: 1 }, medidas)).toBe(false);
  });

  test('temáticas distintas contra su umbral', () => {
    expect(cumpleCriterio({ tipo: 'tematicas_distintas', umbral: 2 }, medidas)).toBe(true);
    expect(cumpleCriterio({ tipo: 'tematicas_distintas', umbral: 3 }, medidas)).toBe(false);
  });

  test('un criterio desconocido o nulo nunca otorga la insignia', () => {
    expect(cumpleCriterio({ tipo: 'racha_semanal', umbral: 1 }, medidas)).toBe(false);
    expect(cumpleCriterio(null, medidas)).toBe(false);
  });
});
