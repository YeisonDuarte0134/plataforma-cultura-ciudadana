/**
 * Retos semilla publicados (uno por laboratorio principal), en la línea de
 * los eventos semilla de la Fase 5: la vitrina muestra los dos tipos de
 * actividad desde el despliegue. Las fechas límite se fijan relativas al
 * momento de la migración; el panel permite editarlas o cerrarlas después.
 */

export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO actividades
      (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, puntos, fecha_limite, tipo_evidencia)
    SELECT l.id, t.id, 'reto', v.titulo, v.descripcion, 'publicada',
           v.puntos, current_timestamp + (v.dias || ' days')::interval, v.tipo_evidencia
      FROM (VALUES
        ('Laboratorio Ciudadano Parque de los Niños', 'Medio ambiente',
         'Adopta un árbol de tu cuadra',
         'Elige un árbol joven cerca de tu casa, riégalo durante dos semanas y documenta su estado con una foto donde se vea el árbol y su entorno. Cuéntanos en el texto por qué lo elegiste y cómo lo cuidaste.',
         50, 30, 'foto_y_texto'),
        ('Laboratorio de Cultura Ciudadana Café Madrid', 'Convivencia y paz',
         'Un gesto que mejora tu barrio',
         'Realiza una acción concreta de convivencia en tu cuadra (saludar y presentarte con un vecino nuevo, mediar en un malentendido, organizar una limpieza del andén) y descríbela: qué hiciste, con quién y qué cambió.',
         30, 30, 'texto'),
        ('Laboratorio Vivo Parque García Rovira', 'Patrimonio y memoria',
         'Retrata el patrimonio escondido',
         'Fotografía un detalle patrimonial poco conocido del centro de Bucaramanga (una fachada, una placa, un oficio tradicional) que merezca ser recordado.',
         40, 45, 'foto')
      ) AS v(laboratorio, tematica, titulo, descripcion, puntos, dias, tipo_evidencia)
      JOIN laboratorios l ON l.nombre = v.laboratorio
      JOIN tematicas t ON t.nombre = v.tematica;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM actividades WHERE titulo IN (
      'Adopta un árbol de tu cuadra',
      'Un gesto que mejora tu barrio',
      'Retrata el patrimonio escondido'
    );
  `);
};
