import { Link } from 'react-router-dom';
import Icono from './Icono.jsx';

export function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatearFechaCorta(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Boleta de actividad (evento o reto) para la agenda pública: talón
 * troquelado a la izquierda con el dato que decide (la fecha del evento
 * o los puntos del reto) y el cuerpo con el resto de la información.
 */
export default function TarjetaEvento({ actividad, mostrarLaboratorio = false }) {
  const esReto = actividad.tipo === 'reto';
  const fecha = esReto ? null : new Date(actividad.fecha_inicio);

  return (
    <Link
      to={`/actividades/${actividad.id}`}
      className={`evento-tarjeta${esReto ? ' evento-tarjeta-reto' : ''}`}
    >
      <span className="evento-talon" aria-hidden="true">
        {esReto ? (
          <>
            <strong>{actividad.puntos}</strong>
            <span>puntos</span>
          </>
        ) : (
          <>
            <strong>{fecha.getDate()}</strong>
            <span>{fecha.toLocaleDateString('es-CO', { month: 'short' })}</span>
          </>
        )}
      </span>

      <span className="evento-cuerpo">
        <span className="tarjeta-chips">
          <span className="chip">{actividad.tematica_nombre}</span>
          {esReto && <span className="chip chip-reto">Reto</span>}
        </span>
        <h3>{actividad.titulo}</h3>
        {mostrarLaboratorio && (
          <span className="texto-suave">{actividad.laboratorio_nombre}</span>
        )}
        {esReto ? (
          <>
            <span className="evento-dato">
              <Icono nombre="puntos" />
              {actividad.puntos} puntos al aprobarse
            </span>
            <span className="evento-dato">
              <Icono nombre="plazo" />
              Hasta el {formatearFechaCorta(actividad.fecha_limite)}
            </span>
          </>
        ) : (
          <>
            <span className="evento-dato">
              <Icono nombre="calendario" />
              {formatearFecha(actividad.fecha_inicio)}
            </span>
            <span className="evento-dato">
              <Icono nombre="lugar" />
              {actividad.lugar}
            </span>
            {actividad.cupo && (
              <span className="evento-dato">
                <Icono nombre="cupo" />
                Cupo: {actividad.cupo}
              </span>
            )}
          </>
        )}
      </span>
    </Link>
  );
}
