import { useCallback, useEffect, useState } from 'react';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import {
  obtenerConfiguracionGamificacion,
  actualizarReglaPuntos,
  guardarNiveles,
  crearInsignia,
  editarInsignia,
  ErrorApi,
} from '../../api.js';

const ETIQUETA_REGLA = {
  asistencia: 'Puntos por asistencia a un evento',
  reto_aprobado: 'Puntos por reto aprobado (si el reto no define los suyos)',
};

const INSIGNIA_VACIA = {
  codigo: '',
  nombre: '',
  descripcion: '',
  icono: '🏆',
  tipo: 'contador',
  accion: 'asistencia',
  umbral: 1,
};

function criterioDesdeFormulario(datos) {
  return datos.tipo === 'contador'
    ? { tipo: 'contador', accion: datos.accion, umbral: Number(datos.umbral) }
    : { tipo: 'tematicas_distintas', umbral: Number(datos.umbral) };
}

function resumenCriterio(criterio) {
  if (criterio.tipo === 'contador') {
    const accion = criterio.accion === 'asistencia' ? 'asistencias' : 'retos aprobados';
    return `${criterio.umbral} ${accion}`;
  }
  return `${criterio.umbral} temáticas distintas`;
}

/**
 * Configuración del sistema de incentivos sin tocar código: reglas de
 * puntos, umbrales de nivel y catálogo de insignias. Los cambios rigen
 * solo hacia adelante: lo ya otorgado nunca se recalcula.
 */
