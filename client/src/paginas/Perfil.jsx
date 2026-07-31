import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import {
  obtenerOpcionesRegistro,
  actualizarMiPerfil,
  obtenerMisEvidencias,
  ErrorApi,
} from '../api.js';

const ETIQUETA_ENVIO = {
  pendiente: { texto: 'En revisión', clase: 'insignia-neutra' },
  aprobada: { texto: 'Aprobada', clase: 'insignia-ok' },
  rechazada: { texto: 'Rechazada', clase: 'insignia-falla' },
};

export default function Perfil() {
  const { perfil, cerrarSesion, obtenerToken, recargarPerfil } = useAutenticacion();
  const navegar = useNavigate();

  const [alias, setAlias] = useState(perfil?.alias ?? '');
  const [avatar, setAvatar] = useState(perfil?.avatar ?? null);
  const [telefono, setTelefono] = useState(perfil?.telefono ?? '');
  const [opciones, setOpciones] = useState(null);
  const [evidencias, setEvidencias] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerOpcionesRegistro().then(setOpciones).catch(() => setOpciones(null));
  }, []);

  useEffect(() => {
    obtenerToken()
      .then((token) => obtenerMisEvidencias(token))
      .then(setEvidencias)
      .catch(() => setEvidencias([]));
  }, [obtenerToken]);

  async function manejarGuardar(evento) {
    evento.preventDefault();
    setError(null);
    setMensaje(null);
    setGuardando(true);
    try {
      const token = await obtenerToken();
      await actualizarMiPerfil(token, {
        alias,
        avatar,
        telefono: telefono || undefined,
      });
      await recargarPerfil();
      setMensaje('Perfil actualizado.');
    } catch (errorCapturado) {
      setError(
        errorCapturado instanceof ErrorApi
          ? errorCapturado.message
          : 'No fue posible guardar los cambios.'
      );
    } finally {
      setGuardando(false);
    }
  }

  async function manejarSalir() {
    await cerrarSesion();
    navegar('/');
  }

  if (!perfil) return null; // La ruta privada evita este caso.

  return (
    <section className="formulario-tarjeta">
      <div className="perfil-encabezado">
        <span className="perfil-avatar" aria-hidden="true">
          {perfil.avatar ?? perfil.alias.charAt(0)}
        </span>
        <div>
          <h1>{perfil.alias}</h1>
          <p className="texto-suave">{perfil.correo}</p>
        </div>
      </div>

      <form onSubmit={manejarGuardar} className="formulario">
        <label className="campo">
          Alias público
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            minLength={3}
            maxLength={30}
            required
          />
        </label>

        {opciones?.avataresPermitidos && (
          <fieldset className="campo avatares">
            <legend>Avatar</legend>
            <div className="avatares-grilla" role="radiogroup">
              {opciones.avataresPermitidos.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`avatar-opcion${avatar === emoji ? ' avatar-activo' : ''}`}
                  onClick={() => setAvatar(avatar === emoji ? null : emoji)}
                  aria-pressed={avatar === emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label className="campo">
          Teléfono de contacto (opcional)
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+57 3000000000"
          />
        </label>

        {mensaje && <p className="aviso aviso-ok">{mensaje}</p>}
        {error && <p className="aviso aviso-error">{error}</p>}

        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      {evidencias.length > 0 && (
        <>
          <hr className="separador" />
          <section aria-label="Mis retos">
            <h2 className="seccion-titulo">Mis retos</h2>
            <ul className="envios-lista">
              {evidencias.map((e) => (
                <li key={e.id} className="envio-fila">
                  <Link to={`/actividades/${e.actividad_id}`}>{e.titulo}</Link>
                  <span className={`insignia ${ETIQUETA_ENVIO[e.estado].clase}`}>
                    {ETIQUETA_ENVIO[e.estado].texto}
                  </span>
                  {e.estado === 'rechazada' && e.comentario_gestor && (
                    <p className="texto-suave envio-comentario">«{e.comentario_gestor}»</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <hr className="separador" />

      <p className="texto-suave">
        Consentimiento aceptado: versión {perfil.consentimiento_version} —{' '}
        {new Date(perfil.consentimiento_fecha).toLocaleDateString('es-CO')}
      </p>

      <button type="button" className="boton boton-secundario" onClick={manejarSalir}>
        Cerrar sesión
      </button>
    </section>
  );
}
