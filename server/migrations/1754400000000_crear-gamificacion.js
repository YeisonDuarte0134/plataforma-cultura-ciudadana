/**
 * Fase 8 — motor de gamificación:
 *
 * - `reglas_puntos`: puntos por tipo de acción, definidos por datos (la
 *   Fase 9 los hará editables desde el panel). Para un reto aprobado
 *   mandan los puntos propios del reto; la regla es el valor por defecto.
 * - `niveles`: umbrales de puntos, también por datos. El nivel de una
 *   persona es el mayor cuyo `puntos_minimos` no supere sus puntos.
 * - `insignias`: catálogo con criterio parametrizado en JSONB (contador
 *   de acciones o temáticas distintas), activable/desactivable.
 * - `puntos_otorgados`: el libro mayor del motor. Cada otorgamiento
 *   referencia el evento de participación que lo produjo y la
 *   **unicidad de `evento_participacion_id` garantiza en la BD que
 *   reprocesar un evento jamás duplica puntos** (idempotencia). Los
 *   totales y rankings se derivan con SUM: no hay contadores mutables.
 * - `insignias_otorgadas`: única por persona e insignia (idempotencia
 *   de insignias), con el evento que la disparó.
 */

export const up = (pgm) => {
  pgm.createTable('reglas_puntos', {
    id: 'id',
    accion: {
      type: 'text',
      notNull: true,
      unique: true,
      check: "accion IN ('asistencia', 'reto_aprobado')",
    },
    puntos: { type: 'integer', notNull: true, check: 'puntos > 0' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.sql(`
    INSERT INTO reglas_puntos (accion, puntos) VALUES
      ('asistencia', 10),
      ('reto_aprobado', 25);
  `);

  pgm.createTable('niveles', {
    id: 'id',
    numero: { type: 'integer', notNull: true, unique: true, check: 'numero > 0' },
    nombre: { type: 'text', notNull: true },
    puntos_minimos: { type: 'integer', notNull: true, unique: true, check: 'puntos_minimos >= 0' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.sql(`
    INSERT INTO niveles (numero, nombre, puntos_minimos) VALUES
      (1, 'Semilla', 0),
      (2, 'Vecino activo', 50),
      (3, 'Tejedor de barrio', 150),
      (4, 'Guardián ciudadano', 300),
      (5, 'Líder de cultura', 600);
  `);

  pgm.createTable('insignias', {
    id: 'id',
    codigo: { type: 'text', notNull: true, unique: true },
    nombre: { type: 'text', notNull: true },
    descripcion: { type: 'text', notNull: true },
    icono: { type: 'text', notNull: true },
    criterio: { type: 'jsonb', notNull: true },
    activa: { type: 'boolean', notNull: true, default: true },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.sql(`
    INSERT INTO insignias (codigo, nombre, descripcion, icono, criterio) VALUES
      ('primera_asistencia', 'Primera asistencia', 'Asististe a tu primer evento de cultura ciudadana', '🎟️',
       '{"tipo": "contador", "accion": "asistencia", "umbral": 1}'),
      ('primer_reto', 'Primer reto', 'Lograste la aprobación de tu primer reto', '🏁',
       '{"tipo": "contador", "accion": "reto_aprobado", "umbral": 1}'),
      ('constancia', 'Constancia', 'Asististe a 5 eventos', '📅',
       '{"tipo": "contador", "accion": "asistencia", "umbral": 5}'),
      ('racha_de_retos', 'Racha de retos', 'Lograste la aprobación de 3 retos', '🔥',
       '{"tipo": "contador", "accion": "reto_aprobado", "umbral": 3}'),
      ('exploracion_ciudadana', 'Exploración ciudadana', 'Participaste en 3 temáticas distintas', '🧭',
       '{"tipo": "tematicas_distintas", "umbral": 3}');
  `);

  pgm.createTable('puntos_otorgados', {
    id: 'id',
    usuario_id: { type: 'integer', notNull: true, references: 'usuarios', onDelete: 'CASCADE' },
    evento_participacion_id: {
      type: 'integer',
      notNull: true,
      references: 'eventos_participacion',
      unique: true, // idempotencia: un evento de participación otorga puntos una sola vez
    },
    actividad_id: { type: 'integer', notNull: true, references: 'actividades' },
    laboratorio_id: { type: 'integer', notNull: true, references: 'laboratorios' },
    tematica_id: { type: 'integer', notNull: true, references: 'tematicas' },
    accion: { type: 'text', notNull: true },
    puntos: { type: 'integer', notNull: true, check: 'puntos > 0' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('puntos_otorgados', 'usuario_id');
  pgm.createIndex('puntos_otorgados', ['laboratorio_id', 'usuario_id']);

  pgm.createTable('insignias_otorgadas', {
    id: 'id',
    usuario_id: { type: 'integer', notNull: true, references: 'usuarios', onDelete: 'CASCADE' },
    insignia_id: { type: 'integer', notNull: true, references: 'insignias' },
    evento_participacion_id: { type: 'integer', references: 'eventos_participacion' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('insignias_otorgadas', 'insignias_otorgadas_unicas', {
    unique: ['usuario_id', 'insignia_id'],
  });
};

export const down = (pgm) => {
  pgm.dropTable('insignias_otorgadas');
  pgm.dropTable('puntos_otorgados');
  pgm.dropTable('insignias');
  pgm.dropTable('niveles');
  pgm.dropTable('reglas_puntos');
};
