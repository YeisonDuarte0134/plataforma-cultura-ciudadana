/**
 * Prepara la base de datos de pruebas: la crea si no existe y le aplica
 * todas las migraciones. Se ejecuta automáticamente antes de `npm test`.
 * Requiere DATABASE_URL_PRUEBAS en el .env.
 */
import 'dotenv/config';
import pg from 'pg';
import migrar from 'node-pg-migrate';

const urlPruebas = process.env.DATABASE_URL_PRUEBAS;

if (!urlPruebas) {
  console.error('Falta DATABASE_URL_PRUEBAS en el .env');
  process.exit(1);
}

const url = new URL(urlPruebas);
const nombreBd = url.pathname.slice(1);

// Se conecta a la base "postgres" para poder crear la de pruebas.
const urlAdministrativa = new URL(urlPruebas);
urlAdministrativa.pathname = '/postgres';

const cliente = new pg.Client({ connectionString: urlAdministrativa.href });
await cliente.connect();

const { rowCount } = await cliente.query(
  'SELECT 1 FROM pg_database WHERE datname = $1',
  [nombreBd]
);

if (rowCount === 0) {
  await cliente.query(`CREATE DATABASE "${nombreBd.replaceAll('"', '""')}"`);
  console.log(`Base de datos de pruebas creada: ${nombreBd}`);
}

await cliente.end();

const ejecutarMigraciones = migrar.default ?? migrar;
await ejecutarMigraciones({
  databaseUrl: urlPruebas,
  dir: 'migrations',
  direction: 'up',
  migrationsTable: 'pgmigrations',
  log: () => {},
});

console.log(`Migraciones aplicadas en ${nombreBd}`);
