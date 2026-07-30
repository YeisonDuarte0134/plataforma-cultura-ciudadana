/**
 * Eventos semilla publicados (uno por laboratorio principal) para que la
 * agenda pública sea demostrable desde el despliegue. Las fechas se fijan
 * relativas al momento de la migración; el panel permite editarlas,
 * cerrarlas o archivarlas después.
 */

export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO actividades
      (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, fecha_inicio, lugar, cupo)
    SELECT l.id, t.id, 'evento', v.titulo, v.descripcion, 'publicada',
           current_timestamp + (v.dias || ' days')::interval, v.lugar, v.cupo
      FROM (VALUES
        ('Laboratorio Ciudadano Parque de los Niños', 'Movilidad sostenible',
         'Taller de urbanismo táctico: calles para la gente',
         'Aprenderemos a intervenir de forma temporal un cruce peatonal del parque con pintura y mobiliario ligero, midiendo el efecto en la seguridad de los peatones. Cupo limitado; incluye materiales.',
         14, 'Parque de los Niños, esquina Carrera 26 con Calle 30', 30),
        ('Laboratorio de Cultura Ciudadana Café Madrid', 'Convivencia y paz',
         'Círculo de mediación vecinal',
         'Sesión práctica de resolución de conflictos cotidianos del barrio con la metodología de círculos de palabra, acompañada por mediadores comunitarios.',
         10, 'Centro Comunitario Café Madrid, salón principal', 25),
        ('Laboratorio Vivo Parque García Rovira', 'Patrimonio y memoria',
         'Recorrido patrimonial por el centro histórico',
         'Caminata guiada por los edificios y plazas fundacionales de Bucaramanga, reconstruyendo la memoria urbana con fotografías históricas. Termina con conversatorio abierto.',
         21, 'Punto de encuentro: atrio de la Capilla de los Dolores', 40)
      ) AS v(laboratorio, tematica, titulo, descripcion, dias, lugar, cupo)
      JOIN laboratorios l ON l.nombre = v.laboratorio
      JOIN tematicas t ON t.nombre = v.tematica;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM actividades WHERE titulo IN (
      'Taller de urbanismo táctico: calles para la gente',
      'Círculo de mediación vecinal',
      'Recorrido patrimonial por el centro histórico'
    );
  `);
};
