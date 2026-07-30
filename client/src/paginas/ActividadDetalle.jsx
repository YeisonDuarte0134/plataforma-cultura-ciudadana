import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  obtenerActividad,
  obtenerMisInscripciones,
  inscribirse,
  cancelarInscripcion,
  ErrorApi,
} from '../api.js';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';
import { formatearFecha } from '../componentes/TarjetaEvento.jsx';

export default function ActividadDetalle() {
  const { id } = useParams();
  const { usuario, perfil, obtenerToken } = useAutenticacion();

  const [estado, setEstado] = useState('cargando');
  const [actividad, setActividad] = useState(null);
  const [inscripcion, setInscripcion] = useState(null); // { id } si estoy inscrito
  const [mensajeError, setMensajeError] = useState(null);
  const [accionError, setAccionError] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const datos = await obtenerActividad(id);
      setActividad(datos);

      if (perfil) {
        const mias = await obtenerMisInscripciones(await obtenerToken());
        setInscripcion(mias.find((i) => i.actividad_id === datos.id) ?? null);
      }
      setEstado('listo');
    } catch (error) {
      setMensajeError(error.codigo === 404 || error.codigo === 400 ? error.message : null);
      setEstado('error');
    }
  }, [id, perfil, obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function manejarInscripcion() {
    setAccionError(null);
    setProcesando(true);
    try {
      const token = await obtenerToken();
      if (inscripcion) {
        await cancelarInscripcion(token, inscripcion.id);
      } else {
        await inscribirse(token, actividad.id);
      }
      await cargar();
    } catch (e) {
      setAccionError(e instanceof ErrorApi ? e.message : 'No fue posible completar la operación.');
    } finally {
      setProcesando(false);
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando actividad…" />;
  if (estado === 'error') return <EstadoError mensaje={mensajeError} />;

  const cupoLleno =
    actividad.cupo !== null && actividad.inscritos_activos >= actividad.cupo;

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
        {actividad.cupo !== null && (
          <p className="evento-dato">
            👥 {actividad.inscritos_activos} de {actividad.cupo} cupos ocupados
          </p>
        )}
      </section>

      <p className="evento-descripcion">{actividad.descripcion}</p>

      <section className="tarjeta">
        <h2>Participa en este evento</h2>

        {!usuario && (
          <p className="texto-suave">
            <Link to="/entrar">Inicia sesión</Link> o{' '}
            <Link to="/registro">crea tu cuenta</Link> para inscribirte.
          </p>
        )}

        {perfil && inscripcion && (
          <>
            <p className="aviso aviso-ok">
              ✓ Estás inscrito. El día del evento escanea el código QR que
              mostrará el gestor para registrar tu asistencia.
            </p>
            <button
              type="button"
              className="boton boton-secundario boton-pequeno"
              onClick={manejarInscripcion}
              disabled={procesando}
            >
              {procesando ? 'Procesando…' : 'Cancelar mi inscripción'}
            </button>
          </>
        )}

        {perfil && !inscripcion && (
          <>
            {cupoLleno ? (
              <p className="aviso aviso-error">El evento ya no tiene cupos disponibles.</p>
            ) : (
              <button
                type="button"
                className="boton"
                onClick={manejarInscripcion}
                disabled={procesando}
              >
                {procesando ? 'Procesando…' : 'Inscribirme'}
              </button>
            )}
          </>
        )}

        {accionError && <p className="aviso aviso-error">{accionError}</p>}
      </section>
    </article>
  );
}
