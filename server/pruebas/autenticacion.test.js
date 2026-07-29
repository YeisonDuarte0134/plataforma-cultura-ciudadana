/**
 * Pruebas de integración del control de acceso (Fase 3).
 *
 * Verifican comportamiento externo observable de la API: códigos de
 * respuesta y efectos en los datos, nunca detalles internos. El
 * verificador de tokens es un doble de pruebas inyectado en la fábrica
 * de la app: el token "token-valido" autentica al usuario de prueba y
 * cualquier otro valor es rechazado, sin depender de firebase-admin.
 */
import 'dotenv/config';

// La app de pruebas usa la base de datos de pruebas (preparada en pretest).
process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS;

const { default: crearApp } = await import('../src/app.js');
const { default: pool } = await import('../src/db/pool.js');
const { default: request } = await import('supertest');

const USUARIO_PRUEBA = { uid: 'uid-de-prueba', email: 'prueba@ejemplo.com' };

const verificadorFalso = async (token) => {
  if (token === 'token-valido') return USUARIO_PRUEBA;
  throw new Error('token inválido');
};

const app = crearApp({ verificadorTokens: verificadorFalso });

const REGISTRO_VALIDO = {
  alias: 'Ciudadana Prueba',
  avatar: '🌳',
  aceptaConsentimiento: true,
};

beforeEach(async () => {
  await pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('acceso sin autenticación', () => {
  test('GET /api/v1/usuarios/me responde 401 sin token', async () => {
    const res = await request(app).get('/api/v1/usuarios/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test('GET /api/v1/usuarios/me responde 401 con token inválido', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios/me')
      .set('Authorization', 'Bearer token-falsificado');
    expect(res.status).toBe(401);
  });

  test('POST /api/v1/usuarios/registro responde 401 sin token', async () => {
    const res = await request(app)
      .post('/api/v1/usuarios/registro')
      .send(REGISTRO_VALIDO);
    expect(res.status).toBe(401);
  });

  test('la vitrina pública sigue accesible sin token', async () => {
    const res = await request(app).get('/api/v1/laboratorios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('registro con consentimiento informado', () => {
  test('rechaza el registro sin aceptar el consentimiento (400)', async () => {
    const res = await request(app)
      .post('/api/v1/usuarios/registro')
      .set('Authorization', 'Bearer token-valido')
      .send({ alias: 'Ciudadana Prueba', aceptaConsentimiento: false });
    expect(res.status).toBe(400);
  });

  test('crea el perfil con rol ciudadano y consentimiento fechado (201)', async () => {
    const res = await request(app)
      .post('/api/v1/usuarios/registro')
      .set('Authorization', 'Bearer token-valido')
      .send(REGISTRO_VALIDO);

    expect(res.status).toBe(201);
    expect(res.body.rol).toBe('ciudadano');
    expect(res.body.estado).toBe('activo');
    expect(res.body.consentimiento_version).toBeTruthy();
    expect(res.body.consentimiento_fecha).toBeTruthy();
    expect(res.body.correo).toBe(USUARIO_PRUEBA.email);
  });

  test('no permite registrar dos veces la misma cuenta (409)', async () => {
    const auth = ['Authorization', 'Bearer token-valido'];
    await request(app).post('/api/v1/usuarios/registro').set(...auth).send(REGISTRO_VALIDO);
    const res = await request(app)
      .post('/api/v1/usuarios/registro')
      .set(...auth)
      .send(REGISTRO_VALIDO);
    expect(res.status).toBe(409);
  });

  test('rechaza alias inválidos (400)', async () => {
    const res = await request(app)
      .post('/api/v1/usuarios/registro')
      .set('Authorization', 'Bearer token-valido')
      .send({ alias: '<script>', aceptaConsentimiento: true });
    expect(res.status).toBe(400);
  });
});

describe('perfil propio', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/v1/usuarios/registro')
      .set('Authorization', 'Bearer token-valido')
      .send(REGISTRO_VALIDO);
  });

  test('GET /me devuelve el perfil del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios/me')
      .set('Authorization', 'Bearer token-valido');
    expect(res.status).toBe(200);
    expect(res.body.alias).toBe(REGISTRO_VALIDO.alias);
    expect(res.body.avatar).toBe(REGISTRO_VALIDO.avatar);
  });

  test('PATCH /me actualiza alias, avatar y teléfono', async () => {
    const res = await request(app)
      .patch('/api/v1/usuarios/me')
      .set('Authorization', 'Bearer token-valido')
      .send({ alias: 'Nuevo Alias', avatar: '🚲', telefono: '+57 3001234567' });
    expect(res.status).toBe(200);
    expect(res.body.alias).toBe('Nuevo Alias');
    expect(res.body.avatar).toBe('🚲');
  });

  test('PATCH /me rechaza un avatar fuera del catálogo (400)', async () => {
    const res = await request(app)
      .patch('/api/v1/usuarios/me')
      .set('Authorization', 'Bearer token-valido')
      .send({ avatar: '💣' });
    expect(res.status).toBe(400);
  });

  test('una cuenta desactivada no puede operar (403)', async () => {
    await pool.query(
      "UPDATE usuarios SET estado = 'desactivado' WHERE firebase_uid = $1",
      [USUARIO_PRUEBA.uid]
    );
    const res = await request(app)
      .get('/api/v1/usuarios/me')
      .set('Authorization', 'Bearer token-valido');
    expect(res.status).toBe(403);
  });
});
