import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import PanelGestores from './PanelGestores.jsx';
import {
  obtenerLaboratorioAdministrable,
  crearLaboratorio,
  editarLaboratorio,
  ErrorApi,
} from '../../api.js';

/** Crear (admin) o editar (admin / gestor asignado) un laboratorio. */
export default function AdminLaboratorioFormulario() {
  const { id } = useParams();
  const esNuevo = id === undefined;
  const { perfil, obtenerToken } = useAutenticacion();
  const esAdmin = perfil.rol === 'administrador';
  const navegar = useNavigate();

  const [estado, setEstado] = useState(esNuevo ? 'listo' : 'cargando');
  const [datos, setDatos] = useState({ nombre: '', descripcion: '', ubicacion: '', imagenUrl: '' });
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const lab = await obtenerLaboratorioAdministrable(await obtenerToken(), id);
      setDatos({
        nombre: lab.nombre,
        descripcion: lab.descripcion,
        ubicacion: lab.ubicacion,
        imagenUrl: lab.imagen_url ?? '',
      });
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [id, obtenerToken]);

  useEffect(() => {
    if (!esNuevo) cargar();
  }, [esNuevo, cargar]);

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
      const cuerpo = { ...datos, imagenUrl: datos.imagenUrl || undefined };
      if (esNuevo) {
        const creado = await crearLaboratorio(token, cuerpo);
        navegar(`/admin/laboratorios/${creado.id}`);
      } else {
        await editarLaboratorio(token, id, cuerpo);
        setMensaje('Cambios guardados.');
      }
    } catch (errorCapturado) {
      setError(
        errorCapturado instanceof ErrorApi
          ? errorCapturado.message
          : 'No fue posible guardar.'
      );
    } finally {
      setGuardando(false);
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando laboratorio…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <Link to="/admin/laboratorios" className="volver">Laboratorios</Link>

      <h2>{esNuevo ? 'Nuevo laboratorio' : 'Editar laboratorio'}</h2>

      <form onSubmit={manejarEnvio} className="formulario formulario-ancho">
        <label className="campo">
          Nombre
          <input type="text" value={datos.nombre} onChange={cambiar('nombre')} minLength={3} maxLength={120} required />
        </label>

        <label className="campo">
          Descripción
          <textarea value={datos.descripcion} onChange={cambiar('descripcion')} minLength={10} maxLength={2000} rows={5} required />
        </label>

        <label className="campo">
          Ubicación
          <input type="text" value={datos.ubicacion} onChange={cambiar('ubicacion')} minLength={5} maxLength={200} required />
        </label>

        <label className="campo">
          URL de la imagen (https, opcional)
          <input type="url" value={datos.imagenUrl} onChange={cambiar('imagenUrl')} placeholder="https://firebasestorage.googleapis.com/…" />
        </label>

        {mensaje && <p className="aviso aviso-ok">{mensaje}</p>}
        {error && <p className="aviso aviso-error">{error}</p>}

        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? 'Guardando…' : esNuevo ? 'Crear laboratorio' : 'Guardar cambios'}
        </button>
      </form>

      {!esNuevo && esAdmin && <PanelGestores laboratorioId={id} />}
    </section>
  );
}
