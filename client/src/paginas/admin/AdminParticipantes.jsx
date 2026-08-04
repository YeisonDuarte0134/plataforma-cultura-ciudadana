import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import {
  obtenerActividadAdministrable,
  obtenerParticipantes,
  registrarAsistenciaManual,
  ErrorApi,
} from '../../api.js';

/** Inscritos y asistentes de un evento, con marcado manual de respaldo. */
export default function AdminParticipantes() {
  const { labId, id } = useParams();
  const { obtenerToken } = useAutenticacion();

  const [estado, setEstado] = useState('cargando');
  const [actividad, setActividad] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const token = await obtenerToken();
      const [datosActividad, lista] = await Promise.all([
        obtenerActividadAdministrable(token, id),
        obtenerParticipantes(token, id),
      ]);
      setActividad(datosActividad);
      setParticipantes(lista);
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [id, obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function marcarManual(participante) {
    setError(null);
    try {
      await registrarAsistenciaManual(await obtenerToken(), Number(id), participante.usuario_id);
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible registrar la asistencia.');
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando participantesâ€¦" />;
  if (estado === 'error') return <EstadoError />;

  const asistentes = participantes.filter((p) => p.asistencia_metodo).length;

  return (
    <section>
      <Link to={`/admin/laboratorios/${labId}/actividades`} className="volver">
        â† Actividades
      </Link>

      <h2>Participantes â€” {actividad.titulo}</h2>
      <p className="texto-suave">
        {participantes.length} inscritos Â· {asistentes} asistentes
        {actividad.cupo !== null && ` Â· cupo ${actividad.cupo}`}
      </p>

      {error && <p className="aviso aviso-error">{error}</p>}

      {participantes.length === 0 ? (
        <p className="aviso">AÃºn no hay inscritos en este evento.</p>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Participante</th>
                <th>Correo</th>
                <th>Asistencia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {participantes.map((p) => (
                <tr key={p.usuario_id}>
                  <td>{p.avatar ?? 'ðŸ™‚'} {p.alias}</td>
                  <td className="texto-suave">{p.correo}</td>
                  <td>
                    {p.asistencia_metodo ? (
                      <span className="insignia insignia-ok">
                        âœ“ {p.asistencia_metodo === 'qr' ? 'por QR' : 'manual'}
                      </span>
                    ) : (
                      <span className="insignia insignia-neutra">pendiente</span>
                    )}
                  </td>
                  <td className="tabla-acciones">
                    {!p.asistencia_metodo && (
                      <button
                        type="button"
                        className="enlace-accion"
                        onClick={() => marcarManual(p)}
                      >
                        Marcar asistencia
                      </button>
                    )}
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
