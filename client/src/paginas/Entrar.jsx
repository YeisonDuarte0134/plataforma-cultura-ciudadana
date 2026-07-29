import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useAutenticacion,
  mensajeErrorFirebase,
} from '../contexto/AutenticacionContexto.jsx';

export default function Entrar() {
  const { iniciarSesion, recargarPerfil } = useAutenticacion();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(correo, contrasena);
      const perfil = await recargarPerfil();
      // Cuenta sin perfil (registro interrumpido): se completa el registro.
      navegar(perfil ? '/' : '/registro');
    } catch (errorFirebase) {
      setError(mensajeErrorFirebase(errorFirebase));
      setEnviando(false);
    }
  }

  return (
    <section className="formulario-tarjeta">
      <h1>Iniciar sesión</h1>

      <form onSubmit={manejarEnvio} className="formulario">
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
          Contraseña
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="aviso aviso-error">{error}</p>}

        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="texto-suave">
        ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </section>
  );
}
