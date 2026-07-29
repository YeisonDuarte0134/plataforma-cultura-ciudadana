import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config.js';
import { crearVerificarToken } from './middleware/autenticacion.js';
import saludRutas from './rutas/salud.rutas.js';
import infoRutas from './rutas/info.rutas.js';
import laboratoriosRutas from './rutas/laboratorios.rutas.js';
import crearUsuariosRutas from './rutas/usuarios.rutas.js';
import { rutaNoEncontrada, manejadorErrores } from './middleware/manejadorErrores.js';

/**
 * Fábrica de la aplicación. `verificadorTokens` es la única dependencia
 * inyectable: en producción es firebase-admin (ver index.js); en pruebas,
 * un verificador falso que no requiere credenciales.
 */
export default function crearApp({ verificadorTokens }) {
  const app = express();
  const verificarToken = crearVerificarToken(verificadorTokens);

  app.use(helmet());
  app.use(cors({ origin: config.origenCors }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1/salud', saludRutas);
  app.use('/api/v1/info', infoRutas);
  app.use('/api/v1/laboratorios', laboratoriosRutas);
  app.use('/api/v1/usuarios', crearUsuariosRutas(verificarToken));

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
