const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ErrorApi extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
  }
}

async function interpretar(respuesta) {
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

async function peticion(ruta, { token, metodo = 'GET', cuerpo } = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(cuerpo && { body: JSON.stringify(cuerpo) }),
  });
  return interpretar(respuesta);
}

/** Envío multipart (formularios con archivo); el navegador pone el Content-Type. */
async function peticionFormulario(ruta, { token, formulario }) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });
  return interpretar(respuesta);
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

/* --- Temáticas y actividades (Fase 5) --- */

export function obtenerTematicas() {
  return peticion('/api/v1/tematicas');
}

export function obtenerActividades(filtros = {}) {
  const parametros = new URLSearchParams();
  if (filtros.laboratorio) parametros.set('laboratorio', filtros.laboratorio);
  if (filtros.tipo) parametros.set('tipo', filtros.tipo);
  if (filtros.tematica) parametros.set('tematica', filtros.tematica);
  const consulta = parametros.toString();
  return peticion(`/api/v1/actividades${consulta ? `?${consulta}` : ''}`);
}

export function obtenerActividad(id) {
  return peticion(`/api/v1/actividades/${id}`);
}

export function obtenerTodasLasTematicas(token) {
  return peticion('/api/v1/tematicas/todas', { token });
}

export function crearTematica(token, datos) {
  return peticion('/api/v1/tematicas', { token, metodo: 'POST', cuerpo: datos });
}

export function editarTematica(token, id, datos) {
  return peticion(`/api/v1/tematicas/${id}`, { token, metodo: 'PATCH', cuerpo: datos });
}

export function obtenerActividadesDeLaboratorio(token, laboratorioId) {
  return peticion(`/api/v1/actividades/admin?laboratorio=${laboratorioId}`, { token });
}

export function obtenerActividadAdministrable(token, id) {
  return peticion(`/api/v1/actividades/${id}/admin`, { token });
}

export function crearActividad(token, datos) {
  return peticion('/api/v1/actividades', { token, metodo: 'POST', cuerpo: datos });
}

export function editarActividad(token, id, datos) {
  return peticion(`/api/v1/actividades/${id}`, { token, metodo: 'PATCH', cuerpo: datos });
}

export function cambiarEstadoActividad(token, id, estado) {
  return peticion(`/api/v1/actividades/${id}/estado`, {
    token,
    metodo: 'PATCH',
    cuerpo: { estado },
  });
}

/* --- Participación: inscripciones y asistencia (Fase 6) --- */

export function inscribirse(token, actividadId) {
  return peticion('/api/v1/inscripciones', { token, metodo: 'POST', cuerpo: { actividadId } });
}

export function cancelarInscripcion(token, inscripcionId) {
  return peticion(`/api/v1/inscripciones/${inscripcionId}`, { token, metodo: 'DELETE' });
}

export function obtenerMisInscripciones(token) {
  return peticion('/api/v1/inscripciones/mias', { token });
}

export function registrarAsistencia(token, tokenQr) {
  return peticion('/api/v1/asistencias', { token, metodo: 'POST', cuerpo: { token: tokenQr } });
}

export function obtenerQrActividad(token, actividadId) {
  return peticion(`/api/v1/actividades/${actividadId}/qr`, { token });
}

export function obtenerParticipantes(token, actividadId) {
  return peticion(`/api/v1/actividades/${actividadId}/participantes`, { token });
}

export function registrarAsistenciaManual(token, actividadId, usuarioId) {
  return peticion('/api/v1/asistencias/manual', {
    token,
    metodo: 'POST',
    cuerpo: { actividadId, usuarioId },
  });
}

/* --- Retos y evidencias (Fase 7) --- */

export function enviarEvidencia(token, { actividadId, texto, foto }) {
  const formulario = new FormData();
  formulario.set('actividadId', actividadId);
  if (texto) formulario.set('texto', texto);
  if (foto) formulario.set('foto', foto);
  return peticionFormulario('/api/v1/evidencias', { token, formulario });
}

export function obtenerMisEvidencias(token) {
  return peticion('/api/v1/evidencias/mias', { token });
}

export function obtenerEvidenciasPendientes(token, laboratorioId) {
  return peticion(`/api/v1/evidencias/pendientes?laboratorio=${laboratorioId}`, { token });
}

export function moderarEvidencia(token, id, decision, comentario) {
  return peticion(`/api/v1/evidencias/${id}`, {
    token,
    metodo: 'PATCH',
    cuerpo: { decision, ...(comentario && { comentario }) },
  });
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
