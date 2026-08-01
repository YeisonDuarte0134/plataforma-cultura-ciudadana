import { useCallback, useEffect, useState } from 'react';
import { useAutenticacion } from '../../contexto/AutenticacionContexto.jsx';
import { EstadoCarga, EstadoError } from '../../componentes/Estados.jsx';
import { GraficaSimple, TarjetasResumen } from '../../componentes/GraficaBarras.jsx';
import {
  obtenerMetricasGlobales,
  descargarCsvMetricasGlobales,
  ErrorApi,
} from '../../api.js';

const FILTROS_VACIOS = { desde: '', hasta: '' };

const porcentaje = (valor) => (valor === null ? '—' : `${valor} %`);

/**
 * Métricas globales del administrador (HU-38): consolidado de toda la
 * plataforma y comparativa entre laboratorios, con filtro por fechas y
 * exportación CSV. Como todo reporte, solo datos agregados y anónimos.
 */
export default function AdminMetricasGlobales() {
  const { obtenerToken } = useAutenticacion();
  const [estado, setEstado] = useState('cargando');
  const [datos, setDatos] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [error, setError] = useState(null);

  const cargar = useCallback(
    async (filtrosAplicar) => {
      setError(null);
      try {
        setDatos(await obtenerMetricasGlobales(await obtenerToken(), filtrosAplicar));
        setEstado('listo');
      } catch (e) {
        if (estado === 'cargando') {
          setEstado('error');
        } else {
          setError(e instanceof ErrorApi ? e.message : 'No fue posible actualizar las métricas.');
        }
      }
    },
    [obtenerToken, estado]
  );

  useEffect(() => {
    cargar(FILTROS_VACIOS);
    // Solo al montar: las recargas posteriores pasan por el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const blob = await descargarCsvMetricasGlobales(await obtenerToken(), filtros);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'metricas-globales.csv';
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No fue posible descargar el CSV.');
    }
  }

  if (estado === 'cargando') return <EstadoCarga mensaje="Calculando métricas…" />;
  if (estado === 'error') return <EstadoError />;

  const { resumen } = datos;

  return (
    <section>
      <div className="admin-barra">
        <h2>Métricas globales</h2>
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={exportarCsv}>
          Exportar CSV
        </button>
      </div>

      <p className="texto-suave">
        Consolidado de toda la plataforma y comparativa entre laboratorios, siempre con datos
        agregados y anonimizados.
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
          { etiqueta: 'Envíos de evidencia', valor: resumen.envios_evidencia },
          { etiqueta: 'Evidencias aprobadas', valor: resumen.aprobaciones },
        ]}
      />

      <h3>Comparativa entre laboratorios</h3>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr>
              <th>Laboratorio</th>
              <th>Participantes activos</th>
              <th>Inscritos</th>
              <th>Asistentes</th>
              <th>Tasa de asistencia</th>
              <th>En retos</th>
              <th>Finalizados</th>
              <th>Tasa de finalización</th>
            </tr>
          </thead>
          <tbody>
            {datos.laboratorios.map((l) => (
              <tr key={l.laboratorio_id}>
                <td>
                  {l.nombre}
                  {!l.activo && <span className="insignia insignia-falla">inactivo</span>}
                </td>
                <td>{l.participantes_activos}</td>
                <td>{l.inscritos}</td>
                <td>{l.asistentes}</td>
                <td>{porcentaje(l.tasa_asistencia)}</td>
                <td>{l.participantes_retos}</td>
                <td>{l.retos_finalizados}</td>
                <td>{porcentaje(l.tasa_finalizacion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Participación por laboratorio</h3>
      <GraficaSimple
        filas={datos.laboratorios
          .filter((l) => l.participantes_activos > 0)
          .map((l) => ({
            etiqueta: l.nombre,
            valor: l.participantes_activos,
            detalle: `${l.participantes_activos} participantes activos`,
          }))}
      />

      <h3>Preferencias temáticas</h3>
      <GraficaSimple
        filas={datos.tematicas.map((t) => ({
          etiqueta: t.nombre,
          valor: t.participaciones,
          detalle: `${t.participaciones} participaciones · ${t.participantes} personas`,
        }))}
      />
    </section>
  );
}
