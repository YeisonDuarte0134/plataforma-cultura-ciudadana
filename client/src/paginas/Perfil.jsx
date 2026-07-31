import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import {
  obtenerOpcionesRegistro,
  actualizarMiPerfil,
  obtenerMisEvidencias,
  obtenerMiProgreso,
  ErrorApi,
} from '../api.js';

const ETIQUETA_ACCION = {
  asistencia: 'Asistencia a evento',
  reto_aprobado: 'Reto aprobado',
};

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
  const [progreso, setProgreso] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerOpcionesRegistro().then(setOpciones).catch(() => setOpciones(null));
  }, []);

  useEffect(() => {
    obtenerToken()
      .then((token) =>
        Promise.all([obtenerMisEvidencias(token), obtenerMiProgreso(token)])
      )
      .then(([misEvidencias, miProgreso]) => {
        setEvidencias(misEvidencias);
        setProgreso(miProgreso);
      })
      .catch(() => {
        setEvidencias([]);
        setProgreso(null);
      });
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

      {progreso && (
        <>
          <hr className="separador" />
          <section aria-label="Mi progreso">
            <h2 className="seccion-titulo">Mi progreso</h2>

            <div className="progreso-resumen">
              <div className="progreso-dato">
                <strong className="progreso-cifra">{progreso.puntos}</strong>
                <span className="texto-suave">puntos</span>
              </div>
              <div className="progreso-dato">
                <strong className="progreso-cifra">
                  {progreso.nivel ? `Nivel ${progreso.nivel.numero}` : '—'}
                </strong>
                <span className="texto-suave">{progreso.nivel?.nombre}</span>
              </div>
            </div>

            {progreso.siguienteNivel && progreso.nivel && (
              <div className="progreso-barra-zona">
                <div
                  className="progreso-barra"
                  role="progressbar"
                  aria-valuenow={progreso.puntos}
                  aria-valuemin={progreso.nivel.puntos_minimos}
                  aria-valuemax={progreso.siguienteNivel.puntos_minimos}
                >
                  <div
                    className="progreso-barra-relleno"
                    style={{
                      width: `${Math.round(
                        ((progreso.puntos - progreso.nivel.puntos_minimos) * 100) /
                          (progreso.siguienteNivel.puntos_minimos - progreso.nivel.puntos_minimos)
                      )}%`,
                    }}
                  />
                </div>
                <p className="texto-suave">
                  Te faltan <strong>{progreso.siguienteNivel.faltan} puntos</strong> para ser{' '}
                  {progreso.siguienteNivel.nombre} (nivel {progreso.siguienteNivel.numero}).
                </p>
              </div>
            )}

            <h3 className="seccion-subtitulo">Insignias</h3>
            <ul className="insignias-grilla">
              {progreso.insignias.map((insignia) => (
                <li
                  key={insignia.codigo}
                  className={`insignia-tarjeta${insignia.obtenida ? '' : ' insignia-pendiente'}`}
                  title={insignia.descripcion}
                >
                  <span className="insignia-icono" aria-hidden="true">{insignia.icono}</span>
                  <span className="insignia-nombre">{insignia.nombre}</span>
                  <span className="texto-suave insignia-detalle">
                    {insignia.obtenida
                      ? `Obtenida el ${new Date(insignia.obtenida_en).toLocaleDateString('es-CO')}`
                      : insignia.descripcion}
                  </span>
                </li>
              ))}
            </ul>

            {progreso.historial.length > 0 && (
              <>
                <h3 className="seccion-subtitulo">Historial de participación</h3>
                <ul className="envios-lista">
                  {progreso.historial.map((registro, indice) => (
                    <li key={indice} className="envio-fila">
                      <span>
                        {ETIQUETA_ACCION[registro.accion] ?? registro.accion} ·{' '}
                        <Link to={`/actividades/${registro.actividad_id}`}>
                          {registro.actividad_titulo}
                        </Link>
                      </span>
                      <span className="insignia insignia-ok">+{registro.puntos} pts</span>
                      <p className="texto-suave envio-comentario">
                        {registro.laboratorio_nombre} ·{' '}
                        {new Date(registro.created_at).toLocaleDateString('es-CO')}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

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
