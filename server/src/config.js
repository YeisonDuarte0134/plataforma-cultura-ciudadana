import 'dotenv/config';

// El encabezado Origin del navegador nunca trae barra final; se normaliza
// el valor configurado para tolerar URLs como "https://ejemplo.app/".
const origenCrudo = process.env.CORS_ORIGIN || 'http://localhost:5173';

const config = {
  puerto: Number(process.env.PORT) || 3001,
  urlBaseDatos: process.env.DATABASE_URL,
  origenCors: origenCrudo.replace(/\/+$/, ''),
  entorno: process.env.NODE_ENV || 'development',
  // Firma de los tokens de asistencia por QR (JWT propio del servidor).
  secretoQr: process.env.QR_JWT_SECRETO,
  // Bucket de Firebase Storage donde se guardan las fotos de evidencia.
  bucketStorage: process.env.FIREBASE_STORAGE_BUCKET,
};

if (!config.urlBaseDatos) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. Copie server/.env.example a server/.env y configúrela.'
  );
}

if (!config.secretoQr) {
  if (config.entorno === 'production') {
    throw new Error('Falta la variable de entorno QR_JWT_SECRETO en producción.');
  }
  // Solo para desarrollo y pruebas locales.
  config.secretoQr = 'secreto-qr-solo-desarrollo';
}

export default config;
