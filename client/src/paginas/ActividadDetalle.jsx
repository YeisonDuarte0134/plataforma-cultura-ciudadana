import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerActividad } from '../api.js';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';
import { formatearFecha } from '../componentes/TarjetaEvento.jsx';

export default function ActividadDetalle() {
  const { id } = useParams();
  const [estado, setEstado] = useState('cargando');
  const [actividad, setActividad] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);

  useEffect(() => {
    setEstado('cargando');
    obtenerActividad(id)
      .then((datos) => {
        setActividad(datos);
        setEstado('listo');
      })
      .catch((error) => {
        setMensajeError(error.codigo === 404 || error.codigo === 400 ? error.message : null);
        setEstado('error');
      });
  }, [id]);

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando actividad…" />;
  if (estado === 'error') return <EstadoError mensaje={mensajeError} />;

  return (
    <article className="evento-detalle">
      <nav aria-label="Miga de pan">
        <Link to={`/laboratorios/${actividad.laboratorio_id}`} className="volver">
          ← {actividad.laboratorio_nombre}
        </Link>
      </nav>

      <span className="chip">{actividad.tematica_nombre}</span>
      <h1>{actividad.titulo}</h1>

      <section className="tarjeta evento-datos">
        <p className="evento-dato">📅 {formatearFecha(actividad.fecha_inicio)}</p>
        <p className="evento-dato">📍 {actividad.lugar}</p>
        {actividad.cupo && <p className="evento-dato">👥 Cupo: {actividad.cupo} personas</p>}
      </section>

      <p className="evento-descripcion">{actividad.descripcion}</p>

      <section className="tarjeta">
        <h2>¿Quieres participar?</h2>
        <p className="texto-suave">
          Las inscripciones en línea estarán disponibles próximamente. Por
          ahora puedes asistir directamente en el lugar y fecha indicados.
        </p>
      </section>
    </article>
  );
}
