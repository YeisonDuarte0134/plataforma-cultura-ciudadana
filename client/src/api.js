const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ErrorApi extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
  }
}

async function obtenerJson(ruta) {
  const respuesta = await fetch(`${API_URL}${ruta}`);

  if (!respuesta.ok) {
    let mensaje = `La API respondió ${respuesta.status}`;
    try {
      const cuerpo = await respuesta.json();
      if (cuerpo?.error) mensaje = cuerpo.error;
    } catch {
      // El cuerpo no era JSON; se conserva el mensaje genérico.
    }
    throw new ErrorApi(respuesta.status, mensaje);
  }

  return respuesta.json();
}

export function obtenerSalud() {
  return obtenerJson('/api/v1/salud');
}

export function obtenerLaboratorios() {
  return obtenerJson('/api/v1/laboratorios');
}

export function obtenerLaboratorio(id) {
  return obtenerJson(`/api/v1/laboratorios/${id}`);
}
