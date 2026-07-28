import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config.js';
import saludRutas from './rutas/salud.rutas.js';
import infoRutas from './rutas/info.rutas.js';
import { rutaNoEncontrada, manejadorErrores } from './middleware/manejadorErrores.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.origenCors }));
app.use(express.json());

app.use('/api/v1/salud', saludRutas);
app.use('/api/v1/info', infoRutas);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

export default app;
