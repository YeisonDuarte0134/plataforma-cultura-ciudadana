import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

/**
 * Fase 12 — límites de tasa (rate limiting) en los puntos sensibles.
 *
 * Dos estrategias de identificación:
 * - Por IP: para lo que ocurre antes de tener sesión (el registro).
 * - Por usuario autenticado (uid del token): para las acciones con sesión.
 *   En un evento presencial decenas de personas comparten la IP del lugar;
 *   limitar el escaneo del QR por IP bloquearía a asistentes legítimos.
 *
 * En las pruebas los límites se saltan (NODE_ENV=test), salvo que la suite
 * de límites pida probarlos con PROBAR_LIMITES=1.
 */
function crearLimitador({ ventanaMinutos, maximo, mensaje, porUsuario = false }) {
  return rateLimit({
    windowMs: ventanaMinutos * 60 * 1000,
    limit: maximo,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test' && process.env.PROBAR_LIMITES !== '1',
    ...(porUsuario && {
      keyGenerator: (req) => req.autenticado?.uid ?? ipKeyGenerator(req.ip),
    }),
    handler: (req, res) => {
      res.status(429).json({ error: mensaje });
    },
  });
}

/** Tope general de la API por IP: holgado para el uso normal de la SPA. */
export const limitadorGlobal = crearLimitador({
  ventanaMinutos: 15,
  maximo: 600,
  mensaje: 'Demasiadas peticiones desde esta dirección; espera unos minutos',
});

/** Creación de cuentas por IP: frena el registro masivo automatizado. */
export const limitadorRegistro = crearLimitador({
  ventanaMinutos: 15,
  maximo: 10,
  mensaje: 'Demasiados registros desde esta dirección; espera unos minutos',
});

/** Escaneos de asistencia por usuario: nadie asiste 15 veces en 5 minutos. */
export const limitadorAsistencias = crearLimitador({
  ventanaMinutos: 5,
  maximo: 15,
  mensaje: 'Demasiados intentos de registrar asistencia; espera unos minutos',
  porUsuario: true,
});

/** Envíos de evidencia por usuario. */
export const limitadorEvidencias = crearLimitador({
  ventanaMinutos: 15,
  maximo: 20,
  mensaje: 'Demasiados envíos de evidencia; espera unos minutos',
  porUsuario: true,
});

/** Acciones de Habeas Data por usuario: no admiten ráfagas legítimas. */
export const limitadorHabeasData = crearLimitador({
  ventanaMinutos: 15,
  maximo: 5,
  mensaje: 'Demasiadas solicitudes sobre tu cuenta; espera unos minutos',
  porUsuario: true,
});
