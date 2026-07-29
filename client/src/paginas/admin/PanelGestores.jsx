import { useCallback, useEffect, useState } from 'react';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import {
  obtenerGestores,
  asignarGestor,
  revocarGestor,
  buscarUsuarios,
  ErrorApi,
} from '../../api.js';

/** Gestores asignados a un laboratorio: listar, buscar usuario y asignar/revocar (solo admin). */
export default function PanelGestores({ laboratorioId }) {
  const { obtenerToken } = useAutenticacion();
  const [gestores, setGestores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setGestores(await obtenerGestores(await obtenerToken(), laboratorioId));
    } catch {
      setError('No fue posible cargar los gestores.');
    }
  }, [laboratorioId, obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function manejarBusqueda(evento) {
    evento.preventDefault();
    setError(null);
    try {
      setResultados(await buscarUsuarios(await obtenerToken(), busqueda));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'Error en la búsqueda.');
    }
  }

  async function asignar(usuarioId) {
    setError(null);
    try {
      setGestores(await asignarGestor(await obtenerToken(), laboratorioId, usuarioId));
      setResultados([]);
      setBusqueda('');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible asignar.');
    }
  }

  async function revocar(usuarioId) {
    setError(null);
    try {
      setGestores(await revocarGestor(await obtenerToken(), laboratorioId, usuarioId));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible revocar.');
    }
  }

  return (
    <section className="tarjeta panel-gestores">
      <h3>Gestores de este laboratorio</h3>

      {gestores.length === 0 ? (
        <p className="texto-suave">Sin gestores asignados.</p>
      ) : (
        <ul className="lista-gestores">
          {gestores.map((g) => (
            <li key={g.id}>
              <span>
                {g.avatar ?? '🙂'} <strong>{g.alias}</strong>{' '}
                <span className="texto-suave">({g.correo})</span>
              </span>
              <button type="button" className="enlace-accion enlace-peligro" onClick={() => revocar(g.id)}>
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={manejarBusqueda} className="buscador">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar usuario por alias o correo…"
          minLength={2}
          required
        />
        <button type="submit" className="boton boton-pequeno">Buscar</button>
      </form>

      {resultados.length > 0 && (
        <ul className="lista-gestores">
          {resultados.map((u) => (
            <li key={u.id}>
              <span>
                {u.avatar ?? '🙂'} <strong>{u.alias}</strong>{' '}
                <span className="texto-suave">({u.correo} · {u.rol})</span>
              </span>
              <button type="button" className="enlace-accion" onClick={() => asignar(u.id)}>
                Asignar
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="aviso aviso-error">{error}</p>}
    </section>
  );
}
