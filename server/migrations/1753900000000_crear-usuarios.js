/**
 * Tabla `usuarios`: perfil de dominio vinculado a la cuenta de Firebase
 * Authentication (fuente de verdad de roles y datos en PostgreSQL).
 *
 * El consentimiento informado (Ley 1581 de 2012) es obligatorio: se
 * almacenan la versión de la política aceptada y la fecha de aceptación.
 * `estado` permite la baja lógica (Fases 4 y 11).
 */

export const up = (pgm) => {
  pgm.createTable('usuarios', {
    id: 'id',
    firebase_uid: { type: 'text', notNull: true, unique: true },
    correo: { type: 'text', notNull: true },
    alias: { type: 'text', notNull: true },
    avatar: { type: 'text' },
    telefono: { type: 'text' },
    rol: {
      type: 'text',
      notNull: true,
      default: 'ciudadano',
      check: "rol IN ('ciudadano', 'gestor', 'administrador')",
    },
    estado: {
      type: 'text',
      notNull: true,
      default: 'activo',
      check: "estado IN ('activo', 'desactivado')",
    },
    consentimiento_version: { type: 'text', notNull: true },
    consentimiento_fecha: { type: 'timestamptz', notNull: true },
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

  pgm.createIndex('usuarios', 'rol');
};

export const down = (pgm) => {
  pgm.dropTable('usuarios');
};
