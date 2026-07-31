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

export function formatearFechaCorta(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Tarjeta de actividad (evento o reto) para la agenda pública. */
export default function TarjetaEvento({ actividad, mostrarLaboratorio = false }) {
  const esReto = actividad.tipo === 'reto';

  return (
    <Link to={`/actividades/${actividad.id}`} className="evento-tarjeta">
      <div className="tarjeta-chips">
        <span className="chip">{actividad.tematica_nombre}</span>
        {esReto && <span className="chip chip-reto">Reto</span>}
      </div>
      <h3>{actividad.titulo}</h3>
      {mostrarLaboratorio && (
        <p className="texto-suave">{actividad.laboratorio_nombre}</p>
      )}
      {esReto ? (
        <>
          <p className="evento-dato">🏅 {actividad.puntos} puntos</p>
          <p className="evento-dato">⏳ Hasta el {formatearFechaCorta(actividad.fecha_limite)}</p>
        </>
      ) : (
        <>
          <p className="evento-dato">📅 {formatearFecha(actividad.fecha_inicio)}</p>
          <p className="evento-dato">📍 {actividad.lugar}</p>
          {actividad.cupo && <p className="evento-dato">👥 Cupo: {actividad.cupo}</p>}
        </>
      )}
    </Link>
  );
}
