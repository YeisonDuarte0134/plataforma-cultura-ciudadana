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
  const [tipo, setTipo] = useState('evento'); // fijo al editar; elegible al crear
  const [datos, setDatos] = useState({
    titulo: '',
    descripcion: '',
    tematicaId: '',
    fechaInicio: '',
    lugar: '',
    cupo: '',
    puntos: '',
    fechaLimite: '',
    tipoEvidencia: 'foto',
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
        setTipo(actividad.tipo);
        setDatos({
          titulo: actividad.titulo,
          descripcion: actividad.descripcion,
          tematicaId: String(actividad.tematica_id),
          fechaInicio: aFechaLocal(actividad.fecha_inicio),
          lugar: actividad.lugar ?? '',
          cupo: actividad.cupo ?? '',
          puntos: actividad.puntos ?? '',
          fechaLimite: aFechaLocal(actividad.fecha_limite),
          tipoEvidencia: actividad.tipo_evidencia ?? 'foto',
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

  const esReto = tipo === 'reto';
  const etiquetaTipo = esReto ? 'reto' : 'evento';

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
        ...(esReto
          ? {
              puntos: Number(datos.puntos),
              fechaLimite: new Date(datos.fechaLimite).toISOString(),
              tipoEvidencia: datos.tipoEvidencia,
            }
          : {
              fechaInicio: new Date(datos.fechaInicio).toISOString(),
              lugar: datos.lugar,
              cupo: datos.cupo === '' ? null : Number(datos.cupo),
            }),
      };

      if (esNuevo) {
        await crearActividad(token, { ...cuerpo, laboratorioId: Number(labId), tipo });
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
      <Link to={`/admin/laboratorios/${labId}/actividades`} className="volver">Actividades</Link>

      <h2>{esNuevo ? 'Nueva actividad' : `Editar ${etiquetaTipo}`}</h2>
      <p className="texto-suave">
        La actividad se crea en estado <strong>borrador</strong>; publícala desde
        la lista cuando esté lista.
      </p>

      <form onSubmit={manejarEnvio} className="formulario formulario-ancho">
        {esNuevo && (
          <fieldset className="campo">
            <legend>Tipo de actividad</legend>
            <div className="opciones-tipo" role="radiogroup">
              <label className="opcion-tipo">
                <input
                  type="radio"
                  name="tipo"
                  value="evento"
                  checked={tipo === 'evento'}
                  onChange={() => setTipo('evento')}
                />
                Evento presencial (fecha, lugar y cupo)
              </label>
              <label className="opcion-tipo">
                <input
                  type="radio"
                  name="tipo"
                  value="reto"
                  checked={tipo === 'reto'}
                  onChange={() => setTipo('reto')}
                />
                Reto con evidencia (puntos y fecha límite)
              </label>
            </div>
          </fieldset>
        )}

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

        {esReto ? (
          <>
            <label className="campo">
              Puntos al aprobarse la evidencia
              <input type="number" value={datos.puntos} onChange={cambiar('puntos')} min={1} max={10000} required />
            </label>

            <label className="campo">
              Fecha límite para enviar evidencia
              <input type="datetime-local" value={datos.fechaLimite} onChange={cambiar('fechaLimite')} required />
            </label>

            <label className="campo">
              Evidencia requerida
              <select value={datos.tipoEvidencia} onChange={cambiar('tipoEvidencia')} required>
                <option value="foto">Foto</option>
                <option value="texto">Texto</option>
                <option value="foto_y_texto">Foto y texto</option>
              </select>
            </label>
          </>
        ) : (
          <>
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
          </>
        )}

        {mensaje && <p className="aviso aviso-ok">{mensaje}</p>}
        {error && <p className="aviso aviso-error">{error}</p>}

        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? 'Guardando…' : esNuevo ? `Crear ${etiquetaTipo} (borrador)` : 'Guardar cambios'}
        </button>
      </form>
    </section>
  );
}
