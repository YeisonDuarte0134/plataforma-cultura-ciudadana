import pool from '../db/pool.js';

export async function obtenerInfoPlataforma() {
  const { rows } = await pool.query(
    'SELECT clave, valor FROM info_plataforma ORDER BY id'
  );
  return rows;
}
