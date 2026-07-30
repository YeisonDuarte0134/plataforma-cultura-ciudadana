import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import {
  obtenerTematicas,
  obtenerActividadAdministrable,
  crearActividad,
  editarActividad,
  ErrorApi,
} from '../../api.js';

/** Convierte un timestamp ISO al formato de <input type="datetime-local">. */
function aFechaLocal(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  const ajustada = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return ajustada.toISOString().slice(0, 16);
}

export default function AdminActividadFormulario() {
  const { labId, id } = useParams();
  const esNuevo = id === undefined;
  const { obtenerToken } = useAutenticacion();
  const navegar = useNavigate();

  const [estado, setEstado] = useState('cargando');
  const [tematicas, setTematicas] = useState([]);
  const [datos, setDatos] = useState({
    titulo: '',
    descripcion: '',
    tematicaId: '',
    fechaInicio: '',
    lugar: '',
    cupo: '',
  });
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const catalogo = await obtenerTematicas();
      setTematicas(catalogo);

      if (!esNuevo) {
        const actividad = await obtenerActividadAdministrable(await obtenerToken(), id);
        setDatos({
          titulo: actividad.titulo,
          descripcion: actividad.descripcion,
          tematicaId: String(actividad.tematica_id),
          fechaInicio: aFechaLocal(actividad.fecha_inicio),
          lugar: actividad.lugar ?? '',
          cupo: actividad.cupo ?? '',
        });
      }
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [esNuevo, id, obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cambiar(campo) {
    return (e) => setDatos({ ...datos, [campo]: e.target.value });
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError(null);
    setMensaje(null);
    setGuardando(true);
    try {
      const token = await obtenerToken();
      const cuerpo = {
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        tematicaId: Number(datos.tematicaId),
        fechaInicio: new Date(datos.fechaInicio).toISOString(),
        lugar: datos.lugar,
        cupo: datos.cupo === '' ? null : Number(datos.cupo),
      };

      if (esNuevo) {
        await crearActividad(token, { ...cuerpo, laboratorioId: Number(labId), tipo: 'evento' });
        navegar(`/admin/laboratorios/${labId}/actividades`);
      } else {
        await editarActividad(token, id, cuerpo);
        setMensaje('Cambios guardados.');
      }
    } catch (errorCapturado) {
      setError(errorCapturado instanceof ErrorApi ? errorCapturado.message : 'No fue posible guardar.');
    } finally {
      setGuardando(false);
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <Link to={`/admin/laboratorios/${labId}/actividades`} className="volver">← Actividades</Link>

      <h2>{esNuevo ? 'Nuevo evento' : 'Editar evento'}</h2>
      <p className="texto-suave">
        El evento se crea en estado <strong>borrador</strong>; publícalo desde
        la lista cuando esté listo.
      </p>

      <form onSubmit={manejarEnvio} className="formulario formulario-ancho">
        <label className="campo">
          Título
          <input type="text" value={datos.titulo} onChange={cambiar('titulo')} minLength={5} maxLength={150} required />
        </label>

        <label className="campo">
          Descripción
          <textarea value={datos.descripcion} onChange={cambiar('descripcion')} minLength={10} maxLength={3000} rows={5} required />
        </label>

        <label className="campo">
          Temática
          <select value={datos.tematicaId} onChange={cambiar('tematicaId')} required>
            <option value="" disabled>Selecciona una temática…</option>
            {tematicas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          Fecha y hora
          <input type="datetime-local" value={datos.fechaInicio} onChange={cambiar('fechaInicio')} required />
        </label>

        <label className="campo">
          Lugar
          <input type="text" value={datos.lugar} onChange={cambiar('lugar')} minLength={5} maxLength={200} required />
        </label>

        <label className="campo">
          Cupo (vacío = sin límite)
          <input type="number" value={datos.cupo} onChange={cambiar('cupo')} min={1} max={100000} />
        </label>

        {mensaje && <p className="aviso aviso-ok">{mensaje}</p>}
        {error && <p className="aviso aviso-error">{error}</p>}

        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? 'Guardando…' : esNuevo ? 'Crear evento (borrador)' : 'Guardar cambios'}
        </button>
      </form>
    </section>
  );
}
