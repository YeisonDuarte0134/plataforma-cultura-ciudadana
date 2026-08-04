import { useEffect, useState } from 'react';
import { obtenerRanking, obtenerLaboratorios } from '../api.js';
import { EstadoCarga, EstadoError } from '../componentes/Estados.jsx';

/**
 * Tabla de clasificación pública con datos anonimizados (alias y avatar):
 * general o filtrada por laboratorio. Visible sin registro.
 */
export default function Ranking() {
  const [estado, setEstado] = useState('cargando');
  const [laboratorios, setLaboratorios] = useState([]);
  const [laboratorioId, setLaboratorioId] = useState('');
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    obtenerLaboratorios().then(setLaboratorios).catch(() => setLaboratorios([]));
  }, []);

  useEffect(() => {
    setEstado('cargando');
    obtenerRanking(laboratorioId || undefined)
      .then((datos) => {
        setFilas(datos);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, [laboratorioId]);

  return (
    <section>
      <h1 className="pagina-titulo">Tabla de clasificación</h1>
      <p className="texto-suave">
        Los puntos se ganan asistiendo a eventos y completando retos aprobados.
        Solo se muestran alias y avatares: la participación es anónima para el público.
      </p>

      <label className="campo ranking-filtro">
        Laboratorio
        <select value={laboratorioId} onChange={(e) => setLaboratorioId(e.target.value)}>
          <option value="">Todos (ranking general)</option>
          {laboratorios.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
      </label>

      {estado === 'cargando' && <EstadoCarga mensaje="Cargando ranking…" />}
      {estado === 'error' && <EstadoError />}

      {estado === 'listo' && (
        filas.length === 0 ? (
          <p className="aviso">
            Aún nadie ha sumado puntos{laboratorioId ? ' en este laboratorio' : ''}.
            ¡Participa en un evento o completa un reto y estrena la tabla!
          </p>
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla ranking-tabla">
              <thead>
                <tr>
                  <th>Puesto</th>
                  <th>Participante</th>
                  <th>Nivel</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.posicion}>
                    <td className="ranking-puesto">
                      {fila.posicion <= 3 ? (
                        <span className={`ranking-sello ranking-sello-${fila.posicion}`}>
                          {fila.posicion}
                        </span>
                      ) : (
                        fila.posicion
                      )}
                    </td>
                    <td>
                      <span className="ranking-participante">
                        <span className="sesion-avatar" aria-hidden="true">
                          {fila.avatar ?? fila.alias.charAt(0)}
                        </span>
                        {fila.alias}
                      </span>
                    </td>
                    <td className="texto-suave">{fila.nivel}</td>
                    <td><strong>{fila.puntos}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
