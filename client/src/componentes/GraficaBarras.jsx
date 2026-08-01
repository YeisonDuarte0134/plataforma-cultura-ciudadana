/**
 * Gráficas de barras del dashboard de métricas (Fase 10), sin librerías:
 * divs con ancho proporcional al máximo del conjunto. Los números exactos
 * acompañan siempre a la barra, así la gráfica es legible también con
 * lector de pantalla o cuando los valores son muy parecidos.
 */

/**
 * Dos barras por fila para comparar un logro contra su base (asistentes
 * frente a inscritos, finalizados frente a participantes), con la tasa.
 */
export function GraficaComparada({ filas, etiquetaBase, etiquetaLogro }) {
  if (filas.length === 0) {
    return <p className="aviso">Sin datos para el periodo y los filtros elegidos.</p>;
  }
  const maximo = Math.max(1, ...filas.map((f) => f.base));

  return (
    <ul className="grafica" role="list">
      {filas.map((f) => (
        <li key={f.etiqueta} className="grafica-fila">
          <div className="grafica-encabezado">
            <span>{f.etiqueta}</span>
            <span className="texto-suave">
              {f.logro} de {f.base}
              {f.tasa !== null && ` · ${f.tasa} %`}
            </span>
          </div>
          <div
            className="grafica-barra grafica-barra-base"
            style={{ width: `${(f.base / maximo) * 100}%` }}
            title={`${etiquetaBase}: ${f.base}`}
          />
          <div
            className="grafica-barra grafica-barra-logro"
            style={{ width: `${(f.logro / maximo) * 100}%` }}
            title={`${etiquetaLogro}: ${f.logro}`}
          />
        </li>
      ))}
    </ul>
  );
}

/** Una barra por fila, para distribuciones (preferencias temáticas). */
export function GraficaSimple({ filas }) {
  if (filas.length === 0) {
    return <p className="aviso">Sin datos para el periodo y los filtros elegidos.</p>;
  }
  const maximo = Math.max(1, ...filas.map((f) => f.valor));

  return (
    <ul className="grafica" role="list">
      {filas.map((f) => (
        <li key={f.etiqueta} className="grafica-fila">
          <div className="grafica-encabezado">
            <span>{f.etiqueta}</span>
            <span className="texto-suave">{f.detalle}</span>
          </div>
          <div
            className="grafica-barra grafica-barra-logro"
            style={{ width: `${(f.valor / maximo) * 100}%` }}
          />
        </li>
      ))}
    </ul>
  );
}

/** Tarjetas con los totales del resumen. */
export function TarjetasResumen({ tarjetas }) {
  return (
    <div className="metricas-tarjetas">
      {tarjetas.map((t) => (
        <div key={t.etiqueta} className="metricas-tarjeta">
          <strong>{t.valor}</strong>
          <span className="texto-suave">{t.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}
