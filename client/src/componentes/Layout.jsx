import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';

export default function Layout() {
  const { usuario, perfil, cargando } = useAutenticacion();

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
            {cargando ? null : perfil ? (
              <>
                {['gestor', 'administrador'].includes(perfil.rol) && (
                  <NavLink to="/admin/laboratorios" className="sesion-enlace">
                    Panel
                  </NavLink>
                )}
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
