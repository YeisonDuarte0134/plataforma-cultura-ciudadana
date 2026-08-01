import {
  consultarMetricasLaboratorio,
  consultarMetricasGlobales,
  csvMetricasLaboratorio,
  csvMetricasGlobales,
} from '../servicios/metricas.servicio.js';

/** Envía el reporte como descarga CSV con nombre de archivo propio. */
function responderCsv(res, nombre, contenido) {
  res
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="${nombre}"`)
    .send(contenido);
}

export async function metricasLaboratorio(req, res, next) {
  try {
    const datos = await consultarMetricasLaboratorio(req.perfil, req.params.id, req.query);
    if (req.query.formato === 'csv') {
      responderCsv(res, `metricas-laboratorio-${datos.laboratorio.id}.csv`, csvMetricasLaboratorio(datos));
      return;
    }
    res.json(datos);
  } catch (error) {
    next(error);
  }
}

export async function metricasGlobales(req, res, next) {
  try {
    const datos = await consultarMetricasGlobales(req.query);
    if (req.query.formato === 'csv') {
      responderCsv(res, 'metricas-globales.csv', csvMetricasGlobales(datos));
      return;
    }
    res.json(datos);
  } catch (error) {
    next(error);
  }
}
