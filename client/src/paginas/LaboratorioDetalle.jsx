import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerLaboratorio, obtenerActividades } from '../api.js';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';
import ImagenLaboratorio from '../componentes/ImagenLaboratorio.jsx';
import TarjetaEvento from '../componentes/TarjetaEvento.jsx';

export default function LaboratorioDetalle() {
  const { id } = useParams();
  const [estado, setEstado] = useState('cargando');
  const [laboratorio, setLaboratorio] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [mensajeError, setMensajeError] = useState(null);

  useEffect(() => {
    setEstado('cargando');
    Promise.all([
      obtenerLaboratorio(id),
      obtenerActividades({ laboratorio: id }).catch(() => []),
    ])
      .then(([datos, agenda]) => {
        setLaboratorio(datos);
        setActividades(agenda);
        setEstado('listo');
      })
      .catch((error) => {
        setMensajeError(
          error.codigo === 404 || error.codigo === 400 ? error.message : null
        );
        setEstado('error');
      });
  }, [id]);

  return (
    <>
      <nav aria-label="Miga de pan">
        <Link to="/" className="volver">
          ← Todos los laboratorios
        </Link>
      </nav>

      {estado === 'cargando' && <EstadoCarga mensaje="Cargando laboratorio…" />}

      {estado === 'error' && <EstadoError mensaje={mensajeError} />}

      {estado === 'listo' && (
        <article className="lab-detalle">
          <ImagenLaboratorio laboratorio={laboratorio} alto />
          <h1>{laboratorio.nombre}</h1>
          <p className="lab-ubicacion">📍 {laboratorio.ubicacion}</p>
          <p className="lab-detalle-descripcion">{laboratorio.descripcion}</p>

          <section aria-label="Agenda de actividades">
            <h2 className="seccion-titulo">Agenda de actividades</h2>
            {actividades.length === 0 ? (
              <p className="aviso">
                Este laboratorio no tiene actividades publicadas por ahora.
                Vuelve pronto.
              </p>
            ) : (
              <ul className="eventos-lista">
                {actividades.map((actividad) => (
                  <li key={actividad.id}>
                    <TarjetaEvento actividad={actividad} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>
      )}
    </>
  );
}
