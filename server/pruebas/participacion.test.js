/**
 * Pruebas de la Fase 6 — API de participación:
 * inscripciones (cupo lleno, concurrencia, cancelación, re-inscripción),
 * asistencia por QR (token válido / manipulado / fuera de ventana, doble
 * registro, sin inscripción), asistencia manual y bitácora auditable.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';

process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS;

const { default: crearApp } = await import('../src/app.js');
const { default: pool } = await import('../src/db/pool.js');
const { default: config } = await import('../src/config.js');
const { default: request } = await import('supertest');

const CUENTAS = {
  'token-ciudadano': { uid: 'uid-ciudadano', email: 'ciudadano@ejemplo.com' },
  'token-ciudadano2': { uid: 'uid-ciudadano2', email: 'ciudadano2@ejemplo.com' },
  'token-gestor': { uid: 'uid-gestor', email: 'gestor@ejemplo.com' },
  'token-admin': { uid: 'uid-admin', email: 'admin@ejemplo.com' },
};

const app = crearApp({
  verificadorTokens: async (token) => {
    if (CUENTAS[token]) return CUENTAS[token];
    throw new Error('token inválido');
  },
});

const como = (quien) => ['Authorization', `Bearer token-${quien}`];

let labA = null;
let labB = null;
let idCiudadano = null;
let idCiudadano2 = null;
let idGestor = null;
let tematica = null;
let eventoAhora = null;   // publicado, dentro de la ventana de asistencia
let eventoFuturo = null;  // publicado, la ventana aún no abre
let eventoBorrador = null;

async function crearEvento({ laboratorioId, estado, fechaInicio, cupo = null }) {
  const { rows } = await pool.query(
    `INSERT INTO actividades
       (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, fecha_inicio, lugar, cupo)
     VALUES ($1, $2, 'evento', 'Evento de prueba', 'Descripción del evento de prueba', $3, $4, 'Lugar de prueba', $5)
     RETURNING id`,
    [laboratorioId, tematica, estado, fechaInicio, cupo]
  );
  return rows[0].id;
}

beforeEach(async () => {
  await pool.query(
    'TRUNCATE eventos_participacion, asistencias, inscripciones, actividades, asignaciones_gestor, usuarios RESTART IDENTITY CASCADE'
  );
  await pool.query('DELETE FROM laboratorios');
  await pool.query('DELETE FROM tematicas');

  const { rows: usuarios } = await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Uno', 'ciudadano', 'v1', now()),
      ('uid-ciudadano2', 'ciudadano2@ejemplo.com', 'Ciudadano Dos', 'ciudadano', 'v1', now()),
      ('uid-gestor', 'gestor@ejemplo.com', 'Gestor Prueba', 'gestor', 'v1', now()),
      ('uid-admin', 'admin@ejemplo.com', 'Admin Prueba', 'administrador', 'v1', now())
    RETURNING id
  `);
  [idCiudadano, idCiudadano2, idGestor] = usuarios.map((u) => u.id);

  const { rows: labs } = await pool.query(`
    INSERT INTO laboratorios (nombre, descripcion, ubicacion) VALUES
      ('Laboratorio A', 'Descripción A', 'Ubicación A'),
      ('Laboratorio B', 'Descripción B', 'Ubicación B')
    RETURNING id
  `);
  [labA, labB] = labs.map((l) => l.id);

  await pool.query('INSERT INTO asignaciones_gestor (usuario_id, laboratorio_id) VALUES ($1, $2)', [idGestor, labA]);

  const { rows: [t] } = await pool.query(
    "INSERT INTO tematicas (nombre) VALUES ('Temática de prueba') RETURNING id"
  );
  tematica = t.id;

  eventoAhora = await crearEvento({ laboratorioId: labA, estado: 'publicada', fechaInicio: new Date().toISOString() });
  eventoFuturo = await crearEvento({
    laboratorioId: labA,
    estado: 'publicada',
    fechaInicio: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  });
  eventoBorrador = await crearEvento({ laboratorioId: labA, estado: 'borrador', fechaInicio: new Date().toISOString() });
});

afterAll(async () => {
  await pool.end();
});

async function inscribir(quien, actividadId) {
  return request(app).post('/api/v1/inscripciones').set(...como(quien)).send({ actividadId });
}

async function obtenerTokenQr(actividadId) {
  const res = await request(app).get(`/api/v1/actividades/${actividadId}/qr`).set(...como('gestor'));
  return res.body.token;
}

describe('inscripciones', () => {
  test('el ciudadano se inscribe a un evento publicado y queda en la bitácora', async () => {
    const res = await inscribir('ciudadano', eventoAhora);
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      "SELECT * FROM eventos_participacion WHERE tipo_evento = 'inscripcion'"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].usuario_id).toBe(idCiudadano);
    expect(rows[0].laboratorio_id).toBe(labA);
  });

  test('no se puede inscribir a un borrador (400) ni dos veces (409)', async () => {
    const borrador = await inscribir('ciudadano', eventoBorrador);
    expect(borrador.status).toBe(400);

    await inscribir('ciudadano', eventoAhora);
    const doble = await inscribir('ciudadano', eventoAhora);
    expect(doble.status).toBe(409);
  });

  test('el cupo se respeta incluso con peticiones concurrentes', async () => {
    const eventoCupo1 = await crearEvento({
      laboratorioId: labA,
      estado: 'publicada',
      fechaInicio: new Date().toISOString(),
      cupo: 1,
    });

    const [r1, r2] = await Promise.all([
      inscribir('ciudadano', eventoCupo1),
      inscribir('ciudadano2', eventoCupo1),
    ]);

    const estados = [r1.status, r2.status].sort();
    expect(estados).toEqual([201, 409]);

    const { rows: [{ activas }] } = await pool.query(
      `SELECT COUNT(*)::int AS activas FROM inscripciones WHERE actividad_id = $1 AND estado = 'activa'`,
      [eventoCupo1]
    );
    expect(activas).toBe(1);
  });

  test('cancelar libera el cupo, queda en la bitácora y permite re-inscribirse', async () => {
    const alta = await inscribir('ciudadano', eventoAhora);

    const cancelar = await request(app)
      .delete(`/api/v1/inscripciones/${alta.body.id}`)
      .set(...como('ciudadano'));
    expect(cancelar.status).toBe(200);

    const { rows } = await pool.query(
      "SELECT tipo_evento FROM eventos_participacion ORDER BY id"
    );
    expect(rows.map((r) => r.tipo_evento)).toEqual(['inscripcion', 'cancelacion_inscripcion']);

    const reinscripcion = await inscribir('ciudadano', eventoAhora);
    expect(reinscripcion.status).toBe(201);
  });

  test('nadie cancela inscripciones ajenas (404 sin revelar existencia)', async () => {
    const alta = await inscribir('ciudadano', eventoAhora);
    const ajena = await request(app)
      .delete(`/api/v1/inscripciones/${alta.body.id}`)
      .set(...como('ciudadano2'));
    expect(ajena.status).toBe(404);
  });

  test('mis inscripciones lista solo las activas propias', async () => {
    await inscribir('ciudadano', eventoAhora);
    await inscribir('ciudadano2', eventoFuturo);

    const res = await request(app).get('/api/v1/inscripciones/mias').set(...como('ciudadano'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].actividad_id).toBe(eventoAhora);
  });
});

describe('código QR de asistencia', () => {
  test('el gestor asignado genera el QR; el ciudadano no (403)', async () => {
    const gestor = await request(app).get(`/api/v1/actividades/${eventoAhora}/qr`).set(...como('gestor'));
    expect(gestor.status).toBe(200);
    expect(gestor.body.token).toBeDefined();
    expect(gestor.body.urlAsistencia).toContain('/asistencia/');

    const ciudadano = await request(app).get(`/api/v1/actividades/${eventoAhora}/qr`).set(...como('ciudadano'));
    expect(ciudadano.status).toBe(403);
  });

  test('asistencia con token válido dentro de la ventana (201) y en la bitácora', async () => {
    await inscribir('ciudadano', eventoAhora);
    const token = await obtenerTokenQr(eventoAhora);

    const res = await request(app).post('/api/v1/asistencias').set(...como('ciudadano')).send({ token });
    expect(res.status).toBe(201);
    expect(res.body.metodo).toBe('qr');

    const { rows } = await pool.query(
      "SELECT usuario_id FROM eventos_participacion WHERE tipo_evento = 'asistencia'"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].usuario_id).toBe(idCiudadano);
  });

  test('un token manipulado o de otro secreto es rechazado (400)', async () => {
    await inscribir('ciudadano', eventoAhora);
    const token = await obtenerTokenQr(eventoAhora);

    const manipulado = await request(app)
      .post('/api/v1/asistencias')
      .set(...como('ciudadano'))
      .send({ token: token.slice(0, -4) + 'xxxx' });
    expect(manipulado.status).toBe(400);

    const otroSecreto = jwt.sign({ act: eventoAhora }, 'otro-secreto', { expiresIn: '1h' });
    const falso = await request(app).post('/api/v1/asistencias').set(...como('ciudadano')).send({ token: otroSecreto });
    expect(falso.status).toBe(400);
  });

  test('el QR fuera de la ventana del evento es rechazado (400)', async () => {
    await inscribir('ciudadano', eventoFuturo);
    // El evento es en 30 días: la ventana aún no abre (nbf en el futuro).
    const anticipado = await obtenerTokenQr(eventoFuturo);
    const res = await request(app).post('/api/v1/asistencias').set(...como('ciudadano')).send({ token: anticipado });
    expect(res.status).toBe(400);

    // Token de un evento ya pasado: exp vencido (se firma directamente para simularlo).
    const vencido = jwt.sign(
      { act: eventoAhora, exp: Math.floor(Date.now() / 1000) - 3600 },
      config.secretoQr
    );
    await inscribir('ciudadano', eventoAhora);
    const tarde = await request(app).post('/api/v1/asistencias').set(...como('ciudadano')).send({ token: vencido });
    expect(tarde.status).toBe(400);
  });

  test('un mismo usuario no registra asistencia dos veces (409)', async () => {
    await inscribir('ciudadano', eventoAhora);
    const token = await obtenerTokenQr(eventoAhora);

    await request(app).post('/api/v1/asistencias').set(...como('ciudadano')).send({ token });
    const doble = await request(app).post('/api/v1/asistencias').set(...como('ciudadano')).send({ token });
    expect(doble.status).toBe(409);

    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM eventos_participacion WHERE tipo_evento = 'asistencia'"
    );
    expect(rows[0].total).toBe(1);
  });

  test('sin inscripción activa no hay asistencia (400)', async () => {
    const token = await obtenerTokenQr(eventoAhora);
    const res = await request(app).post('/api/v1/asistencias').set(...como('ciudadano')).send({ token });
    expect(res.status).toBe(400);
  });
});

describe('asistencia manual y participantes', () => {
  test('el gestor asignado marca asistencia manual a un inscrito', async () => {
    await inscribir('ciudadano', eventoAhora);

    const res = await request(app)
      .post('/api/v1/asistencias/manual')
      .set(...como('gestor'))
      .send({ actividadId: eventoAhora, usuarioId: idCiudadano });
    expect(res.status).toBe(201);
    expect(res.body.metodo).toBe('manual');
  });

  test('un gestor no marca asistencia en eventos de laboratorios ajenos (403)', async () => {
    const eventoAjeno = await crearEvento({ laboratorioId: labB, estado: 'publicada', fechaInicio: new Date().toISOString() });
    await inscribir('ciudadano', eventoAjeno);

    const res = await request(app)
      .post('/api/v1/asistencias/manual')
      .set(...como('gestor'))
      .send({ actividadId: eventoAjeno, usuarioId: idCiudadano });
    expect(res.status).toBe(403);
  });

  test('el gestor ve inscritos con su estado de asistencia; el ciudadano no (403)', async () => {
    await inscribir('ciudadano', eventoAhora);
    await inscribir('ciudadano2', eventoAhora);
    const token = await obtenerTokenQr(eventoAhora);
    await request(app).post('/api/v1/asistencias').set(...como('ciudadano')).send({ token });

    const res = await request(app)
      .get(`/api/v1/actividades/${eventoAhora}/participantes`)
      .set(...como('gestor'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const uno = res.body.find((p) => p.usuario_id === idCiudadano);
    const dos = res.body.find((p) => p.usuario_id === idCiudadano2);
    expect(uno.asistencia_metodo).toBe('qr');
    expect(dos.asistencia_metodo).toBeNull();

    const ciudadano = await request(app)
      .get(`/api/v1/actividades/${eventoAhora}/participantes`)
      .set(...como('ciudadano'));
    expect(ciudadano.status).toBe(403);
  });

  test('el conteo público de inscritos refleja las inscripciones activas', async () => {
    await inscribir('ciudadano', eventoAhora);
    await inscribir('ciudadano2', eventoAhora);

    const res = await request(app).get(`/api/v1/actividades/${eventoAhora}`);
    expect(res.body.inscritos_activos).toBe(2);
  });
});
