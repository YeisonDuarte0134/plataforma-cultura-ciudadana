import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config.js';
import { crearVerificarToken } from './middleware/autenticacion.js';
import saludRutas from './rutas/salud.rutas.js';
import infoRutas from './rutas/info.rutas.js';
import crearLaboratoriosRutas from './rutas/laboratorios.rutas.js';
import crearUsuariosRutas from './rutas/usuarios.rutas.js';
import crearTematicasRutas from './rutas/tematicas.rutas.js';
import crearActividadesRutas from './rutas/actividades.rutas.js';
import crearInscripcionesRutas from './rutas/inscripciones.rutas.js';
import crearAsistenciasRutas from './rutas/asistencias.rutas.js';
import crearEvidenciasRutas from './rutas/evidencias.rutas.js';
import crearGamificacionRutas from './rutas/gamificacion.rutas.js';
import crearMetricasRutas from './rutas/metricas.rutas.js';
import { rutaNoEncontrada, manejadorErrores } from './middleware/manejadorErrores.js';

/**
 * Fábrica de la aplicación con sus dependencias inyectables: en producción
 * `verificadorTokens` es firebase-admin y `almacenArchivos` Firebase Storage
 * (ver index.js); en pruebas, dobles falsos que no requieren credenciales.
 */
export default function crearApp({ verificadorTokens, almacenArchivos }) {
  const app = express();
  const verificarToken = crearVerificarToken(verificadorTokens);

  app.use(helmet());
  app.use(cors({ origin: config.origenCors }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1/salud', saludRutas);
  app.use('/api/v1/info', infoRutas);
  app.use('/api/v1/laboratorios', crearLaboratoriosRutas(verificarToken));
  app.use('/api/v1/tematicas', crearTematicasRutas(verificarToken));
  app.use('/api/v1/actividades', crearActividadesRutas(verificarToken));
  app.use('/api/v1/inscripciones', crearInscripcionesRutas(verificarToken));
  app.use('/api/v1/asistencias', crearAsistenciasRutas(verificarToken));
  app.use('/api/v1/evidencias', crearEvidenciasRutas(verificarToken, almacenArchivos));
  app.use('/api/v1/gamificacion', crearGamificacionRutas(verificarToken));
  app.use('/api/v1/metricas', crearMetricasRutas(verificarToken));
  app.use('/api/v1/usuarios', crearUsuariosRutas(verificarToken));

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
