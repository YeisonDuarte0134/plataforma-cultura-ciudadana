import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerLaboratorio } from '../api.js';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';
import ImagenLaboratorio from '../componentes/ImagenLaboratorio.jsx';

export default function LaboratorioDetalle() {
  const { id } = useParams();
  const [estado, setEstado] = useState('cargando');
  const [laboratorio, setLaboratorio] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);

  useEffect(() => {
    setEstado('cargando');
    obtenerLaboratorio(id)
      .then((datos) => {
        setLaboratorio(datos);
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

          <section className="tarjeta">
            <h2>Actividades</h2>
            <p className="texto-suave">
              Las convocatorias y retos de este laboratorio estarán
              disponibles próximamente.
            </p>
          </section>
        </article>
      )}
    </>
  );
}
