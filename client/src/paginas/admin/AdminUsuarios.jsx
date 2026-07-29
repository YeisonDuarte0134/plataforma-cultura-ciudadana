import { useState } from 'react';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { buscarUsuarios, cambiarEstadoUsuario, ErrorApi } from '../../api.js';

/** Administración de usuarios (solo admin): buscar, ver estado, activar/desactivar. */
export default function AdminUsuarios() {
  const { perfil, obtenerToken } = useAutenticacion();
  const [busqueda, setBusqueda] = useState('');
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);

  async function manejarBusqueda(evento) {
    evento.preventDefault();
    setError(null);
    try {
      setUsuarios(await buscarUsuarios(await obtenerToken(), busqueda));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'Error en la búsqueda.');
    }
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

  return (
    <section>
      <h2>Usuarios de la plataforma</h2>

      <form onSubmit={manejarBusqueda} className="buscador">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por alias o correo…"
          minLength={2}
          required
        />
        <button type="submit" className="boton boton-pequeno">Buscar</button>
      </form>

      {error && <p className="aviso aviso-error">{error}</p>}

      {usuarios !== null &&
        (usuarios.length === 0 ? (
          <p className="aviso">Sin resultados para esa búsqueda.</p>
        ) : (
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
        ))}
    </section>
  );
}
