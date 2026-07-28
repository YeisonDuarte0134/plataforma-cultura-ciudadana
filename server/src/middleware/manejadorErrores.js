import config from '../config.js';

export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

// Manejador de errores central: la API nunca filtra trazas internas en producción.
export function manejadorErrores(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  // Errores de dominio (ErrorHttp): esperados, con código y mensaje seguros.
  if (typeof error.codigo === 'number') {
    return res.status(error.codigo).json({ error: error.message });
  }

  console.error(`[error] ${req.method} ${req.originalUrl}:`, error);

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(config.entorno !== 'production' && { detalle: error.message }),
  });
}
