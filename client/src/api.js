const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ErrorApi extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
  }
}

async function peticion(ruta, { token, metodo = 'GET', cuerpo } = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(cuerpo && { body: JSON.stringify(cuerpo) }),
  });

  if (!respuesta.ok) {
    let mensaje = `La API respondió ${respuesta.status}`;
    try {
      const datos = await respuesta.json();
      if (datos?.error) mensaje = datos.error;
    } catch {
      // El cuerpo no era JSON; se conserva el mensaje genérico.
    }
    throw new ErrorApi(respuesta.status, mensaje);
  }

  return respuesta.json();
}

export function obtenerSalud() {
  return peticion('/api/v1/salud');
}

export function obtenerLaboratorios() {
  return peticion('/api/v1/laboratorios');
}

export function obtenerLaboratorio(id) {
  return peticion(`/api/v1/laboratorios/${id}`);
}

export function obtenerOpcionesRegistro() {
  return peticion('/api/v1/usuarios/opciones-registro');
}

export function registrarPerfil(token, datos) {
  return peticion('/api/v1/usuarios/registro', { token, metodo: 'POST', cuerpo: datos });
}

export function obtenerMiPerfil(token) {
  return peticion('/api/v1/usuarios/me', { token });
}

export function actualizarMiPerfil(token, datos) {
  return peticion('/api/v1/usuarios/me', { token, metodo: 'PATCH', cuerpo: datos });
}

/* --- Panel de administración (Fase 4) --- */

export function obtenerLaboratoriosAdministrables(token) {
  return peticion('/api/v1/laboratorios/mios', { token });
}

export function obtenerLaboratorioAdministrable(token, id) {
  return peticion(`/api/v1/laboratorios/${id}/admin`, { token });
}

export function crearLaboratorio(token, datos) {
  return peticion('/api/v1/laboratorios', { token, metodo: 'POST', cuerpo: datos });
}

export function editarLaboratorio(token, id, datos) {
  return peticion(`/api/v1/laboratorios/${id}`, { token, metodo: 'PATCH', cuerpo: datos });
}

export function obtenerGestores(token, laboratorioId) {
  return peticion(`/api/v1/laboratorios/${laboratorioId}/gestores`, { token });
}

export function asignarGestor(token, laboratorioId, usuarioId) {
  return peticion(`/api/v1/laboratorios/${laboratorioId}/gestores`, {
    token,
    metodo: 'POST',
    cuerpo: { usuarioId },
  });
}

export function revocarGestor(token, laboratorioId, usuarioId) {
  return peticion(`/api/v1/laboratorios/${laboratorioId}/gestores/${usuarioId}`, {
    token,
    metodo: 'DELETE',
  });
}

export function buscarUsuarios(token, texto) {
  return peticion(`/api/v1/usuarios?buscar=${encodeURIComponent(texto)}`, { token });
}

export function cambiarEstadoUsuario(token, id, estado) {
  return peticion(`/api/v1/usuarios/${id}/estado`, {
    token,
    metodo: 'PATCH',
    cuerpo: { estado },
  });
}
