/**
 * Promueve una cuenta existente al rol administrador (operación única de
 * arranque: el primer administrador no puede crearse desde el panel).
 *
 * Uso:
 *   node scripts/promover-administrador.js correo@ejemplo.com
 *
 * Usa DATABASE_URL del .env; para producción, ejecutar con la URL externa:
 *   DATABASE_URL=postgres://... node scripts/promover-administrador.js correo@ejemplo.com
 */
import 'dotenv/config';
import pg from 'pg';

const correo = process.argv[2];

if (!correo) {
  console.error('Uso: node scripts/promover-administrador.js <correo>');
  process.exit(1);
}

const esRemota = !process.env.DATABASE_URL.includes('localhost');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: esRemota ? { rejectUnauthorized: false } : false,
});

const { rows } = await pool.query(
  `UPDATE usuarios SET rol = 'administrador', updated_at = current_timestamp
    WHERE correo = $1 RETURNING id, alias, correo, rol`,
  [correo]
);

if (rows.length === 0) {
  console.error(`No existe un usuario con el correo ${correo} (¿ya completó su registro?)`);
  process.exitCode = 1;
} else {
  console.log(`Listo: ${rows[0].alias} <${rows[0].correo}> ahora es ${rows[0].rol}.`);
}

await pool.end();
