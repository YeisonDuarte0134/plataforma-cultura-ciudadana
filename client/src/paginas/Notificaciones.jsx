import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacion } from '../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';
import { obtenerNotificaciones, marcarNotificacionesLeidas } from '../api.js';
import Icono from '../componentes/Icono.jsx';

const ICONO_TIPO = {
  nueva_actividad: 'megafono',
  evidencia_aprobada: 'sello',
  evidencia_rechazada: 'ajustes',
  insignia_otorgada: 'puntos',
};

/**
 * Bandeja de notificaciones internas (Fase 11). Al abrirla se marcan todas
 * como leídas (el resaltado muestra cuáles acababan de llegar), así el
 * indicador de la cabecera vuelve a cero.
 */
export default function Notificaciones() {
  const { obtenerToken } = useAutenticacion();
  const [estado, setEstado] = useState('cargando');
  const [notificaciones, setNotificaciones] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const token = await obtenerToken();
        const bandeja = await obtenerNotificaciones(token);
        setNotificaciones(bandeja.notificaciones);
        setEstado('listo');
        if (bandeja.noLeidas > 0) {
          await marcarNotificacionesLeidas(token);
        }
      } catch {
        setEstado('error');
      }
    })();
  }, [obtenerToken]);

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando tus notificaciones…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <h1 className="pagina-titulo">Notificaciones</h1>

      {notificaciones.length === 0 ? (
        <p className="aviso">
          No tienes notificaciones. Elige tus temáticas de interés en{' '}
          <Link to="/perfil">tu perfil</Link> para enterarte de las nuevas actividades.
        </p>
      ) : (
        <ul className="notificaciones-lista">
          {notificaciones.map((n) => (
            <li
              key={n.id}
              className={`notificacion${n.leida ? '' : ' notificacion-nueva'}`}
            >
              <span className="notificacion-icono" aria-hidden="true">
                <Icono nombre={ICONO_TIPO[n.tipo] ?? 'campana'} />
              </span>
              <div>
                <p className="notificacion-mensaje">
                  {n.actividad_id ? (
                    <Link to={`/actividades/${n.actividad_id}`}>{n.mensaje}</Link>
                  ) : (
                    n.mensaje
                  )}
                </p>
                <p className="texto-suave notificacion-fecha">
                  {new Date(n.created_at).toLocaleString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {!n.leida && ' · nueva'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
