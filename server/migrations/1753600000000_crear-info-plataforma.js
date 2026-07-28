/**
 * Migración inicial (bala trazadora): tabla trivial con un dato
 * que la SPA mostrará leído desde PostgreSQL a través de la API.
 */

export const up = (pgm) => {
  pgm.createTable('info_plataforma', {
    id: 'id',
    clave: { type: 'text', notNull: true, unique: true },
    valor: { type: 'text', notNull: true },
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
    INSERT INTO info_plataforma (clave, valor) VALUES
      ('nombre_plataforma', 'Plataforma de Laboratorios de Cultura Ciudadana de Bucaramanga'),
      ('mensaje_bienvenida', 'Este mensaje viaja desde PostgreSQL, pasa por la API en Express y llega a la SPA en React: la bala trazadora atraviesa todo el stack.')
  `);
};

export const down = (pgm) => {
  pgm.dropTable('info_plataforma');
};
