import pg from 'pg';
import config from '../config.js';

const { Pool } = pg;

// En producción (Render) la conexión a PostgreSQL exige SSL;
// en local no está habilitado.
const pool = new Pool({
  connectionString: config.urlBaseDatos,
  ssl: config.entorno === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;
