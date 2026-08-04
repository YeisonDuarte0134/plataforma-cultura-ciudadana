import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  obtenerActividad,
  obtenerMisInscripciones,
  inscribirse,
  cancelarInscripcion,
  obtenerMisEvidencias,
  enviarEvidencia,
  ErrorApi,
} from '../api.js';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';
import { formatearFecha, formatearFechaCorta } from '../componentes/TarjetaEvento.jsx';
import Icono from '../componentes/Icono.jsx';

const ETIQUETA_EVIDENCIA = {
  foto: 'una foto',
  texto: 'un texto',
  foto_y_texto: 'una foto y un texto',
};

export default function ActividadDetalle() {
  const { id } = useParams();
  const { usuario, perfil, obtenerToken } = useAutenticacion();

  const [estado, setEstado] = useState('cargando');
  const [actividad, setActividad] = useState(null);
  const [inscripcion, setInscripcion] = useState(null); // { id } si estoy inscrito
  const [evidencia, setEvidencia] = useState(null); // mi envío para este reto
  const [mensajeError, setMensajeError] = useState(null);
  const [accionError, setAccionError] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const datos = await obtenerActividad(id);
      setActividad(datos);

      if (perfil) {
        const token = await obtenerToken();
        if (datos.tipo === 'evento') {
          const mias = await obtenerMisInscripciones(token);
          setInscripcion(mias.find((i) => i.actividad_id === datos.id) ?? null);
        } else {
          const envios = await obtenerMisEvidencias(token);
          setEvidencia(envios.find((e) => e.actividad_id === datos.id) ?? null);
        }
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

  const esReto = actividad.tipo === 'reto';
  const cupoLleno =
    actividad.cupo !== null && actividad.inscritos_activos >= actividad.cupo;

  return (
    <article className="evento-detalle">
      <nav aria-label="Miga de pan">
        <Link to={`/laboratorios/${actividad.laboratorio_id}`} className="volver">
          {actividad.laboratorio_nombre}
        </Link>
      </nav>

      <div className="tarjeta-chips">
        <span className="chip">{actividad.tematica_nombre}</span>
        {esReto && <span className="chip chip-reto">Reto</span>}
      </div>
      <h1>{actividad.titulo}</h1>

      <section className="tarjeta evento-datos">
        {esReto ? (
          <>
            <p className="evento-dato">
              <Icono nombre="puntos" />
              {actividad.puntos} puntos al aprobarse
            </p>
            <p className="evento-dato">
              <Icono nombre="plazo" />
              Fecha límite: {formatearFechaCorta(actividad.fecha_limite)}
            </p>
            <p className="evento-dato">
              <Icono nombre="evidencia" />
              Evidencia: {ETIQUETA_EVIDENCIA[actividad.tipo_evidencia]}
            </p>
          </>
        ) : (
          <>
            <p className="evento-dato">
              <Icono nombre="calendario" />
              {formatearFecha(actividad.fecha_inicio)}
            </p>
            <p className="evento-dato">
              <Icono nombre="lugar" />
              {actividad.lugar}
            </p>
            {actividad.cupo !== null && (
              <p className="evento-dato">
                <Icono nombre="cupo" />
                {actividad.inscritos_activos} de {actividad.cupo} cupos ocupados
              </p>
            )}
          </>
        )}
      </section>

      <p className="evento-descripcion">{actividad.descripcion}</p>

      {esReto ? (
        <SeccionReto
          actividad={actividad}
          evidencia={evidencia}
          usuario={usuario}
          perfil={perfil}
          obtenerToken={obtenerToken}
          alTerminar={cargar}
        />
      ) : (
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
              <p className="sello sello-estampado">Inscrito</p>
              <p className="aviso aviso-ok">
                Tu cupo está reservado. El día del evento escanea el código QR
                que mostrará el gestor para registrar tu asistencia.
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
      )}
    </article>
  );
}

/**
 * Participación en un reto: muestra el estado de mi evidencia (pendiente,
 * aprobada o rechazada con el comentario del gestor) y el formulario de
 * envío cuando corresponde (primer envío o reenvío tras rechazo).
 */
function SeccionReto({ actividad, evidencia, usuario, perfil, obtenerToken, alTerminar }) {
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const vencido = new Date(actividad.fecha_limite) < new Date();
  const requiereFoto = ['foto', 'foto_y_texto'].includes(actividad.tipo_evidencia);
  const requiereTexto = ['texto', 'foto_y_texto'].includes(actividad.tipo_evidencia);
  const puedeEnviar = !evidencia || evidencia.estado === 'rechazada';

  async function manejarEnvio(eventoFormulario) {
    eventoFormulario.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const token = await obtenerToken();
      await enviarEvidencia(token, {
        actividadId: actividad.id,
        texto: texto || undefined,
        foto: foto || undefined,
      });
      setTexto('');
      setFoto(null);
      await alTerminar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible enviar la evidencia.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="tarjeta">
      <h2>Completa este reto</h2>

      {!usuario && (
        <p className="texto-suave">
          <Link to="/entrar">Inicia sesión</Link> o{' '}
          <Link to="/registro">crea tu cuenta</Link> para enviar tu evidencia.
        </p>
      )}

      {perfil && evidencia?.estado === 'pendiente' && (
        <>
          <p className="sello sello-naranja sello-estampado">En revisión</p>
          <p className="aviso">
            Tu evidencia está <strong>en revisión</strong>. El gestor del
            laboratorio la aprobará o te pedirá ajustes.
          </p>
        </>
      )}

      {perfil && evidencia?.estado === 'aprobada' && (
        <>
          <p className="sello sello-estampado">Reto completado</p>
          <p className="aviso aviso-ok">
            ¡Tu evidencia fue aprobada
            {evidencia.comentario_gestor && <> — «{evidencia.comentario_gestor}»</>}!
          </p>
        </>
      )}

      {perfil && evidencia?.estado === 'rechazada' && (
        <>
          <p className="sello sello-rojo sello-estampado">Rechazada</p>
          <p className="aviso aviso-error">
            El gestor comentó: «{evidencia.comentario_gestor}».
            {!vencido && ' Corrige tu evidencia y vuelve a enviarla.'}
          </p>
        </>
      )}

      {perfil && puedeEnviar && vencido && (
        <p className="aviso">La fecha límite del reto ya pasó; no admite más envíos.</p>
      )}

      {perfil && puedeEnviar && !vencido && (
        <form onSubmit={manejarEnvio} className="formulario">
          {requiereFoto && (
            <label className="campo">
              Foto de evidencia (JPG, PNG o WebP, máx. 5 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFoto(e.target.files[0] ?? null)}
                required
              />
            </label>
          )}

          {requiereTexto && (
            <label className="campo">
              Cuéntanos cómo lo lograste
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                minLength={10}
                maxLength={2000}
                rows={4}
                required
              />
            </label>
          )}

          {error && <p className="aviso aviso-error">{error}</p>}

          <button type="submit" className="boton" disabled={enviando}>
            {enviando
              ? 'Enviando…'
              : evidencia?.estado === 'rechazada'
                ? 'Reenviar evidencia'
                : 'Enviar evidencia'}
          </button>
        </form>
      )}
    </section>
  );
}
