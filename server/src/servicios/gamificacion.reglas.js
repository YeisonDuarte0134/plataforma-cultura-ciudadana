/**
 * Reglas puras del motor de gamificación: sin dependencias ni acceso a
 * datos, para poder probarlas unitariamente. Las consume el repositorio
 * de gamificación (al procesar un evento dentro de su transacción) y el
 * servicio (al armar el progreso del perfil).
 */

/** Acción de gamificación que corresponde a un tipo de evento de la bitácora. */
export function accionDeEvento(tipoEvento) {
  if (tipoEvento === 'asistencia') return 'asistencia';
  if (tipoEvento === 'aprobacion_evidencia') return 'reto_aprobado';
  return null; // inscripciones, cancelaciones, envíos y rechazos no otorgan puntos
}

/**
 * Puntos a otorgar por una acción. Para un reto aprobado mandan los puntos
 * propios del reto (los que la vitrina promete); la regla configurada es
 * el valor por defecto si el reto no los definiera.
 */
export function puntosPorAccion(accion, actividad, reglas) {
  if (accion === 'reto_aprobado' && actividad?.puntos) return actividad.puntos;
  return reglas[accion] ?? null;
}

/** El nivel es el mayor cuyo mínimo de puntos no supera los puntos acumulados. */
export function calcularNivel(puntos, niveles) {
  let actual = null;
  for (const nivel of [...niveles].sort((a, b) => a.puntos_minimos - b.puntos_minimos)) {
    if (puntos >= nivel.puntos_minimos) actual = nivel;
  }
  return actual;
}

/** El siguiente nivel por alcanzar, o null si ya es el máximo. */
export function calcularSiguienteNivel(puntos, niveles) {
  return (
    [...niveles]
      .sort((a, b) => a.puntos_minimos - b.puntos_minimos)
      .find((nivel) => nivel.puntos_minimos > puntos) ?? null
  );
}

/**
 * Evalúa el criterio parametrizado de una insignia contra las medidas de
 * participación de la persona:
 * - { tipo: 'contador', accion, umbral }: N acciones de ese tipo.
 * - { tipo: 'tematicas_distintas', umbral }: N temáticas distintas con puntos.
 */
export function cumpleCriterio(criterio, medidas) {
  if (criterio?.tipo === 'contador') {
    return (medidas.contadores[criterio.accion] ?? 0) >= criterio.umbral;
  }
  if (criterio?.tipo === 'tematicas_distintas') {
    return medidas.tematicasDistintas >= criterio.umbral;
  }
  return false; // un criterio desconocido nunca otorga la insignia
}