export default function AdminGamificacion() {
  const { obtenerToken } = useAutenticacion();

  const [estado, setEstado] = useState('cargando');
  const [reglas, setReglas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [insignias, setInsignias] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null); // id de insignia en edición
  const [formInsignia, setFormInsignia] = useState(null);
  const [nueva, setNueva] = useState(null); // formulario de insignia nueva

  const cargar = useCallback(async () => {
    try {
      const datos = await obtenerConfiguracionGamificacion(await obtenerToken());
      setReglas(datos.reglas);
      setNiveles(datos.niveles.map((n) => ({ ...n, puntos_minimos: String(n.puntos_minimos) })));
      setInsignias(datos.insignias);
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [obtenerToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function ejecutar(operacion, exito) {
    setMensaje(null);
    setError(null);
    try {
      await operacion(await obtenerToken());
      setMensaje(exito);
      await cargar();
      return true;
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No fue posible guardar los cambios.');
      return false;
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Cargando configuración…" />;
  if (estado === 'error') return <EstadoError />;

  return (
    <section>
      <h2>Gamificación</h2>
      <p className="texto-suave">
        Los cambios rigen la participación futura: los puntos e insignias ya
        otorgados no se recalculan ni se revocan.
      </p>

      {mensaje && <p className="aviso aviso-ok">{mensaje}</p>}
      {error && <p className="aviso aviso-error">{error}</p>}

      <h3 className="seccion-subtitulo">Reglas de puntos</h3>
      <div className="config-reglas">
        {reglas.map((regla) => (
          <form
            key={regla.accion}
            className="config-regla"
            onSubmit={(e) => {
              e.preventDefault();
              const puntos = Number(new FormData(e.target).get('puntos'));
              ejecutar(
                (token) => actualizarReglaPuntos(token, regla.accion, puntos),
                'Regla actualizada.'
              );
            }}
          >
            <label className="campo">
              {ETIQUETA_REGLA[regla.accion] ?? regla.accion}
              <input type="number" name="puntos" defaultValue={regla.puntos} min={1} max={10000} required />
            </label>
            <button type="submit" className="boton boton-pequeno">Guardar</button>
          </form>
        ))}
      </div>

      <h3 className="seccion-subtitulo">Niveles</h3>
      <p className="texto-suave">
        El primer nivel empieza en 0 puntos y los umbrales deben crecer con el nivel.
      </p>
      <div className="tabla-envoltura">
        <table className="tabla config-niveles">
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Nombre</th>
              <th>Puntos mínimos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {niveles.map((nivel, indice) => (
              <tr key={indice}>
                <td>{indice + 1}</td>
                <td>
                  <input
                    type="text"
                    value={nivel.nombre}
                    minLength={3}
                    maxLength={50}
                    onChange={(e) => {
                      const copia = [...niveles];
                      copia[indice] = { ...copia[indice], nombre: e.target.value };
                      setNiveles(copia);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={nivel.puntos_minimos}
                    min={0}
                    disabled={indice === 0}
                    onChange={(e) => {
                      const copia = [...niveles];
                      copia[indice] = { ...copia[indice], puntos_minimos: e.target.value };
                      setNiveles(copia);
                    }}
                  />
                </td>
                <td>
                  {indice === niveles.length - 1 && niveles.length > 1 && (
                    <button
                      type="button"
                      className="enlace-accion enlace-peligro"
                      onClick={() => setNiveles(niveles.slice(0, -1))}
                    >
                      Quitar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tabla-acciones config-acciones">
        <button
          type="button"
          className="boton boton-secundario boton-pequeno"
          disabled={niveles.length >= 20}
          onClick={() =>
            setNiveles([...niveles, { nombre: 'Nuevo nivel', puntos_minimos: '' }])
          }
        >
          + Agregar nivel
        </button>
        <button
          type="button"
          className="boton boton-pequeno"
          onClick={() =>
            ejecutar(
              (token) =>
                guardarNiveles(
                  token,
                  niveles.map((nivel, indice) => ({
                    numero: indice + 1,
                    nombre: nivel.nombre,
                    puntosMinimos: indice === 0 ? 0 : Number(nivel.puntos_minimos),
                  }))
                ),
              'Niveles guardados.'
            )
          }
        >
          Guardar niveles
        </button>
      </div>

      <h3 className="seccion-subtitulo">Insignias</h3>
      <ul className="config-insignias">
        {insignias.map((insignia) => (
          <li key={insignia.id} className={`tarjeta config-insignia${insignia.activa ? '' : ' config-insignia-inactiva'}`}>
            {editando === insignia.id ? (
              <FormularioInsignia
                datos={formInsignia}
                cambiar={setFormInsignia}
                conCodigo={false}
                alCancelar={() => setEditando(null)}
                alGuardar={async () => {
                  const ok = await ejecutar(
                    (token) =>
                      editarInsignia(token, insignia.id, {
                        nombre: formInsignia.nombre,
                        descripcion: formInsignia.descripcion,
                        icono: formInsignia.icono,
                        criterio: criterioDesdeFormulario(formInsignia),
                      }),
                    'Insignia actualizada.'
                  );
                  if (ok) setEditando(null);
                }}
              />
            ) : (
              <>
                <div className="config-insignia-info">
                  <span className="insignia-icono" aria-hidden="true">{insignia.icono}</span>
                  <div>
                    <strong>{insignia.nombre}</strong>{' '}
                    <code className="texto-suave">{insignia.codigo}</code>
                    <p className="texto-suave">
                      {insignia.descripcion} · Criterio: {resumenCriterio(insignia.criterio)}
                    </p>
                  </div>
                </div>
                <div className="tabla-acciones">
                  {!insignia.activa && <span className="insignia insignia-falla">inactiva</span>}
                  <button
                    type="button"
                    className="enlace-accion"
                    onClick={() => {
                      setEditando(insignia.id);
                      setFormInsignia({
                        nombre: insignia.nombre,
                        descripcion: insignia.descripcion,
                        icono: insignia.icono,
                        tipo: insignia.criterio.tipo,
                        accion: insignia.criterio.accion ?? 'asistencia',
                        umbral: insignia.criterio.umbral,
                      });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`enlace-accion${insignia.activa ? ' enlace-peligro' : ''}`}
                    onClick={() =>
                      ejecutar(
                        (token) => editarInsignia(token, insignia.id, { activa: !insignia.activa }),
                        insignia.activa ? 'Insignia desactivada.' : 'Insignia activada.'
                      )
                    }
                  >
                    {insignia.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {nueva ? (
        <div className="tarjeta config-insignia">
          <FormularioInsignia
            datos={nueva}
            cambiar={setNueva}
            conCodigo
            alCancelar={() => setNueva(null)}
            alGuardar={async () => {
              const ok = await ejecutar(
                (token) =>
                  crearInsignia(token, {
                    codigo: nueva.codigo,
                    nombre: nueva.nombre,
                    descripcion: nueva.descripcion,
                    icono: nueva.icono,
                    criterio: criterioDesdeFormulario(nueva),
                  }),
                'Insignia creada.'
              );
              if (ok) setNueva(null);
            }}
          />
        </div>
      ) : (
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setNueva(INSIGNIA_VACIA)}>
          + Nueva insignia
        </button>
      )}
    </section>
  );
}

/** Formulario compartido de creación/edición de insignias. */
function FormularioInsignia({ datos, cambiar, conCodigo, alGuardar, alCancelar }) {
  const campo = (nombre) => (e) => cambiar({ ...datos, [nombre]: e.target.value });

  return (
    <form
      className="formulario"
      onSubmit={(e) => {
        e.preventDefault();
        alGuardar();
      }}
    >
      {conCodigo && (
        <label className="campo">
          Código (identificador, no cambia después)
          <input type="text" value={datos.codigo} onChange={campo('codigo')} pattern="[a-z0-9_]{3,40}" placeholder="mi_insignia" required />
        </label>
      )}

      <label className="campo">
        Nombre
        <input type="text" value={datos.nombre} onChange={campo('nombre')} minLength={3} maxLength={60} required />
      </label>

      <label className="campo">
        Descripción
        <input type="text" value={datos.descripcion} onChange={campo('descripcion')} minLength={5} maxLength={200} required />
      </label>

      <label className="campo">
        Ícono (emoji)
        <input type="text" value={datos.icono} onChange={campo('icono')} maxLength={8} required />
      </label>

      <div className="config-criterio">
        <label className="campo">
          Criterio
          <select value={datos.tipo} onChange={campo('tipo')}>
            <option value="contador">Contador de acciones</option>
            <option value="tematicas_distintas">Temáticas distintas</option>
          </select>
        </label>

        {datos.tipo === 'contador' && (
          <label className="campo">
            Acción
            <select value={datos.accion} onChange={campo('accion')}>
              <option value="asistencia">Asistencia</option>
              <option value="reto_aprobado">Reto aprobado</option>
            </select>
          </label>
        )}

        <label className="campo">
          Umbral
          <input type="number" value={datos.umbral} onChange={campo('umbral')} min={1} max={1000} required />
        </label>
      </div>

      <div className="tabla-acciones">
        <button type="submit" className="boton boton-pequeno">Guardar</button>
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
