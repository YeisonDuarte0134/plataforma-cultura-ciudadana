/**
 * Pruebas de integración de la Fase 8 — motor de gamificación:
 * otorgamiento automático de puntos al asistir (regla) y al aprobarse un
 * reto (puntos del reto), idempotencia garantizada por la BD, insignias
 * por criterios de datos, perfil gamificado (nivel, insignias, historial)
 * y rankings públicos anonimizados (general y por laboratorio).
 */
import 'dotenv/config';

process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS;

const { default: crearApp } = await import('../src/app.js');
const { default: pool } = await import('../src/db/pool.js');
const { default: request } = await import('supertest');
const { procesarEventoGamificacion } = await import('../src/repositorios/gamificacion.repositorio.js');

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
  almacenArchivos: {
    async subirFotoEvidencia({ ruta }) {
      return `https://almacen.pruebas/${ruta}`;
    },
  },
});

const como = (quien) => ['Authorization', `Bearer token-${quien}`];

let labA = null;
let labB = null;
let idCiudadano = null;
let tematicas = [];
let eventoA = null; // labA, dentro de la ventana de asistencia
let eventoB = null; // labB, dentro de la ventana de asistencia
let retos = []; // tres retos en labA con temáticas distintas (30, 20 y 15 puntos)

beforeEach(async () => {
  await pool.query(
    'TRUNCATE insignias_otorgadas, puntos_otorgados, evidencias, eventos_participacion, asistencias, inscripciones, actividades, asignaciones_gestor, usuarios RESTART IDENTITY CASCADE'
  );
  await pool.query('DELETE FROM laboratorios');
  await pool.query('DELETE FROM tematicas');
  // Los catálogos del motor vienen de la migración; solo se restauran los
  // ajustes que alguna prueba pudo cambiar.
  await pool.query('UPDATE insignias SET activa = true');

  const { rows: usuarios } = await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Uno', 'ciudadano', 'v1', now()),
      ('uid-ciudadano2', 'ciudadano2@ejemplo.com', 'Ciudadano Dos', 'ciudadano', 'v1', now()),
      ('uid-gestor', 'gestor@ejemplo.com', 'Gestor Prueba', 'gestor', 'v1', now()),
      ('uid-admin', 'admin@ejemplo.com', 'Admin Prueba', 'administrador', 'v1', now())
    RETURNING id
  `);
  idCiudadano = usuarios[0].id;
  const idGestor = usuarios[2].id;

  const { rows: labs } = await pool.query(`
    INSERT INTO laboratorios (nombre, descripcion, ubicacion) VALUES
      ('Laboratorio A', 'Descripción A', 'Ubicación A'),
      ('Laboratorio B', 'Descripción B', 'Ubicación B')
    RETURNING id
  `);
  [labA, labB] = labs.map((l) => l.id);

  await pool.query(
    'INSERT INTO asignaciones_gestor (usuario_id, laboratorio_id) VALUES ($1, $2), ($1, $3)',
    [idGestor, labA, labB]
  );

  const { rows: filasTematicas } = await pool.query(`
    INSERT INTO tematicas (nombre) VALUES ('Temática uno'), ('Temática dos'), ('Temática tres')
    RETURNING id
  `);
  tematicas = filasTematicas.map((t) => t.id);

  const crearEvento = async (laboratorioId) => {
    const { rows } = await pool.query(
      `INSERT INTO actividades
         (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, fecha_inicio, lugar)
       VALUES ($1, $2, 'evento', 'Evento de prueba', 'Descripción del evento', 'publicada', now(), 'Lugar')
       RETURNING id`,
      [laboratorioId, tematicas[0]]
    );
    return rows[0].id;
  };
  eventoA = await crearEvento(labA);
  eventoB = await crearEvento(labB);

  retos = [];
  const puntosPorReto = [30, 20, 15];
  for (const [indice, puntos] of puntosPorReto.entries()) {
    const { rows } = await pool.query(
      `INSERT INTO actividades
         (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, puntos, fecha_limite, tipo_evidencia)
       VALUES ($1, $2, 'reto', 'Reto ${indice + 1}', 'Descripción del reto de prueba', 'publicada',
               $3, current_timestamp + interval '30 days', 'texto')
       RETURNING id`,
      [labA, tematicas[indice], puntos]
    );
    retos.push(rows[0].id);
  }
});

afterAll(async () => {
  await pool.end();
});

/** Flujo completo de asistencia: inscripción, QR del gestor y escaneo. */
async function asistir(quien, eventoId) {
  await request(app).post('/api/v1/inscripciones').set(...como(quien)).send({ actividadId: eventoId });
  const { body } = await request(app).get(`/api/v1/actividades/${eventoId}/qr`).set(...como('gestor'));
  return request(app).post('/api/v1/asistencias').set(...como(quien)).send({ token: body.token });
}

/** Flujo completo de reto: envío de evidencia y aprobación del gestor. */
async function aprobarReto(quien, retoId) {
  const envio = await request(app)
    .post('/api/v1/evidencias')
    .set(...como(quien))
    .field('actividadId', String(retoId))
    .field('texto', 'Evidencia de prueba con el detalle suficiente para ser válida.');
  return request(app)
    .patch(`/api/v1/evidencias/${envio.body.id}`)
    .set(...como('gestor'))
    .send({ decision: 'aprobar' });
}

describe('otorgamiento de puntos', () => {
  test('asistir a un evento otorga los puntos de la regla, ligados al evento de la bitácora', async () => {
    const res = await asistir('ciudadano', eventoA);
    expect(res.status).toBe(201);

    const { rows } = await pool.query('SELECT * FROM puntos_otorgados');
    expect(rows).toHaveLength(1);
    expect(rows[0].usuario_id).toBe(idCiudadano);
    expect(rows[0].accion).toBe('asistencia');
    expect(rows[0].puntos).toBe(10); // regla semilla
    expect(rows[0].laboratorio_id).toBe(labA);

    const { rows: [bitacora] } = await pool.query(
      "SELECT id FROM eventos_participacion WHERE tipo_evento = 'asistencia'"
    );
    expect(rows[0].evento_participacion_id).toBe(bitacora.id);
  });

  test('la aprobación de un reto otorga los puntos propios del reto', async () => {
    const res = await aprobarReto('ciudadano', retos[0]);
    expect(res.status).toBe(200);

    const { rows } = await pool.query("SELECT * FROM puntos_otorgados WHERE accion = 'reto_aprobado'");
    expect(rows).toHaveLength(1);
    expect(rows[0].puntos).toBe(30); // los del reto, no los 25 de la regla
  });

  test('inscribirse, enviar evidencia o ser rechazado no otorga puntos', async () => {
    await request(app).post('/api/v1/inscripciones').set(...como('ciudadano')).send({ actividadId: eventoA });

    const envio = await request(app)
      .post('/api/v1/evidencias')
      .set(...como('ciudadano'))
      .field('actividadId', String(retos[0]))
      .field('texto', 'Evidencia que será rechazada por el gestor de prueba.');
    await request(app)
      .patch(`/api/v1/evidencias/${envio.body.id}`)
      .set(...como('gestor'))
      .send({ decision: 'rechazar', comentario: 'Falta detalle para aprobarla.' });

    const { rows } = await pool.query('SELECT * FROM puntos_otorgados');
    expect(rows).toHaveLength(0);
  });
});

describe('idempotencia', () => {
  test('reprocesar el mismo evento de participación no duplica puntos ni insignias', async () => {
    await asistir('ciudadano', eventoA);

    const { rows: [evento] } = await pool.query(
      "SELECT * FROM eventos_participacion WHERE tipo_evento = 'asistencia'"
    );
    const { rows: [actividad] } = await pool.query(
      'SELECT id, laboratorio_id, tematica_id, puntos FROM actividades WHERE id = $1',
      [evento.actividad_id]
    );

    // Reprocesamiento explícito del mismo evento, dos veces más.
    const cliente = await pool.connect();
    try {
      const primera = await procesarEventoGamificacion(cliente, evento, actividad);
      const segunda = await procesarEventoGamificacion(cliente, evento, actividad);
      expect(primera).toBeNull();
      expect(segunda).toBeNull();
    } finally {
      cliente.release();
    }

    const { rows: puntos } = await pool.query('SELECT * FROM puntos_otorgados');
    const { rows: insignias } = await pool.query('SELECT * FROM insignias_otorgadas');
    expect(puntos).toHaveLength(1);
    expect(insignias).toHaveLength(1); // solo "Primera asistencia"
  });

  test('la restricción de la BD impide duplicar el otorgamiento aunque se intente a mano', async () => {
    await asistir('ciudadano', eventoA);
    const { rows: [otorgado] } = await pool.query('SELECT * FROM puntos_otorgados');

    await expect(
      pool.query(
        `INSERT INTO puntos_otorgados
           (usuario_id, evento_participacion_id, actividad_id, laboratorio_id, tematica_id, accion, puntos)
         VALUES ($1, $2, $3, $4, $5, 'asistencia', 10)`,
        [otorgado.usuario_id, otorgado.evento_participacion_id, otorgado.actividad_id, otorgado.laboratorio_id, otorgado.tematica_id]
      )
    ).rejects.toMatchObject({ code: '23505' }); // unique_violation
  });
});

describe('insignias', () => {
  test('la primera asistencia y el primer reto otorgan sus insignias', async () => {
    await asistir('ciudadano', eventoA);
    await aprobarReto('ciudadano', retos[0]);

    const { rows } = await pool.query(
      `SELECT i.codigo FROM insignias_otorgadas io JOIN insignias i ON i.id = io.insignia_id
        WHERE io.usuario_id = $1 ORDER BY i.codigo`,
      [idCiudadano]
    );
    expect(rows.map((r) => r.codigo)).toEqual(['primer_reto', 'primera_asistencia']);
  });

  test('tres retos aprobados otorgan la racha y, con temáticas distintas, la exploración', async () => {
    for (const reto of retos) {
      const res = await aprobarReto('ciudadano', reto);
      expect(res.status).toBe(200);
    }

    const { rows } = await pool.query(
      `SELECT i.codigo FROM insignias_otorgadas io JOIN insignias i ON i.id = io.insignia_id
        WHERE io.usuario_id = $1`,
      [idCiudadano]
    );
    const codigos = rows.map((r) => r.codigo);
    expect(codigos).toContain('racha_de_retos');
    expect(codigos).toContain('exploracion_ciudadana');
    expect(codigos).toContain('primer_reto');
  });

  test('una insignia desactivada no se otorga', async () => {
    await pool.query("UPDATE insignias SET activa = false WHERE codigo = 'primera_asistencia'");
    await asistir('ciudadano', eventoA);

    const { rows } = await pool.query('SELECT * FROM insignias_otorgadas');
    expect(rows).toHaveLength(0);
  });
});

describe('perfil gamificado', () => {
  test('mi-progreso reúne puntos, nivel, siguiente nivel, insignias e historial', async () => {
    await asistir('ciudadano', eventoA); // 10
    await aprobarReto('ciudadano', retos[0]); // 30
    await aprobarReto('ciudadano', retos[1]); // 20 → total 60: nivel 2

    const res = await request(app).get('/api/v1/gamificacion/mi-progreso').set(...como('ciudadano'));
    expect(res.status).toBe(200);
    expect(res.body.puntos).toBe(60);
    expect(res.body.nivel.numero).toBe(2);
    expect(res.body.nivel.nombre).toBe('Vecino activo');
    expect(res.body.siguienteNivel.numero).toBe(3);
    expect(res.body.siguienteNivel.faltan).toBe(90);

    const obtenidas = res.body.insignias.filter((i) => i.obtenida).map((i) => i.codigo);
    expect(obtenidas).toContain('primera_asistencia');
    expect(obtenidas).toContain('primer_reto');
    const catalogo = res.body.insignias.map((i) => i.codigo);
    expect(catalogo).toContain('racha_de_retos'); // las no obtenidas también se listan

    expect(res.body.historial).toHaveLength(3);
    expect(res.body.historial[0].actividad_titulo).toBeDefined();
    expect(res.body.historial.map((h) => h.puntos).sort((a, b) => a - b)).toEqual([10, 20, 30]);
  });

  test('el progreso exige sesión', async () => {
    const res = await request(app).get('/api/v1/gamificacion/mi-progreso');
    expect(res.status).toBe(401);
  });
});

describe('ranking público', () => {
  test('ordena por puntos, es anónimo y sin sesión', async () => {
    await aprobarReto('ciudadano', retos[0]); // 30
    await asistir('ciudadano2', eventoA); // 10
    await asistir('ciudadano2', eventoB); // 10 → 20

    const res = await request(app).get('/api/v1/gamificacion/ranking');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual({
      posicion: 1,
      alias: 'Ciudadano Uno',
      avatar: null,
      puntos: 30,
      nivel: 'Semilla',
    }); // sin correo ni ids: datos anonimizados
    expect(res.body[1].alias).toBe('Ciudadano Dos');
    expect(res.body[1].puntos).toBe(20);
  });

  test('el ranking por laboratorio solo suma los puntos ganados en él', async () => {
    await aprobarReto('ciudadano', retos[0]); // 30 en labA
    await asistir('ciudadano2', eventoB); // 10 en labB

    const resA = await request(app).get(`/api/v1/gamificacion/ranking?laboratorio=${labA}`);
    expect(resA.body).toHaveLength(1);
    expect(resA.body[0].alias).toBe('Ciudadano Uno');

    const resB = await request(app).get(`/api/v1/gamificacion/ranking?laboratorio=${labB}`);
    expect(resB.body).toHaveLength(1);
    expect(resB.body[0].alias).toBe('Ciudadano Dos');

    const inexistente = await request(app).get('/api/v1/gamificacion/ranking?laboratorio=99999');
    expect(inexistente.status).toBe(404);
  });

  test('una cuenta desactivada desaparece del ranking', async () => {
    await asistir('ciudadano', eventoA);
    await pool.query("UPDATE usuarios SET estado = 'desactivado' WHERE id = $1", [idCiudadano]);

    const res = await request(app).get('/api/v1/gamificacion/ranking');
    expect(res.body).toHaveLength(0);
  });
});
