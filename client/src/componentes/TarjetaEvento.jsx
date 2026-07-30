import { Link } from 'react-router-dom';

export function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Tarjeta de evento para la agenda pública de un laboratorio. */
export default function TarjetaEvento({ actividad, mostrarLaboratorio = false }) {
  return (
    <Link to={`/actividades/${actividad.id}`} className="evento-tarjeta">
      <span className="chip">{actividad.tematica_nombre}</span>
      <h3>{actividad.titulo}</h3>
      {mostrarLaboratorio && (
        <p className="texto-suave">{actividad.laboratorio_nombre}</p>
      )}
      <p className="evento-dato">📅 {formatearFecha(actividad.fecha_inicio)}</p>
      <p className="evento-dato">📍 {actividad.lugar}</p>
      {actividad.cupo && <p className="evento-dato">👥 Cupo: {actividad.cupo}</p>}
    </Link>
  );
}
