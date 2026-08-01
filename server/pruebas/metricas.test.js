/**
 * Pruebas de integración de la Fase 10 — métricas y reportes.
 *
 * La bitácora se inserta a mano con fechas controladas para que el dataset
 * sea conocido y los cálculos verificables a ojo:
 *
 *   Laboratorio A
 *     Evento uno (temática 1, julio): 3 inscritos (c1, c2, c3), 2 asistentes
 *       (c1, c2) y una cancelación (c3)         → tasa de asistencia 66.7 %
 *     Evento antiguo (temática 1, junio): 1 inscrito y 1 asistente (c1)
 *     Reto uno (temática 2, julio): 2 envíos (c1, c2), 1 aprobación (c1)
 *       y 1 rechazo (c2)                        → tasa de finalización 50 %
 *   Laboratorio B
 *     Evento B (temática 3, julio): 1 inscrito y 1 asistente (c2)
 *   Laboratorio C: sin actividad (debe aparecer en la comparativa con ceros)
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
  almacenArchivos: {
    async subirFotoEvidencia({ ruta }) {
      return `https://almacen.pruebas/${ruta}`;
    },
  },
});

const como = (quien) => ['Authorization', `Bearer token-${quien}`];

const JUNIO = '2026-06-10T10:00:00';
const JULIO = '2026-07-20T10:00:00';

let labA = null;
let labB = null;
let labC = null;
let c1 = null;
let c2 = null;
let c3 = null;
let tematicas = [];
let eventoUno = null;
let eventoAntiguo = null;
let retoUno = null;

async function crearActividad(laboratorioId, tematicaId, tipo, titulo) {
  const columnas =
    tipo === 'evento'
      ? "'publicada', now(), 'Lugar', NULL, NULL, NULL"
      : "'publicada', NULL, NULL, 40, current_timestamp + interval '30 days', 'texto'";
  const { rows } = await pool.query(
    `INSERT INTO actividades
       (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado,
        fecha_inicio, lugar, puntos, fecha_limite, tipo_evidencia)
     VALUES ($1, $2, $3, $4, 'Descripción de prueba', ${columnas})
     RETURNING id, laboratorio_id, tematica_id`,
    [laboratorioId, tematicaId, tipo, titulo]
  );
  return rows[0];
}

/** Inserta un evento de la bitácora con la fecha indicada. */
function anotarBitacora(usuarioId, actividad, tipoEvento, fecha) {
  return pool.query(
    `INSERT INTO eventos_participacion
       (usuario_id, actividad_id, laboratorio_id, tematica_id, tipo_evento, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [usuarioId, actividad.id, actividad.laboratorio_id, actividad.tematica_id, tipoEvento, fecha]
  );
}

beforeEach(async () => {
  await pool.query(
    'TRUNCATE insignias_otorgadas, puntos_otorgados, evidencias, eventos_participacion, asistencias, inscripciones, actividades, asignaciones_gestor, usuarios RESTART IDENTITY CASCADE'
  );
  await pool.query('DELETE FROM laboratorios');
  await pool.query('DELETE FROM tematicas');

  const { rows: usuarios } = await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Uno', 'ciudadano', 'v1', now()),
      ('uid-ciudadana2', 'ciudadana2@ejemplo.com', 'Ciudadana Dos', 'ciudadano', 'v1', now()),
      ('uid-ciudadano3', 'ciudadano3@ejemplo.com', 'Ciudadano Tres', 'ciudadano', 'v1', now()),
      ('uid-gestor', 'gestor@ejemplo.com', 'Gestor Prueba', 'gestor', 'v1', now()),
      ('uid-admin', 'admin@ejemplo.com', 'Admin Prueba', 'administrador', 'v1', now())
    RETURNING id
  `);
  [c1, c2, c3] = usuarios.slice(0, 3).map((u) => u.id);
  const idGestor = usuarios[3].id;

  const { rows: labs } = await pool.query(`
    INSERT INTO laboratorios (nombre, descripcion, ubicacion) VALUES
      ('Laboratorio A', 'Descripción A', 'Ubicación A'),
      ('Laboratorio B', 'Descripción B', 'Ubicación B'),
      ('Laboratorio C', 'Descripción C', 'Ubicación C')
    RETURNING id
  `);
  [labA, labB, labC] = labs.map((l) => l.id);

  // El gestor de prueba solo administra el laboratorio A.
  await pool.query(
    'INSERT INTO asignaciones_gestor (usuario_id, laboratorio_id) VALUES ($1, $2)',
    [idGestor, labA]
  );

  const { rows: filasTematicas } = await pool.query(`
    INSERT INTO tematicas (nombre) VALUES ('Temática uno'), ('Temática dos'), ('Temática tres')
    RETURNING id
  `);
  tematicas = filasTematicas.map((t) => t.id);

  eventoUno = await crearActividad(labA, tematicas[0], 'evento', 'Evento uno');
  eventoAntiguo = await crearActividad(labA, tematicas[0], 'evento', 'Evento antiguo');
  retoUno = await crearActividad(labA, tematicas[1], 'reto', 'Reto uno');
  const eventoB = await crearActividad(labB, tematicas[2], 'evento', 'Evento B');

  // Laboratorio A, julio: asistencia al Evento uno.
  await anotarBitacora(c1, eventoUno, 'inscripcion', JULIO);
  await anotarBitacora(c2, eventoUno, 'inscripcion', JULIO);
  await anotarBitacora(c3, eventoUno, 'inscripcion', JULIO);
  await anotarBitacora(c3, eventoUno, 'cancelacion_inscripcion', JULIO);
  await anotarBitacora(c1, eventoUno, 'asistencia', JULIO);
  await anotarBitacora(c2, eventoUno, 'asistencia', JULIO);

  // Laboratorio A, junio: el evento antiguo (para el filtro de fechas).
  await anotarBitacora(c1, eventoAntiguo, 'inscripcion', JUNIO);
  await anotarBitacora(c1, eventoAntiguo, 'asistencia', JUNIO);

  // Laboratorio A, julio: el reto.
  await anotarBitacora(c1, retoUno, 'envio_evidencia', JULIO);
  await anotarBitacora(c2, retoUno, 'envio_evidencia', JULIO);
  await anotarBitacora(c1, retoUno, 'aprobacion_evidencia', JULIO);
  await anotarBitacora(c2, retoUno, 'rechazo_evidencia', JULIO);

  // Laboratorio B, julio.
  await anotarBitacora(c2, eventoB, 'inscripcion', JULIO);
  await anotarBitacora(c2, eventoB, 'asistencia', JULIO);
});

