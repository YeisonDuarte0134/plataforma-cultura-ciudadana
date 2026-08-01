/**
 * Fase 11 — notificaciones, intereses y Habeas Data:
 *
 * - `intereses_usuario`: temáticas de interés elegidas en el perfil (HU-7).
 *   Alimentan la personalización (a quién notificar una nueva actividad).
 * - `notificaciones`: bandeja interna de cada persona (HU-19) con indicador
 *   de no leídas. `actividad_id` es opcional (una insignia no tiene
 *   actividad asociada directa) y se anula si la actividad se borra.
 * - `usuarios.estado` gana el valor `eliminado` (HU-21): la eliminación
 *   definitiva no borra la fila —la bitácora la referencia—, la anonimiza
 *   (sin correo, alias, avatar, teléfono ni uid reales) y la marca con
 *   este estado terminal para que ninguna vista ni endpoint la reviva.
 */

export const up = (pgm) => {
  pgm.createTable('intereses_usuario', {
    id: 'id',
    usuario_id: {
      type: 'integer',
      notNull: true,
      references: 'usuarios',
      onDelete: 'CASCADE',
    },
    tematica_id: {
      type: 'integer',
      notNull: true,
      references: 'tematicas',
      onDelete: 'CASCADE',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('intereses_usuario', 'intereses_unicos', {
    unique: ['usuario_id', 'tematica_id'],
  });

  // Al publicar una actividad se buscan los interesados por temática.
  pgm.createIndex('intereses_usuario', 'tematica_id');

  pgm.createTable('notificaciones', {
    id: 'id',
    usuario_id: {
      type: 'integer',
      notNull: true,
      references: 'usuarios',
      onDelete: 'CASCADE',
    },
    tipo: {
      type: 'text',
      notNull: true,
      check: `tipo IN (
        'nueva_actividad', 'evidencia_aprobada', 'evidencia_rechazada', 'insignia_otorgada'
      )`,
    },
    mensaje: { type: 'text', notNull: true },
    actividad_id: {
      type: 'integer',
      references: 'actividades',
      onDelete: 'SET NULL',
    },
    leida: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  // La bandeja lista por persona (recientes primero) y cuenta no leídas.
  pgm.createIndex('notificaciones', ['usuario_id', 'created_at']);
  pgm.createIndex('notificaciones', ['usuario_id', 'leida']);

  // Estado terminal de Habeas Data.
  pgm.dropConstraint('usuarios', 'usuarios_estado_check');
  pgm.addConstraint('usuarios', 'usuarios_estado_check', {
    check: "estado IN ('activo', 'desactivado', 'eliminado')",
  });
};

export const down = (pgm) => {
  pgm.dropConstraint('usuarios', 'usuarios_estado_check');
  pgm.addConstraint('usuarios', 'usuarios_estado_check', {
    check: "estado IN ('activo', 'desactivado')",
  });
  pgm.dropTable('notificaciones');
  pgm.dropTable('intereses_usuario');
};
