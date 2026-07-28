import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerLaboratorios } from '../api.js';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';
import ImagenLaboratorio from '../componentes/ImagenLaboratorio.jsx';

export default function Laboratorios() {
  const [estado, setEstado] = useState('cargando');
  const [laboratorios, setLaboratorios] = useState([]);

  useEffect(() => {
    obtenerLaboratorios()
      .then((datos) => {
        setLaboratorios(datos);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Participa en la cultura ciudadana de tu ciudad</h1>
        <p>
          Conoce los laboratorios de cultura ciudadana de Bucaramanga,
          explora sus actividades y súmate a construir una ciudad más
          participativa.
        </p>
      </section>

      <section aria-label="Laboratorios disponibles">
        {estado === 'cargando' && (
          <EstadoCarga mensaje="Cargando laboratorios…" />
        )}

        {estado === 'error' && <EstadoError />}

        {estado === 'listo' && laboratorios.length === 0 && (
          <p className="aviso">
            Aún no hay laboratorios publicados. Vuelve pronto.
          </p>
        )}

        {estado === 'listo' && laboratorios.length > 0 && (
          <ul className="lab-grilla">
            {laboratorios.map((lab) => (
              <li key={lab.id}>
                <Link to={`/laboratorios/${lab.id}`} className="lab-tarjeta">
                  <ImagenLaboratorio laboratorio={lab} />
                  <div className="lab-tarjeta-cuerpo">
                    <h2>{lab.nombre}</h2>
                    <p className="lab-ubicacion">📍 {lab.ubicacion}</p>
                    <p className="lab-descripcion">{lab.descripcion}</p>
                    <span className="lab-enlace">Ver laboratorio →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
