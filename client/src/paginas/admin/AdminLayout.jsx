import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga } from '../../componentes/Estados.jsx';

/**
 * Área /admin: exige rol gestor o administrador. La pestaña Usuarios
 * es exclusiva del administrador (la API lo exige igualmente).
 */
export default function AdminLayout() {
  const { usuario, perfil, cargando } = useAutenticacion();

  if (cargando) return <EstadoCarga mensaje="Restaurando tu sesión…" />;
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (!perfil || !['gestor', 'administrador'].includes(perfil.rol)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin">
      <header className="admin-encabezado">
        <h1>Panel administrativo</h1>
        <p className="texto-suave">
          {perfil.rol === 'administrador'
            ? 'Administrador de la plataforma'
            : 'Gestor de laboratorio'}
        </p>
      </header>

      <nav className="admin-nav" aria-label="Secciones del panel">
        <NavLink to="/admin/laboratorios">Laboratorios</NavLink>
        {perfil.rol === 'administrador' && (
          <>
            <NavLink to="/admin/tematicas">Temáticas</NavLink>
            <NavLink to="/admin/usuarios">Usuarios</NavLink>
          </>
        )}
      </nav>

      <Outlet context={{ perfil }} />
    </div>
  );
}
