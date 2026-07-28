/**
 * Datos semilla: laboratorios plausibles de Bucaramanga para que la
 * vitrina pública sea demostrable desde el primer despliegue.
 * Las imágenes se cargarán a Firebase Storage cuando el proyecto de
 * Firebase esté configurado (queda `imagen_url` en NULL y la SPA
 * muestra un marcador visual de respaldo).
 */

export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO laboratorios (nombre, descripcion, ubicacion) VALUES
      (
        'Laboratorio Ciudadano Parque de los Niños',
        'Espacio de encuentro para iniciativas de convivencia, apropiación del espacio público y cultura vial. Acoge talleres de urbanismo táctico, jornadas de recuperación de zonas verdes y retos de movilidad sostenible dirigidos a familias y colectivos juveniles.',
        'Parque de los Niños, Carrera 26 con Calle 30, Bucaramanga'
      ),
      (
        'Laboratorio de Cultura Ciudadana Café Madrid',
        'Laboratorio comunitario del norte de la ciudad enfocado en tejido social, memoria barrial y convivencia. Sus convocatorias promueven huertas urbanas, mediación de conflictos vecinales y actividades artísticas con niños, niñas y adolescentes del sector.',
        'Centro Comunitario Café Madrid, Ciudadela Café Madrid, Bucaramanga'
      ),
      (
        'Laboratorio Vivo Parque García Rovira',
        'Ubicado en el centro histórico, articula campañas de cuidado del patrimonio, cultura tributaria y participación en asuntos públicos. Sus retos invitan a documentar el patrimonio arquitectónico y a proponer mejoras del entorno urbano.',
        'Parque García Rovira, Carrera 11 con Calle 36, Bucaramanga'
      ),
      (
        'Laboratorio Ambiental Cerro del Santísimo',
        'Laboratorio orientado a la educación ambiental y la protección de los cerros orientales. Organiza siembras comunitarias, senderismo interpretativo y retos de reciclaje y consumo responsable para toda el área metropolitana.',
        'Sendero ecológico vía al Cerro del Santísimo, Floridablanca — área metropolitana de Bucaramanga'
      );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM laboratorios WHERE nombre IN (
      'Laboratorio Ciudadano Parque de los Niños',
      'Laboratorio de Cultura Ciudadana Café Madrid',
      'Laboratorio Vivo Parque García Rovira',
      'Laboratorio Ambiental Cerro del Santísimo'
    );
  `);
};
