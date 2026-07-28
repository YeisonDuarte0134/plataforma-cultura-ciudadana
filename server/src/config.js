import 'dotenv/config';

// El encabezado Origin del navegador nunca trae barra final; se normaliza
// el valor configurado para tolerar URLs como "https://ejemplo.app/".
const origenCrudo = process.env.CORS_ORIGIN || 'http://localhost:5173';

const config = {
  puerto: Number(process.env.PORT) || 3001,
  urlBaseDatos: process.env.DATABASE_URL,
  origenCors: origenCrudo.replace(/\/+$/, ''),
  entorno: process.env.NODE_ENV || 'development',
};

if (!config.urlBaseDatos) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. Copie server/.env.example a server/.env y configúrela.'
  );
}

export default config;
