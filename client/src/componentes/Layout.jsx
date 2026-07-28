import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="pagina">
      <header className="cabecera">
        <Link to="/" className="marca">
          <span className="marca-icono" aria-hidden="true">◈</span>
          <span>
            <strong>Laboratorios de Cultura Ciudadana</strong>
            <small>Bucaramanga</small>
          </span>
        </Link>
      </header>

      <main className="contenido">
        <Outlet />
      </main>

      <footer className="pie">
        <p>
          Plataforma de gestión, seguimiento y gamificación de los
          laboratorios de cultura ciudadana de Bucaramanga.
        </p>
      </footer>
    </div>
  );
}
