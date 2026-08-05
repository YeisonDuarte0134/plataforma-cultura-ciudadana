import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import {
  obtenerLaboratorioAdministrable,
  obtenerActividadesDeLaboratorio,
  cambiarEstadoActividad,
  ErrorApi,
} from '../../api.js';

const ETIQUETA_ESTADO = {
  borrador: 'insignia-neutra',
  publicada: 'insignia-ok',
  cerrada: 'insignia-neutra',
  archivada: 'insignia-falla',
};

/** Botones de transición disponibles según el estado actual. */
const TRANSICIONES = {
  borrador: [{ a: 'publicada', etiqueta: 'Publicar' }, { a: 'archivada', etiqueta: 'Archivar' }],
  publicada: [{ a: 'cerrada', etiqueta: 'Cerrar' }, { a: 'archivada', etiqueta: 'Archivar' }],
  cerrada: [{ a: 'archivada', etiqueta: 'Archivar' }],
  archivada: [],
};

export default function AdminActividades() {
  const { labId } = useParams();
  const { obtenerToken } = useAutenticacion();
  const [estado, setEstado] = useState('cargando');
  const [laboratorio, setLaboratorio] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const token = await obtenerToken();
      const [lab, lista] = await Promise.all([
        obtenerLaboratorioAdministrable(token, labId),
        obtenerActividadesDeLaboratorio(token, labId),
      ]);
      setLaboratorio(lab);
      setActividades(lista);
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [labId, obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function transicionar(actividad, estadoDestino) {
    setError(null);
    try {
      await cambiarEstadoActividad(await obtenerToken(), actividad.id, estadoDestino);
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible cambiar el estado.');
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando actividades…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <Link to="/admin/laboratorios" className="volver">Laboratorios</Link>

      <div className="admin-barra">
        <h2>Actividades — {laboratorio.nombre}</h2>
        <div className="tabla-acciones">
          <Link to={`/admin/laboratorios/${labId}/metricas`} className="boton boton-secundario boton-pequeno">
            Métricas
          </Link>
          <Link to={`/admin/laboratorios/${labId}/evidencias`} className="boton boton-secundario boton-pequeno">
            Cola de evidencias
          </Link>
          <Link to={`/admin/laboratorios/${labId}/actividades/nueva`} className="boton boton-pequeno">
            + Nueva actividad
          </Link>
        </div>
      </div>

      {error && <p className="aviso aviso-error">{error}</p>}

      {actividades.length === 0 ? (
        <p className="aviso">Este laboratorio aún no tiene actividades. Crea la primera.</p>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Temática</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {actividades.map((a) => (
                <tr key={a.id}>
                  <td>{a.titulo}</td>
                  <td className="texto-suave">{a.tipo}</td>
                  <td className="texto-suave">{a.tematica_nombre}</td>
                  <td className="texto-suave">
                    {a.tipo === 'reto'
                      ? (a.fecha_limite ? `límite: ${new Date(a.fecha_limite).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : '—')
                      : (a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—')}
                  </td>
                  <td>
                    <span className={`insignia ${ETIQUETA_ESTADO[a.estado]}`}>{a.estado}</span>
                  </td>
                  <td className="tabla-acciones">
                    {a.estado === 'publicada' && a.tipo === 'evento' && (
                      <>
                        <Link to={`/admin/laboratorios/${labId}/actividades/${a.id}/qr`} className="enlace-accion">
                          QR
                        </Link>
                        <Link to={`/admin/laboratorios/${labId}/actividades/${a.id}/participantes`} className="enlace-accion">
                          Participantes
                        </Link>
                      </>
                    )}
                    {a.estado !== 'archivada' && (
                      <Link to={`/admin/laboratorios/${labId}/actividades/${a.id}`} className="enlace-accion">
                        Editar
                      </Link>
                    )}
                    {TRANSICIONES[a.estado].map(({ a: destino, etiqueta }) => (
                      <button
                        key={destino}
                        type="button"
                        className={`enlace-accion${destino === 'archivada' ? ' enlace-peligro' : ''}`}
                        onClick={() => transicionar(a, destino)}
                      >
                        {etiqueta}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
