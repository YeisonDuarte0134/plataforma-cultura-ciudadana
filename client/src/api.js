const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function obtenerJson(ruta) {
  const respuesta = await fetch(`${API_URL}${ruta}`);
  if (!respuesta.ok) {
    throw new Error(`La API respondió ${respuesta.status}`);
  }
  return respuesta.json();
}

export function obtenerSalud() {
  return obtenerJson('/api/v1/salud');
}

export function obtenerInfoPlataforma() {
  return obtenerJson('/api/v1/info');
}