afterAll(async () => {
  await pool.end();
});

describe('permisos', () => {
  test('las métricas exigen sesión', async () => {
    const res = await request(app).get(`/api/v1/metricas/laboratorios/${labA}`);
    expect(res.status).toBe(401);
  });

  test('un ciudadano no puede ver métricas', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}`)
      .set(...como('ciudadano'));
    expect(res.status).toBe(403);
  });

  test('un gestor no asignado al laboratorio recibe 403', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labB}`)
      .set(...como('gestor'));
    expect(res.status).toBe(403);
  });

  test('las métricas globales son exclusivas del administrador', async () => {
    const res = await request(app).get('/api/v1/metricas/globales').set(...como('gestor'));
    expect(res.status).toBe(403);
  });

  test('un laboratorio inexistente devuelve 404', async () => {
    const res = await request(app)
      .get('/api/v1/metricas/laboratorios/99999')
      .set(...como('admin'));
    expect(res.status).toBe(404);
  });
});

describe('métricas del laboratorio (dataset conocido)', () => {
  test('resumen, asistencia, finalización de retos y preferencias temáticas', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}`)
      .set(...como('gestor'));
    expect(res.status).toBe(200);

    // Resumen: c1, c2 y c3 participaron (la cancelación no borra la inscripción).
    expect(res.body.resumen).toEqual({
      participantes_activos: 3,
      eventos_totales: 12,
      inscripciones: 4,
      cancelaciones: 1,
      asistencias: 3,
      envios_evidencia: 2,
      aprobaciones: 1,
      rechazos: 1,
    });

    // Asistencia por evento: 3 inscritos y 2 asistentes en el Evento uno.
    expect(res.body.asistencia.inscritos).toBe(4);
    expect(res.body.asistencia.asistentes).toBe(3);
    const eventoPrincipal = res.body.asistencia.porEvento.find((e) => e.titulo === 'Evento uno');
    expect(eventoPrincipal).toMatchObject({ inscritos: 3, asistentes: 2, tasa: 66.7 });
    const antiguo = res.body.asistencia.porEvento.find((e) => e.titulo === 'Evento antiguo');
    expect(antiguo).toMatchObject({ inscritos: 1, asistentes: 1, tasa: 100 });

    // Retos: 2 participantes, 1 finalizado → 50 %.
    expect(res.body.retos.porReto).toHaveLength(1);
    expect(res.body.retos.porReto[0]).toMatchObject({
      titulo: 'Reto uno',
      participantes: 2,
      finalizados: 1,
      tasa: 50,
    });

    // Preferencias temáticas: la cancelación no cuenta como participación.
    const porNombre = Object.fromEntries(res.body.tematicas.map((t) => [t.nombre, t]));
    expect(porNombre['Temática uno']).toMatchObject({ participaciones: 7, participantes: 3 });
    expect(porNombre['Temática dos']).toMatchObject({ participaciones: 4, participantes: 2 });
    expect(porNombre['Temática tres']).toBeUndefined(); // es del laboratorio B
  });

  test('el reporte no expone datos individuales identificables', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}`)
      .set(...como('admin'));
    const crudo = JSON.stringify(res.body);
    expect(crudo).not.toContain('usuario_id');
    expect(crudo).not.toContain('@ejemplo.com');
    expect(crudo).not.toContain('Ciudadano Uno');
  });
});

