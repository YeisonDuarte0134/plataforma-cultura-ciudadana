/**
 * Tabla `asignaciones_gestor`: relación usuario↔laboratorio que delimita
 * el alcance de cada gestor. La autorización de la API se apoya en esta
 * tabla: un gestor solo opera sobre los laboratorios que tiene asignados.
 */

export const up = (pgm) => {
  pgm.createTable('asignaciones_gestor', {
    id: 'id',
    usuario_id: {
      type: 'integer',
      notNull: true,
      references: 'usuarios',
      onDelete: 'CASCADE',
    },
    laboratorio_id: {
      type: 'integer',
      notNull: true,
      references: 'laboratorios',
      onDelete: 'CASCADE',
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

  pgm.addConstraint('asignaciones_gestor', 'asignaciones_gestor_unicas', {
    unique: ['usuario_id', 'laboratorio_id'],
  });

  pgm.createIndex('asignaciones_gestor', 'laboratorio_id');
};

export const down = (pgm) => {
  pgm.dropTable('asignaciones_gestor');
};
