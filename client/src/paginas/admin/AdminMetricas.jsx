import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import { GraficaComparada, GraficaSimple, TarjetasResumen } from '../../componentes/GraficaBarras.jsx';
import {
  obtenerMetricasLaboratorio,
  obtenerActividadesDeLaboratorio,
  obtenerTematicas,
  descargarCsvMetricasLaboratorio,
  ErrorApi,
} from '../../api.js';

const FILTROS_VACIOS = { desde: '', hasta: '', actividad: '', tematica: '' };

/**
 * Dashboard de mÃ©tricas del laboratorio (HU-30/31/32): agregados de la
 * bitÃ¡cora de participaciÃ³n con filtros por fechas, actividad y temÃ¡tica,
 * y exportaciÃ³n CSV de lo visible. Todo es anÃ³nimo: solo conteos.
 */
export default function AdminMetricas() {
  const { labId } = useParams();
  const { obtenerToken } = useAutenticacion();
  const [estado, setEstado] = useState('cargando');
  const [datos, setDatos] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [tematicas, setTematicas] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [error, setError] = useState(null);

  const cargar = useCallback(
    async (filtrosAplicar) => {
      setError(null);
      try {
        const token = await obtenerToken();
        setDatos(await obtenerMetricasLaboratorio(token, labId, filtrosAplicar));
        setEstado('listo');
      } catch (e) {
        if (estado === 'cargando') {
          setEstado('error');
        } else {
          setError(e instanceof ErrorApi ? e.message : 'No fue posible actualizar las mÃ©tricas.');
        }
      }
    },
    [labId, obtenerToken, estado]
  );

  useEffect(() => {
    (async () => {
      try {
        const token = await obtenerToken();
        const [lista, temas] = await Promise.all([
          obtenerActividadesDeLaboratorio(token, labId),
          obtenerTematicas(),
        ]);
        setActividades(lista);
        setTematicas(temas);
      } catch {
        // Los selectores quedan vacÃ­os; el dashboard sigue siendo usable.
      }
    })();
    cargar(FILTROS_VACIOS);
    // Solo al montar: las recargas posteriores pasan por aplicarFiltros.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId]);

  function aplicarFiltros(evento) {
    evento.preventDefault();
    cargar(filtros);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    cargar(FILTROS_VACIOS);
  }

  async function exportarCsv() {
    setError(null);
    try {
      const blob = await descargarCsvMetricasLaboratorio(await obtenerToken(), labId, filtros);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `metricas-laboratorio-${labId}.csv`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No fue posible descargar el CSV.');
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Calculando mÃ©tricasâ€¦" />;
  if (estado === 'error') return <EstadoError />;

  const { resumen } = datos;

  return (
    <section>
      <Link to={`/admin/laboratorios/${labId}/actividades`} className="volver">
        â† Actividades
      </Link>

      <div className="admin-barra">
        <h2>MÃ©tricas â€” {datos.laboratorio.nombre}</h2>
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={exportarCsv}>
          Exportar CSV
        </button>
      </div>

      <p className="texto-suave">
        Datos agregados y anonimizados de la bitÃ¡cora de participaciÃ³n; ningÃºn indicador expone
        personas individuales.
      </p>

      <form className="metricas-filtros" onSubmit={aplicarFiltros}>
        <label>
          Desde
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
          />
        </label>
        <label>
          Actividad
          <select
            value={filtros.actividad}
            onChange={(e) => setFiltros({ ...filtros, actividad: e.target.value })}
          >
            <option value="">Todas</option>
            {actividades.map((a) => (
              <option key={a.id} value={a.id}>
                {a.titulo}
              </option>
            ))}
          </select>
        </label>
        <label>
          TemÃ¡tica
          <select
            value={filtros.tematica}
            onChange={(e) => setFiltros({ ...filtros, tematica: e.target.value })}
          >
            <option value="">Todas</option>
            {tematicas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="metricas-filtros-acciones">
          <button type="submit" className="boton boton-pequeno">
            Aplicar filtros
          </button>
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </form>

      {error && <p className="aviso aviso-error">{error}</p>}

      <TarjetasResumen
        tarjetas={[
          { etiqueta: 'Participantes activos', valor: resumen.participantes_activos },
          { etiqueta: 'Inscripciones', valor: resumen.inscripciones },
          { etiqueta: 'Asistencias', valor: resumen.asistencias },
          { etiqueta: 'EnvÃ­os de evidencia', valor: resumen.envios_evidencia },
          { etiqueta: 'Evidencias aprobadas', valor: resumen.aprobaciones },
        ]}
      />

      <h3>Asistencia a convocatorias</h3>
      <GraficaComparada
        etiquetaBase="Inscritos"
        etiquetaLogro="Asistentes"
        filas={datos.asistencia.porEvento.map((e) => ({
          etiqueta: e.titulo,
          base: e.inscritos,
          logro: e.asistentes,
          tasa: e.tasa,
        }))}
      />

      <h3>FinalizaciÃ³n de retos</h3>
      <GraficaComparada
        etiquetaBase="Participantes"
        etiquetaLogro="Finalizados"
        filas={datos.retos.porReto.map((r) => ({
          etiqueta: r.titulo,
          base: r.participantes,
          logro: r.finalizados,
          tasa: r.tasa,
        }))}
      />

      <h3>Preferencias temÃ¡ticas</h3>
      <GraficaSimple
        filas={datos.tematicas.map((t) => ({
          etiqueta: t.nombre,
          valor: t.participaciones,
          detalle: `${t.participaciones} participaciones Â· ${t.participantes} personas`,
        }))}
      />
    </section>
  );
}
