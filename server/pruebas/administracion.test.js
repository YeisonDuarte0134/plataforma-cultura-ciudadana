/**
 * Pruebas de la matriz de permisos (Fase 4): ciudadano / gestor /
 * administrador, incluida la autorización por pertenencia al laboratorio.
 * El verificador falso mapea un token por rol a su usuario de prueba.
 */
import 'dotenv/config';

process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS;

const { default: crearApp } = await import('../src/app.js');
const { default: pool } = await import('../src/db/pool.js');
const { default: request } = await import('supertest');

const CUENTAS = {
  'token-ciudadano': { uid: 'uid-ciudadano', email: 'ciudadano@ejemplo.com' },
  'token-gestor': { uid: 'uid-gestor', email: 'gestor@ejemplo.com' },
  'token-admin': { uid: 'uid-admin', email: 'admin@ejemplo.com' },
};

const app = crearApp({
  verificadorTokens: async (token) => {
    if (CUENTAS[token]) return CUENTAS[token];
    throw new Error('token inválido');
  },
});

const como = (rol) => ['Authorization', `Bearer token-${rol}`];

let labA = null; // asignado al gestor
let labB = null; // ajeno al gestor
let idCiudadano = null;
let idGestor = null;
let idAdmin = null;

beforeEach(async () => {
  await pool.query('TRUNCATE asignaciones_gestor, usuarios RESTART IDENTITY CASCADE');
  await pool.query('DELETE FROM laboratorios');

  const { rows: usuarios } = await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Prueba', 'ciudadano', 'v1', now()),
      ('uid-gestor', 'gestor@ejemplo.com', 'Gestor Prueba', 'gestor', 'v1', now()),
      ('uid-admin', 'admin@ejemplo.com', 'Admin Prueba', 'administrador', 'v1', now())
    RETURNING id, rol
  `);
  [idCiudadano, idGestor, idAdmin] = usuarios.map((u) => u.id);

  const { rows: labs } = await pool.query(`
    INSERT INTO laboratorios (nombre, descripcion, ubicacion) VALUES
      ('Laboratorio A', 'Descripción del laboratorio A', 'Ubicación A, Bucaramanga'),
      ('Laboratorio B', 'Descripción del laboratorio B', 'Ubicación B, Bucaramanga')
    RETURNING id
  `);
  [labA, labB] = labs.map((l) => l.id);

  await pool.query(
    'INSERT INTO asignaciones_gestor (usuario_id, laboratorio_id) VALUES ($1, $2)',
    [idGestor, labA]
  );
});

afterAll(async () => {
  await pool.end();
});

describe('creación de laboratorios (solo admin)', () => {
  const nuevo = {
    nombre: 'Laboratorio Nuevo',
    descripcion: 'Un laboratorio recién creado para pruebas',
    ubicacion: 'Calle Nueva 123, Bucaramanga',
  };

  test('el ciudadano no puede crear (403)', async () => {
    const res = await request(app).post('/api/v1/laboratorios').set(...como('ciudadano')).send(nuevo);
    expect(res.status).toBe(403);
  });

  test('el gestor no puede crear (403)', async () => {
    const res = await request(app).post('/api/v1/laboratorios').set(...como('gestor')).send(nuevo);
    expect(res.status).toBe(403);
  });

  test('el admin crea (201) y valida entradas (400)', async () => {
    const ok = await request(app).post('/api/v1/laboratorios').set(...como('admin')).send(nuevo);
    expect(ok.status).toBe(201);
    expect(ok.body.activo).toBe(true);

    const invalido = await request(app)
      .post('/api/v1/laboratorios')
      .set(...como('admin'))
      .send({ ...nuevo, nombre: 'ab' });
    expect(invalido.status).toBe(400);
  });
});

describe('edición por pertenencia al laboratorio', () => {
  test('el gestor edita su laboratorio asignado (200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/laboratorios/${labA}`)
      .set(...como('gestor'))
      .send({ descripcion: 'Descripción actualizada por el gestor asignado' });
    expect(res.status).toBe(200);
    expect(res.body.descripcion).toBe('Descripción actualizada por el gestor asignado');
  });

  test('el gestor NO edita un laboratorio ajeno (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/laboratorios/${labB}`)
      .set(...como('gestor'))
      .send({ descripcion: 'Intento de edición de laboratorio ajeno' });
    expect(res.status).toBe(403);
  });

  test('el gestor NO puede desactivar ni su propio laboratorio (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/laboratorios/${labA}`)
      .set(...como('gestor'))
      .send({ activo: false });
    expect(res.status).toBe(403);
  });

  test('el admin edita y desactiva cualquier laboratorio (200) y la vitrina lo oculta', async () => {
    const res = await request(app)
      .patch(`/api/v1/laboratorios/${labB}`)
      .set(...como('admin'))
      .send({ activo: false });
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);

    const publica = await request(app).get('/api/v1/laboratorios');
    expect(publica.body.some((l) => l.id === labB)).toBe(false);
  });

  test('el ciudadano no puede editar (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/laboratorios/${labA}`)
      .set(...como('ciudadano'))
      .send({ descripcion: 'Intento de edición por ciudadano' });
    expect(res.status).toBe(403);
  });
});