describe('filtros', () => {
  test('el rango de fechas excluye lo que quedó fuera', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}?desde=2026-07-01`)
      .set(...como('gestor'));
    expect(res.status).toBe(200);
    // El evento antiguo (junio) desaparece del reporte.
    expect(res.body.asistencia.porEvento.map((e) => e.titulo)).toEqual(['Evento uno']);
    expect(res.body.resumen.eventos_totales).toBe(10);
  });

  test("'hasta' es inclusivo: el día exacto del evento antiguo lo conserva", async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}?hasta=2026-06-10`)
      .set(...como('gestor'));
    expect(res.body.asistencia.porEvento.map((e) => e.titulo)).toEqual(['Evento antiguo']);
    expect(res.body.resumen).toMatchObject({ inscripciones: 1, asistencias: 1 });
  });

  test('el filtro por actividad aísla sus números', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}?actividad=${retoUno.id}`)
      .set(...como('gestor'));
    expect(res.body.resumen).toMatchObject({
      participantes_activos: 2,
      envios_evidencia: 2,
      inscripciones: 0,
    });
    expect(res.body.asistencia.porEvento).toHaveLength(0);
  });

  test('el filtro por temática aísla sus números', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}?tematica=${tematicas[0]}`)
      .set(...como('gestor'));
    expect(res.body.retos.porReto).toHaveLength(0); // el reto es de la temática dos
    expect(res.body.tematicas).toHaveLength(1);
    expect(res.body.tematicas[0].nombre).toBe('Temática uno');
  });

  test('una fecha mal formada o un rango invertido devuelven 400', async () => {
    const malFormada = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}?desde=20-07-2026`)
      .set(...como('gestor'));
    expect(malFormada.status).toBe(400);

    const invertido = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}?desde=2026-07-31&hasta=2026-07-01`)
      .set(...como('gestor'));
    expect(invertido.status).toBe(400);
    expect(invertido.body.error).toContain('rango de fechas');
  });
});

describe('métricas globales del administrador', () => {
  test('consolidado y comparativa entre laboratorios, con ceros para el vacío', async () => {
    const res = await request(app).get('/api/v1/metricas/globales').set(...como('admin'));
    expect(res.status).toBe(200);

    // Consolidado: toda la plataforma (laboratorios A y B).
    expect(res.body.resumen).toMatchObject({
      participantes_activos: 3,
      inscripciones: 5,
      asistencias: 4,
      envios_evidencia: 2,
      aprobaciones: 1,
    });

    const porNombre = Object.fromEntries(res.body.laboratorios.map((l) => [l.nombre, l]));
    expect(porNombre['Laboratorio A']).toMatchObject({
      participantes_activos: 3,
      inscritos: 3,
      asistentes: 2,
      participantes_retos: 2,
      retos_finalizados: 1,
      tasa_finalizacion: 50,
    });
    expect(porNombre['Laboratorio B']).toMatchObject({
      participantes_activos: 1,
      inscritos: 1,
      asistentes: 1,
      tasa_asistencia: 100,
    });
    // El laboratorio sin actividad no desaparece de la comparación.
    expect(porNombre['Laboratorio C']).toMatchObject({
      participantes_activos: 0,
      inscritos: 0,
      tasa_asistencia: null,
      tasa_finalizacion: null,
    });
  });

  test('el filtro de fechas también aplica al consolidado global', async () => {
    const res = await request(app)
      .get('/api/v1/metricas/globales?desde=2026-07-01')
      .set(...como('admin'));
    expect(res.body.resumen.inscripciones).toBe(4); // sin la de junio
    const laboratorioA = res.body.laboratorios.find((l) => l.nombre === 'Laboratorio A');
    expect(laboratorioA.asistentes).toBe(2); // sin la asistencia de junio
  });
});

describe('exportación CSV', () => {
  test('el dashboard del laboratorio se descarga como CSV con los agregados visibles', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}?formato=csv`)
      .set(...como('gestor'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain(`metricas-laboratorio-${labA}.csv`);

    expect(res.text).toContain('Asistencia a convocatorias');
    expect(res.text).toContain('Evento uno,publicada,3,2,66.7');
    expect(res.text).toContain('Reto uno,publicada,2,1,50');
    expect(res.text).toContain('Temática uno,7,3');
    expect(res.text).toContain('Participantes activos,3');
  });

  test('el CSV respeta los filtros aplicados y los declara', async () => {
    const res = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}?formato=csv&desde=2026-07-01`)
      .set(...como('gestor'));
    expect(res.text).toContain('2026-07-01');
    expect(res.text).not.toContain('Evento antiguo');
  });

  test('las métricas globales también se exportan', async () => {
    const res = await request(app)
      .get('/api/v1/metricas/globales?formato=csv')
      .set(...como('admin'));
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('metricas-globales.csv');
    expect(res.text).toContain('Comparativa entre laboratorios');
    expect(res.text).toContain('Laboratorio C,sí,0,0,0');
  });
});
