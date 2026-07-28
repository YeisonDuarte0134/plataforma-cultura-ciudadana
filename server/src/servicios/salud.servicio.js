import pool from '../db/pool.js';

export async function verificarSalud() {
  const salud = {
    estado: 'ok',
    api: 'en línea',
    baseDatos: 'sin conexión',
    marcaDeTiempo: new Date().toISOString(),
  };

  try {
    await pool.query('SELECT 1');
    salud.baseDatos = 'conectada';
  } catch {
    salud.estado = 'degradado';
  }

  return salud;
}
