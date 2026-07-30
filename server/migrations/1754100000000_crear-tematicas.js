/**
 * Catálogo de temáticas ciudadanas (administrado por el admin, historia 39).
 * Clasifica las actividades y alimenta la métrica de preferencias temáticas.
 * Incluye las temáticas semilla iniciales.
 */

export const up = (pgm) => {
  pgm.createTable('tematicas', {
    id: 'id',
    nombre: { type: 'text', notNull: true, unique: true },
    descripcion: { type: 'text' },
    activa: { type: 'boolean', notNull: true, default: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.sql(`
    INSERT INTO tematicas (nombre, descripcion) VALUES
      ('Medio ambiente', 'Protección de ecosistemas, siembras, reciclaje y consumo responsable'),
      ('Movilidad sostenible', 'Cultura vial, transporte activo y espacio público para las personas'),
      ('Convivencia y paz', 'Mediación de conflictos, tejido social y respeto por el otro'),
      ('Patrimonio y memoria', 'Cuidado del patrimonio, memoria barrial e identidad bumanguesa'),
      ('Participación ciudadana', 'Asuntos públicos, veeduría, gobierno abierto y cultura tributaria'),
      ('Arte y cultura', 'Expresiones artísticas y culturales como motor de ciudadanía');
  `);
};

export const down = (pgm) => {
  pgm.dropTable('tematicas');
};
