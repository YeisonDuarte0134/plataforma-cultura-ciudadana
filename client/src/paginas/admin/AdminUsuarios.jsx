import { useCallback, useEffect, useState } from 'react';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import { buscarUsuarios, cambiarEstadoUsuario, ErrorApi } from '../../api.js';

/**
 * Administración de usuarios (solo admin). La pestaña abre con el
 * directorio completo a la vista; la barra de búsqueda filtra por alias o
 * correo y "Limpiar" vuelve a la lista completa.
 */
export default function AdminUsuarios() {
  const { perfil, obtenerToken } = useAutenticacion();
  const [estado, setEstado] = useState('cargando');
  const [busqueda, setBusqueda] = useState('');
  const [filtroAplicado, setFiltroAplicado] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(
    async (texto) => {
      setError(null);
      try {
        setUsuarios(await buscarUsuarios(await obtenerToken(), texto));
        setFiltroAplicado(texto);
        setEstado('listo');
      } catch (e) {
        if (estado === 'cargando') {
          setEstado('error');
        } else {
          setError(e instanceof ErrorApi ? e.message : 'Error en la búsqueda.');
        }
      }
    },
    [obtenerToken, estado]
  );

  useEffect(() => {
    cargar('');
    // Solo al montar: las búsquedas posteriores pasan por el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function manejarBusqueda(evento) {
    evento.preventDefault();
    cargar(busqueda.trim());
  }

  function limpiarBusqueda() {
    setBusqueda('');
    cargar('');
  }

  async function alternarEstado(usuario) {
    setError(null);
    const nuevoEstado = usuario.estado === 'activo' ? 'desactivado' : 'activo';
    try {
      const actualizado = await cambiarEstadoUsuario(await obtenerToken(), usuario.id, nuevoEstado);
      setUsuarios(usuarios.map((u) => (u.id === actualizado.id ? actualizado : u)));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible cambiar el estado.');
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando usuarios…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <h2>Usuarios de la plataforma</h2>

      <form onSubmit={manejarBusqueda} className="buscador">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Filtrar por alias o correo…"
          aria-label="Filtrar por alias o correo"
        />
        <button type="submit" className="boton boton-pequeno">Buscar</button>
        {filtroAplicado && (
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={limpiarBusqueda}>
            Limpiar
          </button>
        )}
      </form>

      {error && <p className="aviso aviso-error">{error}</p>}

      {usuarios.length === 0 ? (
        <p className="aviso">
          {filtroAplicado
            ? 'Sin resultados para esa búsqueda.'
            : 'Aún no hay usuarios registrados.'}
        </p>
      ) : (
        <>
          <p className="texto-suave">
            {filtroAplicado
              ? `${usuarios.length} resultado${usuarios.length === 1 ? '' : 's'} para «${filtroAplicado}»`
              : `${usuarios.length} usuario${usuarios.length === 1 ? '' : 's'} registrado${usuarios.length === 1 ? '' : 's'}`}
          </p>
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.avatar ?? '🙂'} {u.alias}</td>
                    <td className="texto-suave">{u.correo}</td>
                    <td>{u.rol}</td>
                    <td>
                      <span className={`insignia ${u.estado === 'activo' ? 'insignia-ok' : 'insignia-falla'}`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="tabla-acciones">
                      {u.id !== perfil.id && (
                        <button
                          type="button"
                          className="enlace-accion enlace-peligro"
                          onClick={() => alternarEstado(u)}
                        >
                          {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
