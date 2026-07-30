/**
 * Pruebas de la Fase 5: catálogo de temáticas (solo admin), eventos con
 * ciclo de vida (borrador → publicada → cerrada → archivada), permisos por
 * pertenencia al laboratorio y visibilidad de la vitrina pública.
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

let labA = null;
let labB = null;
let idGestor = null;
let tematicaActiva = null;
let tematicaInactiva = null;

function eventoValido(extra = {}) {
  return {
    laboratorioId: labA,
    tematicaId: tematicaActiva,
    titulo: 'Evento de prueba de integración',
    descripcion: 'Descripción suficientemente larga del evento de prueba.',
    fechaInicio: '2026-09-15T15:00:00.000Z',
    lugar: 'Plaza central de pruebas',
    cupo: 20,
    ...extra,
  };
}

beforeEach(async () => {
  await pool.query('TRUNCATE actividades, asignaciones_gestor, usuarios RESTART IDENTITY CASCADE');
  await pool.query('DELETE FROM laboratorios');
  await pool.query('DELETE FROM tematicas');

  const { rows: usuarios } = await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Prueba', 'ciudadano', 'v1', now()),
      ('uid-gestor', 'gestor@ejemplo.com', 'Gestor Prueba', 'gestor', 'v1', now()),
      ('uid-admin', 'admin@ejemplo.com', 'Admin Prueba', 'administrador', 'v1', now())
    RETURNING id
  `);
  idGestor = usuarios[1].id;

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

  const { rows: tematicas } = await pool.query(`
    INSERT INTO tematicas (nombre, activa) VALUES
      ('Temática Activa', true),
      ('Temática Inactiva', false)
    RETURNING id
  `);
  [tematicaActiva, tematicaInactiva] = tematicas.map((t) => t.id);
});

afterAll(async () => {
  await pool.end();
});

describe('catálogo de temáticas', () => {
  test('la lista pública solo muestra temáticas activas, sin autenticación', async () => {
    const res = await request(app).get('/api/v1/tematicas');
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.nombre)).toEqual(['Temática Activa']);
  });

  test('solo el admin crea temáticas; nombre duplicado responde 409', async () => {
    const gestor = await request(app).post('/api/v1/tematicas').set(...como('gestor')).send({ nombre: 'Nueva' });
    expect(gestor.status).toBe(403);

    const admin = await request(app).post('/api/v1/tematicas').set(...como('admin')).send({ nombre: 'Nueva Temática' });
    expect(admin.status).toBe(201);

    const duplicada = await request(app).post('/api/v1/tematicas').set(...como('admin')).send({ nombre: 'nueva temática' });
    expect(duplicada.status).toBe(409);
  });

  test('el admin edita y desactiva temáticas', async () => {
    const res = await request(app)
      .patch(`/api/v1/tematicas/${tematicaActiva}`)
      .set(...como('admin'))
      .send({ activa: false });
    expect(res.status).toBe(200);

    const publicas = await request(app).get('/api/v1/tematicas');
    expect(publicas.body).toHaveLength(0);
  });
});

describe('creación de eventos', () => {
  test('el gestor crea un evento en su laboratorio (201, estado borrador)', async () => {
    const res = await request(app).post('/api/v1/actividades').set(...como('gestor')).send(eventoValido());
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('borrador');
    expect(res.body.tipo).toBe('evento');
    expect(res.body.tematica_nombre).toBe('Temática Activa');
  });

  test('el gestor NO crea eventos en un laboratorio ajeno (403)', async () => {
    const res = await request(app)
      .post('/api/v1/actividades')
      .set(...como('gestor'))
      .send(eventoValido({ laboratorioId: labB }));
    expect(res.status).toBe(403);
  });

  test('el ciudadano no crea eventos (403)', async () => {
    const res = await request(app).post('/api/v1/actividades').set(...como('ciudadano')).send(eventoValido());
    expect(res.status).toBe(403);
  });

  test('toda actividad exige una temática activa (400)', async () => {
    const inactiva = await request(app)
      .post('/api/v1/actividades')
      .set(...como('gestor'))
      .send(eventoValido({ tematicaId: tematicaInactiva }));
    expect(inactiva.status).toBe(400);

    const sinTematica = await request(app)
      .post('/api/v1/actividades')
      .set(...como('gestor'))
      .send(eventoValido({ tematicaId: undefined }));
    expect(sinTematica.status).toBe(400);
  });

  test('valida título corto, fecha inválida y cupo negativo (400)', async () => {
    for (const extra of [{ titulo: 'ab' }, { fechaInicio: 'no-es-fecha' }, { cupo: -5 }]) {
      const res = await request(app).post('/api/v1/actividades').set(...como('gestor')).send(eventoValido(extra));
      expect(res.status).toBe(400);
    }
  });

  test('los retos aún no se pueden crear (400, llegan en la Fase 7)', async () => {
    const res = await request(app)
      .post('/api/v1/actividades')
      .set(...como('gestor'))
      .send(eventoValido({ tipo: 'reto' }));
    expect(res.status).toBe(400);
  });
});

describe('ciclo de vida y vitrina pública', () => {
  async function crearYObtenerId(agente = 'gestor') {
    const res = await request(app).post('/api/v1/actividades').set(...como(agente)).send(eventoValido());
    return res.body.id;
  }

  test('un borrador no aparece en la vitrina ni en el detalle público (404)', async () => {
    const id = await crearYObtenerId();

    const lista = await request(app).get('/api/v1/actividades');
    expect(lista.body).toHaveLength(0);

    const detalle = await request(app).get(`/api/v1/actividades/${id}`);
    expect(detalle.status).toBe(404);
  });

  test('publicar hace visible el evento con su temática y laboratorio', async () => {
    const id = await crearYObtenerId();

    const publicar = await request(app)
      .patch(`/api/v1/actividades/${id}/estado`)
      .set(...como('gestor'))
      .send({ estado: 'publicada' });
    expect(publicar.status).toBe(200);

    const lista = await request(app).get(`/api/v1/actividades?laboratorio=${labA}&tipo=evento`);
    expect(lista.body).toHaveLength(1);
    expect(lista.body[0].laboratorio_nombre).toBe('Laboratorio A');

    const detalle = await request(app).get(`/api/v1/actividades/${id}`);
    expect(detalle.status).toBe(200);
  });

  test('cerrar y archivar la retiran de la vitrina; transiciones inválidas responden 400', async () => {
    const id = await crearYObtenerId();

    // borrador → cerrada es inválida
    const invalida = await request(app)
      .patch(`/api/v1/actividades/${id}/estado`)
      .set(...como('gestor'))
      .send({ estado: 'cerrada' });
    expect(invalida.status).toBe(400);

    await request(app).patch(`/api/v1/actividades/${id}/estado`).set(...como('gestor')).send({ estado: 'publicada' });
    await request(app).patch(`/api/v1/actividades/${id}/estado`).set(...como('gestor')).send({ estado: 'cerrada' });

    const lista = await request(app).get('/api/v1/actividades');
    expect(lista.body).toHaveLength(0);

    // cerrada → publicada es inválida
    const reabrir = await request(app)
      .patch(`/api/v1/actividades/${id}/estado`)
      .set(...como('gestor'))
      .send({ estado: 'publicada' });
    expect(reabrir.status).toBe(400);

    const archivar = await request(app)
      .patch(`/api/v1/actividades/${id}/estado`)
      .set(...como('gestor'))
      .send({ estado: 'archivada' });
    expect(archivar.status).toBe(200);

    // archivada no se edita
    const editar = await request(app)
      .patch(`/api/v1/actividades/${id}`)
      .set(...como('gestor'))
      .send({ titulo: 'Título nuevo tras archivar' });
    expect(editar.status).toBe(400);
  });

  test('el gestor no cambia el estado de actividades de laboratorios ajenos (403)', async () => {
    const res = await request(app).post('/api/v1/actividades').set(...como('admin')).send(eventoValido({ laboratorioId: labB }));
    const cambiar = await request(app)
      .patch(`/api/v1/actividades/${res.body.id}/estado`)
      .set(...como('gestor'))
      .send({ estado: 'publicada' });
    expect(cambiar.status).toBe(403);
  });

  test('el panel lista todas las actividades del laboratorio propio; el ajeno responde 403', async () => {
    await crearYObtenerId();

    const propias = await request(app).get(`/api/v1/actividades/admin?laboratorio=${labA}`).set(...como('gestor'));
    expect(propias.status).toBe(200);
    expect(propias.body).toHaveLength(1);

    const ajenas = await request(app).get(`/api/v1/actividades/admin?laboratorio=${labB}`).set(...como('gestor'));
    expect(ajenas.status).toBe(403);
  });
});