describe('laboratorios administrables (/mios)', () => {
  test('el gestor solo ve los suyos', async () => {
    const res = await request(app).get('/api/v1/laboratorios/mios').set(...como('gestor'));
    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.id)).toEqual([labA]);
  });

  test('el admin los ve todos', async () => {
    const res = await request(app).get('/api/v1/laboratorios/mios').set(...como('admin'));
    expect(res.body.length).toBe(2);
  });

  test('el ciudadano no accede (403)', async () => {
    const res = await request(app).get('/api/v1/laboratorios/mios').set(...como('ciudadano'));
    expect(res.status).toBe(403);
  });
});

describe('asignación de gestores (solo admin)', () => {
  test('asignar promueve al ciudadano a gestor; revocar la última lo devuelve a ciudadano', async () => {
    const alta = await request(app)
      .post(`/api/v1/laboratorios/${labB}/gestores`)
      .set(...como('admin'))
      .send({ usuarioId: idCiudadano });
    expect(alta.status).toBe(201);

    const { rows: [promovido] } = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1', [idCiudadano]
    );
    expect(promovido.rol).toBe('gestor');

    const baja = await request(app)
      .delete(`/api/v1/laboratorios/${labB}/gestores/${idCiudadano}`)
      .set(...como('admin'));
    expect(baja.status).toBe(200);

    const { rows: [degradado] } = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1', [idCiudadano]
    );
    expect(degradado.rol).toBe('ciudadano');
  });

  test('asignación duplicada responde 409', async () => {
    const res = await request(app)
      .post(`/api/v1/laboratorios/${labA}/gestores`)
      .set(...como('admin'))
      .send({ usuarioId: idGestor });
    expect(res.status).toBe(409);
  });

  test('el gestor no puede asignar gestores (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/laboratorios/${labA}/gestores`)
      .set(...como('gestor'))
      .send({ usuarioId: idCiudadano });
    expect(res.status).toBe(403);
  });
});

describe('administración de usuarios (solo admin)', () => {
  test('el admin busca usuarios por alias o correo', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios?buscar=gestor')
      .set(...como('admin'));
    expect(res.status).toBe(200);
    expect(res.body.some((u) => u.alias === 'Gestor Prueba')).toBe(true);
  });

  test('el ciudadano no puede buscar usuarios (403)', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios?buscar=gestor')
      .set(...como('ciudadano'));
    expect(res.status).toBe(403);
  });

  test('el admin desactiva a un usuario y este ya no puede operar (403)', async () => {
    const baja = await request(app)
      .patch(`/api/v1/usuarios/${idCiudadano}/estado`)
      .set(...como('admin'))
      .send({ estado: 'desactivado' });
    expect(baja.status).toBe(200);
    expect(baja.body.estado).toBe('desactivado');

    const operacion = await request(app).get('/api/v1/usuarios/me').set(...como('ciudadano'));
    expect(operacion.status).toBe(403);
  });

  test('el admin no puede desactivarse a sí mismo (400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/usuarios/${idAdmin}/estado`)
      .set(...como('admin'))
      .send({ estado: 'desactivado' });
    expect(res.status).toBe(400);
  });
});
