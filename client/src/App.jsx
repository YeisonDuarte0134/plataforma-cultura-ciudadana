import { useEffect, useState } from 'react';
import { obtenerSalud, obtenerInfoPlataforma } from './api.js';

export default function App() {
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [salud, setSalud] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    Promise.all([obtenerSalud(), obtenerInfoPlataforma()])
      .then(([datosSalud, datosInfo]) => {
        setSalud(datosSalud);
        setInfo(datosInfo);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, []);

  return (
    <main className="contenedor">
      <header>
        <p className="etiqueta">Proyecto de grado · Bucaramanga</p>
        <h1>{info?.nombre_plataforma ?? 'Laboratorios de Cultura Ciudadana'}</h1>
      </header>

      {estado === 'cargando' && <p className="aviso">Consultando la API…</p>}

      {estado === 'error' && (
        <p className="aviso aviso-error">
          No fue posible comunicarse con la API. Verifique que el servidor esté
          en ejecución e intente de nuevo.
        </p>
      )}

      {estado === 'listo' && (
        <>
          <section className="tarjeta">
            <h2>Mensaje desde la base de datos</h2>
            <p>{info.mensaje_bienvenida}</p>
          </section>

          <section className="tarjeta">
            <h2>Estado del sistema</h2>
            <ul className="estado-lista">
              <li>
                <span>API</span>
                <strong className="ok">{salud.api}</strong>
              </li>
              <li>
                <span>PostgreSQL</span>
                <strong className={salud.baseDatos === 'conectada' ? 'ok' : 'falla'}>
                  {salud.baseDatos}
                </strong>
              </li>
              <li>
                <span>Consultado</span>
                <strong>{new Date(salud.marcaDeTiempo).toLocaleString('es-CO')}</strong>
              </li>
            </ul>
          </section>
        </>
      )}

      <footer>
        <p>Fase 1 — esqueleto desplegable (React + Express + PostgreSQL)</p>
      </footer>
    </main>
  );
}
