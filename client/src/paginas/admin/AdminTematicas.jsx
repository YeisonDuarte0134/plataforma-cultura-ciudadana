import { useCallback, useEffect, useState } from 'react';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import { obtenerTodasLasTematicas, crearTematica, editarTematica, ErrorApi } from '../../api.js';

/** Catálogo de temáticas ciudadanas (solo admin): crear, renombrar, activar/desactivar. */
export default function AdminTematicas() {
  const { obtenerToken } = useAutenticacion();
  const [estado, setEstado] = useState('cargando');
  const [tematicas, setTematicas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setTematicas(await obtenerTodasLasTematicas(await obtenerToken()));
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function manejarCrear(evento) {
    evento.preventDefault();
    setError(null);
    setCreando(true);
    try {
      await crearTematica(await obtenerToken(), { nombre, descripcion: descripcion || undefined });
      setNombre('');
      setDescripcion('');
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible crear la temática.');
    } finally {
      setCreando(false);
    }
  }

  async function alternarActiva(tematica) {
    setError(null);
    try {
      await editarTematica(await obtenerToken(), tematica.id, { activa: !tematica.activa });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible actualizar.');
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando temáticas…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <h2>Temáticas ciudadanas</h2>
      <p className="texto-suave">
        Clasifican las actividades y alimentan la métrica de preferencias.
        Toda actividad exige una temática activa.
      </p>

      <form onSubmit={manejarCrear} className="formulario formulario-ancho">
        <label className="campo">
          Nombre de la nueva temática
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={3} maxLength={60} required />
        </label>
        <label className="campo">
          Descripción (opcional)
          <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={300} />
        </label>
        <button type="submit" className="boton boton-pequeno" disabled={creando}>
          {creando ? 'Creando…' : '+ Crear temática'}
        </button>
      </form>

      {error && <p className="aviso aviso-error">{error}</p>}

      <div className="tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tematicas.map((t) => (
              <tr key={t.id}>
                <td>{t.nombre}</td>
                <td className="texto-suave">{t.descripcion}</td>
                <td>
                  <span className={`insignia ${t.activa ? 'insignia-ok' : 'insignia-falla'}`}>
                    {t.activa ? 'activa' : 'inactiva'}
                  </span>
                </td>
                <td className="tabla-acciones">
                  <button type="button" className="enlace-accion enlace-peligro" onClick={() => alternarActiva(t)}>
                    {t.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
