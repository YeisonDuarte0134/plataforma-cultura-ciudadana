/**
 * Pruebas de la Fase 9 — configuración de gamificación:
 * autorización exclusiva del administrador, validaciones de reglas,
 * niveles (umbrales desordenados) e insignias, y el criterio central del
 * plan: un cambio de regla rige los eventos posteriores sin alterar los
 * puntajes históricos, porque el motor lee la configuración persistida.
 */
import 'dotenv/config';

process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS;

const { default: crearApp } = await import('../src/app.js');
const { default: pool } = await import('../src/db/pool.js');
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

const NIVELES_VALIDOS = [
  { numero: 1, nombre: 'Inicio', puntosMinimos: 0 },
  { numero: 2, nombre: 'Intermedio', puntosMinimos: 30 },
  { numero: 3, nombre: 'Avanzado', puntosMinimos: 90 },
];

let labA = null;
let tematica = null;
let eventos = []; // dos eventos publicados dentro de la ventana de asistencia

beforeEach(async () => {
  await pool.query(
    'TRUNCATE insignias_otorgadas, puntos_otorgados, evidencias, eventos_participacion, asistencias, inscripciones, actividades, asignaciones_gestor, usuarios RESTART IDENTITY CASCADE'
  );
  await pool.query('DELETE FROM laboratorios');
  await pool.query('DELETE FROM tematicas');

  // Los catálogos del motor vienen de la migración; se restauran los
  // valores que estas pruebas modifican.
  await pool.query("UPDATE reglas_puntos SET puntos = 10 WHERE accion = 'asistencia'");
  await pool.query("UPDATE reglas_puntos SET puntos = 25 WHERE accion = 'reto_aprobado'");
  await pool.query("DELETE FROM insignias WHERE codigo NOT IN ('primera_asistencia', 'primer_reto', 'constancia', 'racha_de_retos', 'exploracion_ciudadana')");
  await pool.query('UPDATE insignias SET activa = true');
  await pool.query('DELETE FROM niveles');
  await pool.query(`
    INSERT INTO niveles (numero, nombre, puntos_minimos) VALUES
      (1, 'Semilla', 0), (2, 'Vecino activo', 50), (3, 'Tejedor de barrio', 150),
      (4, 'Guardián ciudadano', 300), (5, 'Líder de cultura', 600)
  `);

  const { rows: usuarios } = await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Uno', 'ciudadano', 'v1', now()),
      ('uid-ciudadano2', 'ciudadano2@ejemplo.com', 'Ciudadano Dos', 'ciudadano', 'v1', now()),
      ('uid-gestor', 'gestor@ejemplo.com', 'Gestor Prueba', 'gestor', 'v1', now()),
      ('uid-admin', 'admin@ejemplo.com', 'Admin Prueba', 'administrador', 'v1', now())
    RETURNING id
  `);
  const idGestor = usuarios[2].id;

  const { rows: [lab] } = await pool.query(
    "INSERT INTO laboratorios (nombre, descripcion, ubicacion) VALUES ('Laboratorio A', 'Descripción A', 'Ubicación A') RETURNING id"
  );
  labA = lab.id;
  await pool.query('INSERT INTO asignaciones_gestor (usuario_id, laboratorio_id) VALUES ($1, $2)', [idGestor, labA]);

  const { rows: [t] } = await pool.query(
    "INSERT INTO tematicas (nombre) VALUES ('Temática de prueba') RETURNING id"
  );
  tematica = t.id;

  eventos = [];
  for (let i = 0; i < 2; i += 1) {
    const { rows } = await pool.query(
      `INSERT INTO actividades
         (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, fecha_inicio, lugar)
       VALUES ($1, $2, 'evento', 'Evento ${i + 1}', 'Descripción del evento', 'publicada', now(), 'Lugar')
       RETURNING id`,
      [labA, tematica]
    );
    eventos.push(rows[0].id);
  }
});

afterAll(async () => {
  await pool.end();
});

async function asistir(quien, eventoId) {
  await request(app).post('/api/v1/inscripciones').set(...como(quien)).send({ actividadId: eventoId });
  const { body } = await request(app).get(`/api/v1/actividades/${eventoId}/qr`).set(...como('gestor'));
  return request(app).post('/api/v1/asistencias').set(...como(quien)).send({ token: body.token });
}

describe('autorización de la configuración', () => {
  test('solo el administrador accede a la configuración del motor', async () => {
    const admin = await request(app).get('/api/v1/gamificacion/configuracion').set(...como('admin'));
    expect(admin.status).toBe(200);
    expect(admin.body.reglas).toHaveLength(2);
    expect(admin.body.niveles).toHaveLength(5);
    expect(admin.body.insignias.length).toBeGreaterThanOrEqual(5);
    expect(admin.body.insignias[0].criterio).toBeDefined();

    const gestor = await request(app).get('/api/v1/gamificacion/configuracion').set(...como('gestor'));
    expect(gestor.status).toBe(403);

    const ciudadano = await request(app)
      .patch('/api/v1/gamificacion/reglas/asistencia')
      .set(...como('ciudadano'))
      .send({ puntos: 5 });
    expect(ciudadano.status).toBe(403);

    const sinSesion = await request(app).put('/api/v1/gamificacion/niveles').send({ niveles: [] });
    expect(sinSesion.status).toBe(401);
  });
});

describe('reglas de puntos', () => {
  test('el admin cambia los puntos de una regla y las validaciones frenan valores inválidos', async () => {
    const ok = await request(app)
      .patch('/api/v1/gamificacion/reglas/asistencia')
      .set(...como('admin'))
      .send({ puntos: 20 });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ accion: 'asistencia', puntos: 20 });

    for (const puntos of [0, -5, 3.5, 'muchos', null, 10001]) {
      const res = await request(app)
        .patch('/api/v1/gamificacion/reglas/asistencia')
        .set(...como('admin'))
        .send({ puntos });
      expect(res.status).toBe(400);
    }

    const inexistente = await request(app)
      .patch('/api/v1/gamificacion/reglas/subir_foto')
      .set(...como('admin'))
      .send({ puntos: 10 });
    expect(inexistente.status).toBe(404);
  });

  test('el cambio rige los eventos posteriores sin alterar los puntajes históricos', async () => {
    // Evento ANTES del cambio: rige la regla vigente (10 puntos).
    await asistir('ciudadano', eventos[0]);

    await request(app)
      .patch('/api/v1/gamificacion/reglas/asistencia')
      .set(...como('admin'))
      .send({ puntos: 40 });

    // Evento DESPUÉS del cambio: el motor lee la configuración persistida.
    await asistir('ciudadano', eventos[1]);

    const { rows } = await pool.query(
      'SELECT puntos FROM puntos_otorgados ORDER BY id'
    );
    expect(rows.map((r) => r.puntos)).toEqual([10, 40]); // el histórico queda intacto

    const progreso = await request(app).get('/api/v1/gamificacion/mi-progreso').set(...como('ciudadano'));
    expect(progreso.body.puntos).toBe(50);
  });
});

describe('niveles', () => {
  test('el admin reemplaza los niveles y el nuevo esquema rige de inmediato', async () => {
    await asistir('ciudadano', eventos[0]); // 10 puntos

    const res = await request(app)
      .put('/api/v1/gamificacion/niveles')
      .set(...como('admin'))
      .send({ niveles: NIVELES_VALIDOS });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);

    // Con 10 puntos y el esquema nuevo (umbral 30), sigue en el nivel 1
    // pero el nombre y el siguiente nivel ya son los recién definidos.
    const progreso = await request(app).get('/api/v1/gamificacion/mi-progreso').set(...como('ciudadano'));
    expect(progreso.body.nivel.nombre).toBe('Inicio');
    expect(progreso.body.siguienteNivel.nombre).toBe('Intermedio');
    expect(progreso.body.siguienteNivel.faltan).toBe(20);

    // Los puntos otorgados no se recalcularon.
    const { rows } = await pool.query('SELECT SUM(puntos)::int AS total FROM puntos_otorgados');
    expect(rows[0].total).toBe(10);
  });

  test('las validaciones rechazan esquemas de niveles inválidos', async () => {
    const intentar = (niveles) =>
      request(app).put('/api/v1/gamificacion/niveles').set(...como('admin')).send({ niveles });

    // Umbrales desordenados (no crecientes con el nivel).
    const desordenado = await intentar([
      { numero: 1, nombre: 'Inicio', puntosMinimos: 0 },
      { numero: 2, nombre: 'Intermedio', puntosMinimos: 90 },
      { numero: 3, nombre: 'Avanzado', puntosMinimos: 30 },
    ]);
    expect(desordenado.status).toBe(400);
    expect(desordenado.body.error).toMatch(/crecientes/);

    // El primer nivel debe empezar en 0.
    const sinBase = await intentar([
      { numero: 1, nombre: 'Inicio', puntosMinimos: 10 },
      { numero: 2, nombre: 'Intermedio', puntosMinimos: 50 },
    ]);
    expect(sinBase.status).toBe(400);

    // Números no consecutivos o repetidos.
    const saltado = await intentar([
      { numero: 1, nombre: 'Inicio', puntosMinimos: 0 },
      { numero: 3, nombre: 'Avanzado', puntosMinimos: 50 },
    ]);
    expect(saltado.status).toBe(400);

    const repetido = await intentar([
      { numero: 1, nombre: 'Inicio', puntosMinimos: 0 },
      { numero: 1, nombre: 'Otra vez', puntosMinimos: 50 },
    ]);
    expect(repetido.status).toBe(400);

    // Lista vacía y puntos negativos.
    expect((await intentar([])).status).toBe(400);
    expect(
      (await intentar([{ numero: 1, nombre: 'Inicio', puntosMinimos: -5 }])).status
    ).toBe(400);

    // Nada de lo anterior tocó los niveles vigentes.
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM niveles');
    expect(rows[0].total).toBe(5);
  });
});

describe('insignias', () => {
  test('el admin crea una insignia y el motor la otorga con el criterio nuevo', async () => {
    const creada = await request(app)
      .post('/api/v1/gamificacion/insignias')
      .set(...como('admin'))
      .send({
        codigo: 'doble_asistencia',
        nombre: 'Doble asistencia',
        descripcion: 'Asististe a 2 eventos',
        icono: '✌️',
        criterio: { tipo: 'contador', accion: 'asistencia', umbral: 2 },
      });
    expect(creada.status).toBe(201);
    expect(creada.body.activa).toBe(true);

    await asistir('ciudadano', eventos[0]);
    await asistir('ciudadano', eventos[1]);

    const { rows } = await pool.query(
      `SELECT 1 FROM insignias_otorgadas io JOIN insignias i ON i.id = io.insignia_id
        WHERE i.codigo = 'doble_asistencia'`
    );
    expect(rows).toHaveLength(1);
  });

  test('las validaciones frenan códigos y criterios inválidos', async () => {
    const crear = (cuerpo) =>
      request(app).post('/api/v1/gamificacion/insignias').set(...como('admin')).send(cuerpo);

    const base = {
      nombre: 'Insignia de prueba',
      descripcion: 'Descripción de prueba',
      icono: '🏆',
      criterio: { tipo: 'contador', accion: 'asistencia', umbral: 1 },
    };

    expect((await crear({ ...base, codigo: 'Código Inválido' })).status).toBe(400);
    expect((await crear({ ...base, codigo: 'primera_asistencia' })).status).toBe(409);
    expect(
      (await crear({ ...base, codigo: 'ok_codigo', criterio: { tipo: 'racha_semanal', umbral: 1 } })).status
    ).toBe(400);
    expect(
      (await crear({ ...base, codigo: 'ok_codigo', criterio: { tipo: 'contador', accion: 'volar', umbral: 1 } })).status
    ).toBe(400);
    expect(
      (await crear({ ...base, codigo: 'ok_codigo', criterio: { tipo: 'contador', accion: 'asistencia', umbral: 0 } })).status
    ).toBe(400);
  });

  test('el admin edita y desactiva insignias; la desactivada deja de otorgarse', async () => {
    const { rows: [insignia] } = await pool.query(
      "SELECT id FROM insignias WHERE codigo = 'primera_asistencia'"
    );

    const editada = await request(app)
      .patch(`/api/v1/gamificacion/insignias/${insignia.id}`)
      .set(...como('admin'))
      .send({ nombre: 'Debut ciudadano', activa: false });
    expect(editada.status).toBe(200);
    expect(editada.body.nombre).toBe('Debut ciudadano');
    expect(editada.body.activa).toBe(false);

    await asistir('ciudadano', eventos[0]);
    const { rows } = await pool.query('SELECT * FROM insignias_otorgadas');
    expect(rows).toHaveLength(0);

    const sinCambios = await request(app)
      .patch(`/api/v1/gamificacion/insignias/${insignia.id}`)
      .set(...como('admin'))
      .send({});
    expect(sinCambios.status).toBe(400);

    const inexistente = await request(app)
      .patch('/api/v1/gamificacion/insignias/99999')
      .set(...como('admin'))
      .send({ activa: true });
    expect(inexistente.status).toBe(404);
  });
});
