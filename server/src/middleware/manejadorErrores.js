import config from '../config.js';

export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

// Manejador de errores central: la API nunca filtra trazas internas en producción.
export function manejadorErrores(error, req, res, next) {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(config.entorno !== 'production' && { detalle: error.message }),
  });
}
