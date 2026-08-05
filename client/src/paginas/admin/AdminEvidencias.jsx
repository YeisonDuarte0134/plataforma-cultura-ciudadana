import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import { formatearFechaCorta } from '../../componentes/TarjetaEvento.jsx';
import {
  obtenerLaboratorioAdministrable,
  obtenerEvidenciasPendientes,
  moderarEvidencia,
  ErrorApi,
} from '../../api.js';

/**
 * Cola de moderación del laboratorio: evidencias pendientes de los retos,
 * la más antigua primero. Aprobar es directo; rechazar exige un comentario
 * que el ciudadano verá para poder corregir y reenviar.
 */
export default function AdminEvidencias() {
  const { labId } = useParams();
  const { obtenerToken } = useAutenticacion();

  const [estado, setEstado] = useState('cargando');
  const [laboratorio, setLaboratorio] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [comentarios, setComentarios] = useState({}); // por id de evidencia
  const [rechazando, setRechazando] = useState(null); // id con el cuadro de rechazo abierto
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const token = await obtenerToken();
      const [lab, cola] = await Promise.all([
        obtenerLaboratorioAdministrable(token, labId),
        obtenerEvidenciasPendientes(token, labId),
      ]);
      setLaboratorio(lab);
      setPendientes(cola);
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [labId, obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function decidir(evidencia, decision) {
    setError(null);
    setProcesando(evidencia.id);
    try {
      const token = await obtenerToken();
      await moderarEvidencia(token, evidencia.id, decision, comentarios[evidencia.id]);
      setRechazando(null);
      setComentarios({ ...comentarios, [evidencia.id]: '' });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible aplicar la decisión.');
    } finally {
      setProcesando(null);
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando evidencias…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <Link to={`/admin/laboratorios/${labId}/actividades`} className="volver">Actividades</Link>

      <div className="admin-barra">
        <h2>Evidencias pendientes — {laboratorio.nombre}</h2>
        <span className="texto-suave">{pendientes.length} por revisar</span>
      </div>

      {error && <p className="aviso aviso-error">{error}</p>}

      {pendientes.length === 0 ? (
        <p className="aviso">No hay evidencias pendientes de revisión. ¡Al día!</p>
      ) : (
        <ul className="evidencias-lista">
          {pendientes.map((e) => (
            <li key={e.id} className="tarjeta evidencia-tarjeta">
              <div className="evidencia-encabezado">
                <div>
                  <h3>{e.titulo}</h3>
                  <p className="texto-suave">
                    {e.avatar ? `${e.avatar} ` : ''}{e.alias} · enviada el{' '}
                    {formatearFechaCorta(e.updated_at)} · {e.puntos} puntos en juego
                  </p>
                </div>
              </div>

              {e.foto_url && (
                <a href={e.foto_url} target="_blank" rel="noreferrer">
                  <img
                    src={e.foto_url}
                    alt={`Evidencia fotográfica de ${e.alias}`}
                    className="evidencia-foto"
                    loading="lazy"
                  />
                </a>
              )}

              {e.texto && <blockquote className="evidencia-texto">{e.texto}</blockquote>}

              {rechazando === e.id ? (
                <div className="formulario">
                  <label className="campo">
                    Motivo del rechazo (visible para la persona)
                    <textarea
                      value={comentarios[e.id] ?? ''}
                      onChange={(ev) => setComentarios({ ...comentarios, [e.id]: ev.target.value })}
                      minLength={5}
                      maxLength={1000}
                      rows={3}
                      placeholder="Explica qué debe corregir para que la evidencia sea aprobada…"
                    />
                  </label>
                  <div className="tabla-acciones">
                    <button
                      type="button"
                      className="boton boton-pequeno"
                      onClick={() => decidir(e, 'rechazar')}
                      disabled={procesando === e.id}
                    >
                      {procesando === e.id ? 'Aplicando…' : 'Confirmar rechazo'}
                    </button>
                    <button
                      type="button"
                      className="boton boton-secundario boton-pequeno"
                      onClick={() => setRechazando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="tabla-acciones">
                  <button
                    type="button"
                    className="boton boton-pequeno"
                    onClick={() => decidir(e, 'aprobar')}
                    disabled={procesando === e.id}
                  >
                    {procesando === e.id ? 'Aplicando…' : '✓ Aprobar'}
                  </button>
                  <button
                    type="button"
                    className="boton boton-secundario boton-pequeno"
                    onClick={() => setRechazando(e.id)}
                    disabled={procesando === e.id}
                  >
                    Rechazar…
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
