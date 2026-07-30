/**
 * Tabla `actividades`: unifica los dos tipos de actividad del dominio,
 * discriminados por `tipo` — `evento` (presencial: fecha, lugar, cupo)
 * llega en esta fase; `reto` (asincrónico: puntos, fecha límite, tipo de
 * evidencia) se habilita en la Fase 7 sobre esta misma tabla.
 *
 * Ciclo de vida: borrador → publicada → cerrada → archivada.
 * Solo las publicadas aparecen en la vitrina pública.
 */

export const up = (pgm) => {
  pgm.createTable('actividades', {
    id: 'id',
    laboratorio_id: {
      type: 'integer',
      notNull: true,
      references: 'laboratorios',
      onDelete: 'CASCADE',
    },
    tematica_id: {
      type: 'integer',
      notNull: true,
      references: 'tematicas',
    },
    tipo: {
      type: 'text',
      notNull: true,
      check: "tipo IN ('evento', 'reto')",
    },
    titulo: { type: 'text', notNull: true },
    descripcion: { type: 'text', notNull: true },
    estado: {
      type: 'text',
      notNull: true,
      default: 'borrador',
      check: "estado IN ('borrador', 'publicada', 'cerrada', 'archivada')",
    },

    // Campos propios de eventos presenciales
    fecha_inicio: { type: 'timestamptz' },
    lugar: { type: 'text' },
    cupo: { type: 'integer', check: 'cupo IS NULL OR cupo > 0' },

    // Campos propios de retos (Fase 7)
    puntos: { type: 'integer', check: 'puntos IS NULL OR puntos > 0' },
    fecha_limite: { type: 'timestamptz' },
    tipo_evidencia: {
      type: 'text',
      check: "tipo_evidencia IS NULL OR tipo_evidencia IN ('foto', 'texto', 'foto_y_texto')",
    },

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

  pgm.createIndex('actividades', ['laboratorio_id', 'estado']);
  pgm.createIndex('actividades', 'tematica_id');
  pgm.createIndex('actividades', 'tipo');
};

export const down = (pgm) => {
  pgm.dropTable('actividades');
};
