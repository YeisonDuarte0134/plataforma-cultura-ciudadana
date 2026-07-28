import 'dotenv/config';

const config = {
  puerto: Number(process.env.PORT) || 3001,
  urlBaseDatos: process.env.DATABASE_URL,
  origenCors: process.env.CORS_ORIGIN || 'http://localhost:5173',
  entorno: process.env.NODE_ENV || 'development',
};

if (!config.urlBaseDatos) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. Copie server/.env.example a server/.env y configúrela.'
  );
}

export default config;
