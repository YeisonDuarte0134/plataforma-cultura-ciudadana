/**
 * Fase 6 — participación presencial:
 *
 * - `inscripciones`: relación ciudadano↔evento con estado (activa |
 *   cancelada). La unicidad por pareja permite re-inscribirse tras
 *   cancelar reutilizando la misma fila.
 * - `asistencias`: registro único por ciudadano y evento, con el método
 *   (qr | manual) y, si fue manual, el gestor que la registró.
 * - `eventos_participacion`: bitácora inmutable y auditable de la que
 *   derivarán la gamificación (Fase 8) y las métricas (Fase 10). Solo se
 *   inserta; nunca se actualiza ni se borra. Se desnormalizan laboratorio
 *   y temática para que las agregaciones no dependan de joins mutables.
 */

export const up = (pgm) => {
  pgm.createTable('inscripciones', {
    id: 'id',
    actividad_id: {
      type: 'integer',
      notNull: true,
      references: 'actividades',
      onDelete: 'CASCADE',
    },
    usuario_id: {
      type: 'integer',
      notNull: true,
      references: 'usuarios',
      onDelete: 'CASCADE',
    },
    estado: {
      type: 'text',
      notNull: true,
      default: 'activa',
      check: "estado IN ('activa', 'cancelada')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('inscripciones', 'inscripciones_unicas', {
    unique: ['actividad_id', 'usuario_id'],
  });

  pgm.createIndex('inscripciones', ['actividad_id', 'estado']);

  pgm.createTable('asistencias', {
    id: 'id',
    actividad_id: {
      type: 'integer',
      notNull: true,
      references: 'actividades',
      onDelete: 'CASCADE',
    },
    usuario_id: {
      type: 'integer',
      notNull: true,
      references: 'usuarios',
      onDelete: 'CASCADE',
    },
    metodo: {
      type: 'text',
      notNull: true,
      check: "metodo IN ('qr', 'manual')",
    },
    registrada_por: {
      type: 'integer',
      references: 'usuarios',
      comment: 'Gestor que registró la asistencia cuando el método es manual',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('asistencias', 'asistencias_unicas', {
    unique: ['actividad_id', 'usuario_id'],
  });

  pgm.createTable('eventos_participacion', {
    id: 'id',
    usuario_id: { type: 'integer', notNull: true, references: 'usuarios' },
    actividad_id: { type: 'integer', notNull: true, references: 'actividades' },
    laboratorio_id: { type: 'integer', notNull: true, references: 'laboratorios' },
    tematica_id: { type: 'integer', notNull: true, references: 'tematicas' },
    tipo_evento: {
      type: 'text',
      notNull: true,
      check: "tipo_evento IN ('inscripcion', 'cancelacion_inscripcion', 'asistencia')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('eventos_participacion', ['usuario_id', 'tipo_evento']);
  pgm.createIndex('eventos_participacion', ['laboratorio_id', 'created_at']);
};

export const down = (pgm) => {
  pgm.dropTable('eventos_participacion');
  pgm.dropTable('asistencias');
  pgm.dropTable('inscripciones');
};
