import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import { obtenerNotificaciones } from '../api.js';

export default function Layout() {
  const { usuario, perfil, cargando, obtenerToken } = useAutenticacion();
  const [noLeidas, setNoLeidas] = useState(0);
  const { pathname } = useLocation();

  // El indicador de no leídas se refresca al navegar: abrir la bandeja las
  // marca leídas y, al salir de ella, el contador vuelve a cero solo.
  useEffect(() => {
    if (!perfil) {
      setNoLeidas(0);
      return;
    }
    obtenerToken()
      .then((token) => obtenerNotificaciones(token))
      .then((bandeja) => setNoLeidas(bandeja.noLeidas))
      .catch(() => setNoLeidas(0));
  }, [perfil, pathname, obtenerToken]);

  return (
    <div className="pagina">
      <header className="cabecera">
        <div className="cabecera-contenido">
          <Link to="/" className="marca">
            <span className="marca-icono" aria-hidden="true">◈</span>
            <span>
              <strong>Laboratorios de Cultura Ciudadana</strong>
              <small>Bucaramanga</small>
            </span>
          </Link>

          <nav className="sesion" aria-label="Sesión">
            <NavLink to="/ranking" className="sesion-enlace">
              Ranking
            </NavLink>
            {cargando ? null : perfil ? (
              <>
                {['gestor', 'administrador'].includes(perfil.rol) && (
                  <NavLink to="/admin/laboratorios" className="sesion-enlace">
                    Panel
                  </NavLink>
                )}
                <NavLink
                  to="/notificaciones"
                  className="sesion-campana"
                  aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ''}`}
                >
                  <span aria-hidden="true">🔔</span>
                  {noLeidas > 0 && <span className="campana-contador">{noLeidas}</span>}
                </NavLink>
                <NavLink to="/perfil" className="sesion-perfil">
                  <span className="sesion-avatar" aria-hidden="true">
                    {perfil.avatar ?? perfil.alias.charAt(0)}
                  </span>
                  <span className="sesion-alias">{perfil.alias}</span>
                </NavLink>
              </>
            ) : usuario ? (
              <NavLink to="/registro" className="boton boton-pequeno">
                Completar registro
              </NavLink>
            ) : (
              <>
                <NavLink to="/entrar" className="sesion-enlace">
                  Entrar
                </NavLink>
                <NavLink to="/registro" className="boton boton-pequeno">
                  Crear cuenta
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="contenido">
        <Outlet />
      </main>

      <footer className="pie">
        <p>
          Plataforma de gestión, seguimiento y gamificación de los
          laboratorios de cultura ciudadana de Bucaramanga ·{' '}
          <Link to="/politica-de-datos">Política de datos</Link>
        </p>
      </footer>
    </div>
  );
}
