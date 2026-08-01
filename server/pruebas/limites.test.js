/**
 * Pruebas de la Fase 12 — límites de tasa (rate limiting).
 *
 * Los limitadores se saltan en pruebas salvo que PROBAR_LIMITES=1 (esta
 * suite lo activa antes de importar la app y lo limpia al salir, para no
 * contaminar a otras suites que compartan el worker de Jest).
 *
 * El registro se limita por IP (aún no hay sesión); la asistencia por
 * usuario autenticado, porque en un evento presencial muchas personas
 * comparten la IP del lugar.
 */
import 'dotenv/config';

process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS;
process.env.PROBAR_LIMITES = '1';

const { default: crearApp } = await import('../src/app.js');
const { default: pool } = await import('../src/db/pool.js');
const { default: request } = await import('supertest');

const CUENTAS = {
  'token-ciudadano': { uid: 'uid-ciudadano', email: 'ciudadano@ejemplo.com' },
  'token-ciudadano2': { uid: 'uid-ciudadano2', email: 'ciudadano2@ejemplo.com' },
};

const app = crearApp({
  verificadorTokens: async (token) => {
    if (CUENTAS[token]) return CUENTAS[token];
    throw new Error('token inválido');
  },
  almacenArchivos: {},
  cuentasAuth: {},
});

const como = (quien) => ['Authorization', `Bearer token-${quien}`];

beforeAll(async () => {
  await pool.query(
    'TRUNCATE notificaciones, intereses_usuario, insignias_otorgadas, puntos_otorgados, evidencias, eventos_participacion, asistencias, inscripciones, actividades, asignaciones_gestor, usuarios RESTART IDENTITY CASCADE'
  );
  await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Uno', 'ciudadano', 'v1', now()),
      ('uid-ciudadano2', 'ciudadano2@ejemplo.com', 'Ciudadana Dos', 'ciudadano', 'v1', now())
  `);
});

afterAll(async () => {
  delete process.env.PROBAR_LIMITES;
  await pool.end();
});

describe('límites de tasa', () => {
  test('el registro se limita por IP: la petición 11 recibe 429 con mensaje en español', async () => {
    // Las 10 primeras pasan el limitador (fallan después por otra razón).
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post('/api/v1/usuarios/registro').send({});
      expect(res.status).not.toBe(429);
    }

    const bloqueada = await request(app).post('/api/v1/usuarios/registro').send({});
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error).toContain('Demasiados registros');
    expect(bloqueada.headers['ratelimit-policy']).toBeDefined();
  });

  test('la asistencia se limita por usuario: el bloqueo de uno no afecta a otro', async () => {
    // 15 intentos del primer usuario (fallan con 400 por token QR inválido,
    // pero el limitador los cuenta igual); el 16 recibe 429.
    for (let i = 0; i < 15; i += 1) {
      const res = await request(app)
        .post('/api/v1/asistencias')
        .set(...como('ciudadano'))
        .send({ token: 'qr-invalido' });
      expect(res.status).not.toBe(429);
    }

    const bloqueada = await request(app)
      .post('/api/v1/asistencias')
      .set(...como('ciudadano'))
      .send({ token: 'qr-invalido' });
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error).toContain('asistencia');

    // La otra persona, desde la misma IP, sigue pudiendo intentarlo.
    const otra = await request(app)
      .post('/api/v1/asistencias')
      .set(...como('ciudadano2'))
      .send({ token: 'qr-invalido' });
    expect(otra.status).not.toBe(429);
  });
});
