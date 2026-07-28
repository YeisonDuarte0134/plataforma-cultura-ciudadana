/**
 * Tabla `laboratorios`: entidad núcleo de la vitrina pública (Fase 2).
 * `imagen_url` guarda solo la referencia al archivo (Firebase Storage);
 * `activo` permite desactivar un laboratorio sin borrarlo (Fase 4).
 */

export const up = (pgm) => {
  pgm.createTable('laboratorios', {
    id: 'id',
    nombre: { type: 'text', notNull: true },
    descripcion: { type: 'text', notNull: true },
    ubicacion: { type: 'text', notNull: true },
    imagen_url: { type: 'text' },
    activo: { type: 'boolean', notNull: true, default: true },
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

  pgm.createIndex('laboratorios', 'activo');
};

export const down = (pgm) => {
  pgm.dropTable('laboratorios');
};
