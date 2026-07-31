/**
 * Fase 7 — retos con evidencia y moderación:
 *
 * - `evidencias`: el envío de un ciudadano para un reto. Única por pareja
 *   reto↔usuario: el reenvío tras un rechazo reutiliza la misma fila (el
 *   mismo patrón que `inscripciones`), y el historial de envíos y
 *   decisiones queda en la bitácora `eventos_participacion`.
 *   Ciclo: pendiente → aprobada | rechazada → (reenvío) pendiente.
 * - La bitácora gana tres tipos de evento: envío, aprobación y rechazo de
 *   evidencia. Se amplía la restricción CHECK sin tocar las filas ya
 *   escritas.
 */

export const up = (pgm) => {
  pgm.createTable('evidencias', {
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
      default: 'pendiente',
      check: "estado IN ('pendiente', 'aprobada', 'rechazada')",
    },

    // Contenido del envío: al menos uno de los dos, según el tipo de
    // evidencia que exige el reto.
    texto: { type: 'text' },
    foto_url: { type: 'text' },

    // Moderación: quién decidió, cuándo y con qué comentario. El comentario
    // es obligatorio al rechazar (lo exige el servicio) y visible para el
    // ciudadano.
    comentario_gestor: { type: 'text' },
    moderada_por: { type: 'integer', references: 'usuarios' },
    moderada_en: { type: 'timestamptz' },

    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('evidencias', 'evidencias_unicas', {
    unique: ['actividad_id', 'usuario_id'],
  });

  pgm.addConstraint('evidencias', 'evidencias_con_contenido', {
    check: 'texto IS NOT NULL OR foto_url IS NOT NULL',
  });

  // La cola de moderación consulta por reto y estado.
  pgm.createIndex('evidencias', ['actividad_id', 'estado']);
  pgm.createIndex('evidencias', 'usuario_id');

  // Nuevos eventos de la bitácora (envío, aprobación y rechazo de evidencia).
  pgm.dropConstraint('eventos_participacion', 'eventos_participacion_tipo_evento_check');
  pgm.addConstraint('eventos_participacion', 'eventos_participacion_tipo_evento_check', {
    check: `tipo_evento IN (
      'inscripcion', 'cancelacion_inscripcion', 'asistencia',
      'envio_evidencia', 'aprobacion_evidencia', 'rechazo_evidencia'
    )`,
  });
};

export const down = (pgm) => {
  pgm.dropConstraint('eventos_participacion', 'eventos_participacion_tipo_evento_check');
  pgm.addConstraint('eventos_participacion', 'eventos_participacion_tipo_evento_check', {
    check: "tipo_evento IN ('inscripcion', 'cancelacion_inscripcion', 'asistencia')",
  });
  pgm.dropTable('evidencias');
};
