import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useAutenticacion,
  mensajeErrorFirebase,
} from '../contexto/AutenticacionContexto.jsx';
import { obtenerOpcionesRegistro, registrarPerfil, ErrorApi } from '../api.js';

/**
 * Registro en dos pasos dentro de un mismo formulario:
 * 1) crea la cuenta en Firebase Auth (correo/contraseña);
 * 2) crea el perfil en la plataforma con el consentimiento informado.
 * Si el usuario ya tiene sesión pero no perfil (registro interrumpido),
 * el formulario omite el paso 1 y solo completa el perfil.
 */
export default function Registro() {
  const { usuario, perfil, crearCuenta, recargarPerfil, obtenerToken } =
    useAutenticacion();
  const navegar = useNavigate();

  const soloCompletarPerfil = Boolean(usuario) && !perfil;

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [alias, setAlias] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [acepta, setAcepta] = useState(false);
  const [opciones, setOpciones] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    obtenerOpcionesRegistro().then(setOpciones).catch(() => setOpciones(null));
  }, []);

  useEffect(() => {
    // Con sesión y perfil completos no hay nada que registrar.
    if (usuario && perfil) navegar('/');
  }, [usuario, perfil, navegar]);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError(null);

    if (!acepta) {
      setError('Debes aceptar la política de tratamiento de datos.');
      return;
    }

    setEnviando(true);
    try {
      if (!soloCompletarPerfil) {
        await crearCuenta(correo, contrasena);
      }
      const token = await obtenerToken();
      await registrarPerfil(token, {
        alias,
        avatar,
        aceptaConsentimiento: true,
      });
      await recargarPerfil();
      navegar('/');
    } catch (errorCapturado) {
      setError(
        errorCapturado instanceof ErrorApi
          ? errorCapturado.message
          : mensajeErrorFirebase(errorCapturado)
      );
      setEnviando(false);
    }
  }

  return (
    <section className="formulario-tarjeta">
      <h1>{soloCompletarPerfil ? 'Completa tu registro' : 'Crear cuenta'}</h1>

      {soloCompletarPerfil && (
        <p className="aviso">
          Tu cuenta existe pero falta completar el perfil para participar.
        </p>
      )}

      <form onSubmit={manejarEnvio} className="formulario">
        {!soloCompletarPerfil && (
          <>
            <label className="campo">
              Correo electrónico
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="campo">
              Contraseña (mínimo 6 caracteres)
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
          </>
        )}

        <label className="campo">
          Alias público (así te verán en la comunidad)
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
            <legend>Elige tu avatar (opcional)</legend>
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

        <label className="campo consentimiento">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            required
          />
          <span>
            He leído y acepto la{' '}
            <Link to="/politica-de-datos" target="_blank">
              política de tratamiento de datos personales
            </Link>{' '}
            (Ley 1581 de 2012)
            {opciones?.versionConsentimiento &&
              ` — versión ${opciones.versionConsentimiento}`}
            .
          </span>
        </label>

        {error && <p className="aviso aviso-error">{error}</p>}

        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : soloCompletarPerfil ? 'Completar registro' : 'Registrarme'}
        </button>
      </form>

      {!soloCompletarPerfil && (
        <p className="texto-suave">
          ¿Ya tienes cuenta? <Link to="/entrar">Inicia sesión</Link>
        </p>
      )}
    </section>
  );
}
