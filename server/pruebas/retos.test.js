/**
 * Pruebas de la Fase 7 — retos con evidencia y moderación:
 * creación y edición de retos por el gestor, vitrina pública, envío de
 * evidencia (texto y foto, validaciones por tipo, fecha límite, duplicados),
 * cola de moderación con alcance por laboratorio, aprobación y rechazo con
 * comentario, reenvío tras rechazo y bitácora auditable.
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
  'token-gestorB': { uid: 'uid-gestorB', email: 'gestorb@ejemplo.com' },
  'token-admin': { uid: 'uid-admin', email: 'admin@ejemplo.com' },
};

// Doble del almacén de archivos: registra las subidas y devuelve una URL
// determinista, sin tocar Firebase.
const subidas = [];
const almacenFalso = {
  async subirFotoEvidencia({ ruta, tipoContenido }) {
    subidas.push({ ruta, tipoContenido });
    return `https://almacen.pruebas/${ruta}`;
  },
};

const app = crearApp({
  verificadorTokens: async (token) => {
    if (CUENTAS[token]) return CUENTAS[token];
    throw new Error('token inválido');
  },
  almacenArchivos: almacenFalso,
});

const como = (quien) => ['Authorization', `Bearer token-${quien}`];

// PNG mínimo válido (1x1); multer toma el tipo MIME de la extensión.
const FOTO_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c626001000000ffff030000060005' +
    '57bfabd40000000049454e44ae426082',
  'hex'
);

let labA = null;
let labB = null;
let idCiudadano = null;
let tematica = null;
let retoTexto = null;   // publicado, evidencia de solo texto
let retoFoto = null;    // publicado, evidencia de solo foto
let retoMixto = null;   // publicado, foto y texto
let retoVencido = null; // publicado, fecha límite en el pasado
let retoBorrador = null;
let evento = null;

const TEXTO_VALIDO = 'Organizamos una limpieza del andén con tres vecinos de la cuadra.';

async function crearReto({ laboratorioId, estado = 'publicada', tipoEvidencia, dias = 30 }) {
  const { rows } = await pool.query(
    `INSERT INTO actividades
       (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, puntos, fecha_limite, tipo_evidencia)
     VALUES ($1, $2, 'reto', 'Reto de prueba', 'Descripción del reto de prueba', $3,
             25, current_timestamp + ($4 || ' days')::interval, $5)
     RETURNING id`,
    [laboratorioId, tematica, estado, dias, tipoEvidencia]
  );
  return rows[0].id;
}

beforeEach(async () => {
  subidas.length = 0;
  await pool.query(
    'TRUNCATE evidencias, eventos_participacion, asistencias, inscripciones, actividades, asignaciones_gestor, usuarios RESTART IDENTITY CASCADE'
  );
  await pool.query('DELETE FROM laboratorios');
  await pool.query('DELETE FROM tematicas');

  const { rows: usuarios } = await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Uno', 'ciudadano', 'v1', now()),
      ('uid-ciudadano2', 'ciudadano2@ejemplo.com', 'Ciudadano Dos', 'ciudadano', 'v1', now()),
      ('uid-gestor', 'gestor@ejemplo.com', 'Gestor Prueba', 'gestor', 'v1', now()),
      ('uid-gestorB', 'gestorb@ejemplo.com', 'Gestor B', 'gestor', 'v1', now()),
      ('uid-admin', 'admin@ejemplo.com', 'Admin Prueba', 'administrador', 'v1', now())
    RETURNING id
  `);
  idCiudadano = usuarios[0].id;
  const idGestor = usuarios[2].id;
  const idGestorB = usuarios[3].id;

  const { rows: labs } = await pool.query(`
    INSERT INTO laboratorios (nombre, descripcion, ubicacion) VALUES
      ('Laboratorio A', 'Descripción A', 'Ubicación A'),
      ('Laboratorio B', 'Descripción B', 'Ubicación B')
    RETURNING id
  `);
  [labA, labB] = labs.map((l) => l.id);

  await pool.query(
    'INSERT INTO asignaciones_gestor (usuario_id, laboratorio_id) VALUES ($1, $2), ($3, $4)',
    [idGestor, labA, idGestorB, labB]
  );

  const { rows: [t] } = await pool.query(
    "INSERT INTO tematicas (nombre) VALUES ('Temática de prueba') RETURNING id"
  );
  tematica = t.id;

  retoTexto = await crearReto({ laboratorioId: labA, tipoEvidencia: 'texto' });
  retoFoto = await crearReto({ laboratorioId: labA, tipoEvidencia: 'foto' });
  retoMixto = await crearReto({ laboratorioId: labA, tipoEvidencia: 'foto_y_texto' });
  retoVencido = await crearReto({ laboratorioId: labA, tipoEvidencia: 'texto', dias: -1 });
  retoBorrador = await crearReto({ laboratorioId: labA, tipoEvidencia: 'texto', estado: 'borrador' });

  const { rows: [e] } = await pool.query(
    `INSERT INTO actividades
       (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, fecha_inicio, lugar)
     VALUES ($1, $2, 'evento', 'Evento de prueba', 'Descripción del evento', 'publicada', now(), 'Lugar')
     RETURNING id`,
    [labA, tematica]
  );
  evento = e.id;
});

afterAll(async () => {
  await pool.end();
});

function enviarTexto(quien, actividadId, texto = TEXTO_VALIDO) {
  return request(app)
    .post('/api/v1/evidencias')
    .set(...como(quien))
    .field('actividadId', String(actividadId))
    .field('texto', texto);
}

function moderar(quien, evidenciaId, cuerpo) {
  return request(app)
    .patch(`/api/v1/evidencias/${evidenciaId}`)
    .set(...como(quien))
    .send(cuerpo);
}

describe('creación y edición de retos (panel)', () => {
  test('el gestor crea un reto en borrador con sus campos propios', async () => {
    const res = await request(app)
      .post('/api/v1/actividades')
      .set(...como('gestor'))
      .send({
        laboratorioId: labA,
        tematicaId: tematica,
        tipo: 'reto',
        titulo: 'Reto creado por API',
        descripcion: 'Una descripción suficientemente larga del reto.',
        puntos: 40,
        fechaLimite: new Date(Date.now() + 15 * 24 * 3600_000).toISOString(),
        tipoEvidencia: 'foto_y_texto',
      });

    expect(res.status).toBe(201);
    expect(res.body.tipo).toBe('reto');
    expect(res.body.estado).toBe('borrador');
    expect(res.body.puntos).toBe(40);
    expect(res.body.tipo_evidencia).toBe('foto_y_texto');
    expect(res.body.fecha_inicio).toBeNull();
  });

  test('un reto exige puntos, fecha límite y tipo de evidencia válidos', async () => {
    const base = {
      laboratorioId: labA,
      tematicaId: tematica,
      tipo: 'reto',
      titulo: 'Reto incompleto',
      descripcion: 'Una descripción suficientemente larga del reto.',
    };
    const conCampos = (extra) =>
      request(app).post('/api/v1/actividades').set(...como('gestor')).send({ ...base, ...extra });

    const sinPuntos = await conCampos({ fechaLimite: new Date().toISOString(), tipoEvidencia: 'texto' });
    expect(sinPuntos.status).toBe(400);

    const puntosNegativos = await conCampos({
      puntos: -5,
      fechaLimite: new Date().toISOString(),
      tipoEvidencia: 'texto',
    });
    expect(puntosNegativos.status).toBe(400);

    const evidenciaInvalida = await conCampos({
      puntos: 10,
      fechaLimite: new Date().toISOString(),
      tipoEvidencia: 'video',
    });
    expect(evidenciaInvalida.status).toBe(400);

    const sinFechaLimite = await conCampos({ puntos: 10, tipoEvidencia: 'texto' });
    expect(sinFechaLimite.status).toBe(400);
  });

  test('el gestor edita los campos propios del reto', async () => {
    const nuevaFecha = new Date(Date.now() + 60 * 24 * 3600_000).toISOString();
    const res = await request(app)
      .patch(`/api/v1/actividades/${retoTexto}`)
      .set(...como('gestor'))
      .send({ puntos: 99, fechaLimite: nuevaFecha, tipoEvidencia: 'foto_y_texto' });

    expect(res.status).toBe(200);
    expect(res.body.puntos).toBe(99);
    expect(res.body.tipo_evidencia).toBe('foto_y_texto');
    expect(new Date(res.body.fecha_limite).toISOString()).toBe(nuevaFecha);
  });

  test('la vitrina pública muestra los retos publicados y permite filtrarlos', async () => {
    const todas = await request(app).get('/api/v1/actividades');
    const retos = await request(app).get('/api/v1/actividades?tipo=reto');

    expect(todas.status).toBe(200);
    const ids = todas.body.map((a) => a.id);
    expect(ids).toContain(retoTexto);
    expect(ids).toContain(evento);
    expect(ids).not.toContain(retoBorrador);

    expect(retos.body.every((a) => a.tipo === 'reto')).toBe(true);
    expect(retos.body.map((a) => a.id)).toContain(retoFoto);
  });
});

describe('envío de evidencias', () => {
  test('el ciudadano envía evidencia de texto y queda pendiente en la bitácora', async () => {
    const res = await enviarTexto('ciudadano', retoTexto);

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('pendiente');
    expect(res.body.reenvio).toBe(false);

    const { rows } = await pool.query(
      "SELECT * FROM eventos_participacion WHERE tipo_evento = 'envio_evidencia'"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].usuario_id).toBe(idCiudadano);
    expect(rows[0].laboratorio_id).toBe(labA);
  });

  test('el ciudadano envía evidencia con foto y la URL viene del almacén', async () => {
    const res = await request(app)
      .post('/api/v1/evidencias')
      .set(...como('ciudadano'))
      .field('actividadId', String(retoFoto))
      .attach('foto', FOTO_PNG, 'evidencia.png');

    expect(res.status).toBe(201);
    expect(res.body.foto_url).toMatch(/^https:\/\/almacen\.pruebas\/evidencias\//);
    expect(subidas).toHaveLength(1);
    expect(subidas[0].tipoContenido).toBe('image/png');
  });

  test('el envío respeta el tipo de evidencia exigido por el reto', async () => {
    // El reto mixto exige foto y texto: solo texto no basta.
    const soloTexto = await enviarTexto('ciudadano', retoMixto);
    expect(soloTexto.status).toBe(400);

    // El reto de foto exige el adjunto.
    const sinFoto = await enviarTexto('ciudadano', retoFoto);
    expect(sinFoto.status).toBe(400);

    // El reto de solo texto no admite fotos (evita almacenamiento inútil).
    const fotoDeMas = await request(app)
      .post('/api/v1/evidencias')
      .set(...como('ciudadano'))
      .field('actividadId', String(retoTexto))
      .field('texto', TEXTO_VALIDO)
      .attach('foto', FOTO_PNG, 'evidencia.png');
    expect(fotoDeMas.status).toBe(400);

    // El texto, cuando es obligatorio, tiene longitud mínima.
    const textoCorto = await enviarTexto('ciudadano', retoTexto, 'corto');
    expect(textoCorto.status).toBe(400);

    expect(subidas).toHaveLength(0);
  });

  test('no se puede enviar después de la fecha límite ni a retos no publicados', async () => {
    const vencido = await enviarTexto('ciudadano', retoVencido);
    expect(vencido.status).toBe(400);
    expect(vencido.body.error).toMatch(/fecha límite/i);

    const borrador = await enviarTexto('ciudadano', retoBorrador);
    expect(borrador.status).toBe(400);

    const aEvento = await enviarTexto('ciudadano', evento);
    expect(aEvento.status).toBe(404);
  });

  test('no se admite un segundo envío mientras hay uno pendiente', async () => {
    await enviarTexto('ciudadano', retoTexto);
    const repetido = await enviarTexto('ciudadano', retoTexto);
    expect(repetido.status).toBe(409);
  });

  test('el ciudadano consulta sus envíos con el estado de cada uno', async () => {
    await enviarTexto('ciudadano', retoTexto);

    const res = await request(app).get('/api/v1/evidencias/mias').set(...como('ciudadano'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].estado).toBe('pendiente');
    expect(res.body[0].actividad_id).toBe(retoTexto);
    expect(res.body[0].puntos).toBe(25);

    // Los envíos de otras personas no se mezclan.
    const ajenos = await request(app).get('/api/v1/evidencias/mias').set(...como('ciudadano2'));
    expect(ajenos.body).toHaveLength(0);
  });
});

describe('cola de moderación', () => {
  test('el gestor ve solo las evidencias pendientes de su laboratorio', async () => {
    await enviarTexto('ciudadano', retoTexto);
    await enviarTexto('ciudadano2', retoTexto);

    const res = await request(app)
      .get(`/api/v1/evidencias/pendientes?laboratorio=${labA}`)
      .set(...como('gestor'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].alias).toBeDefined();
    expect(res.body[0].titulo).toBe('Reto de prueba');

    // Un gestor sin asignación sobre el laboratorio no puede ver su cola.
    const ajeno = await request(app)
      .get(`/api/v1/evidencias/pendientes?laboratorio=${labA}`)
      .set(...como('gestorB'));
    expect(ajeno.status).toBe(403);

    // Un ciudadano no accede a la cola.
    const ciudadano = await request(app)
      .get(`/api/v1/evidencias/pendientes?laboratorio=${labA}`)
      .set(...como('ciudadano'));
    expect(ciudadano.status).toBe(403);
  });

  test('el rechazo exige comentario y queda visible para el ciudadano', async () => {
    const envio = await enviarTexto('ciudadano', retoTexto);

    const sinComentario = await moderar('gestor', envio.body.id, { decision: 'rechazar' });
    expect(sinComentario.status).toBe(400);

    const res = await moderar('gestor', envio.body.id, {
      decision: 'rechazar',
      comentario: 'La descripción no menciona a los vecinos involucrados.',
    });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('rechazada');

    const mias = await request(app).get('/api/v1/evidencias/mias').set(...como('ciudadano'));
    expect(mias.body[0].estado).toBe('rechazada');
    expect(mias.body[0].comentario_gestor).toMatch(/vecinos involucrados/);

    const { rows } = await pool.query(
      "SELECT usuario_id FROM eventos_participacion WHERE tipo_evento = 'rechazo_evidencia'"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].usuario_id).toBe(idCiudadano);
  });

  test('tras el rechazo el ciudadano reenvía y vuelve a la cola', async () => {
    const envio = await enviarTexto('ciudadano', retoTexto);
    await moderar('gestor', envio.body.id, {
      decision: 'rechazar',
      comentario: 'Falta detalle de la acción realizada.',
    });

    const reenvio = await enviarTexto(
      'ciudadano',
      retoTexto,
      'Segunda versión: medié en la disputa por el parqueadero entre dos vecinos del edificio.'
    );
    expect(reenvio.status).toBe(201);
    expect(reenvio.body.estado).toBe('pendiente');
    expect(reenvio.body.reenvio).toBe(true);
    expect(reenvio.body.id).toBe(envio.body.id); // reutiliza la fila

    const mias = await request(app).get('/api/v1/evidencias/mias').set(...como('ciudadano'));
    expect(mias.body[0].comentario_gestor).toBeNull();

    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS envios FROM eventos_participacion WHERE tipo_evento = 'envio_evidencia'"
    );
    expect(rows[0].envios).toBe(2);
  });

  test('la aprobación queda en la bitácora y cierra el reto para esa persona', async () => {
    const envio = await enviarTexto('ciudadano', retoTexto);

    const res = await moderar('admin', envio.body.id, { decision: 'aprobar' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('aprobada');

    const { rows } = await pool.query(
      "SELECT usuario_id FROM eventos_participacion WHERE tipo_evento = 'aprobacion_evidencia'"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].usuario_id).toBe(idCiudadano);

    // Ya aprobada, no hay reenvío posible.
    const otroEnvio = await enviarTexto('ciudadano', retoTexto);
    expect(otroEnvio.status).toBe(409);
  });

  test('solo se modera una vez y solo con alcance sobre el laboratorio', async () => {
    const envio = await enviarTexto('ciudadano', retoTexto);

    const decisionInvalida = await moderar('gestor', envio.body.id, { decision: 'archivar' });
    expect(decisionInvalida.status).toBe(400);

    const ajeno = await moderar('gestorB', envio.body.id, { decision: 'aprobar' });
    expect(ajeno.status).toBe(403);

    const ciudadano = await moderar('ciudadano', envio.body.id, { decision: 'aprobar' });
    expect(ciudadano.status).toBe(403);

    await moderar('gestor', envio.body.id, { decision: 'aprobar' });
    const segundaVez = await moderar('gestor', envio.body.id, {
      decision: 'rechazar',
      comentario: 'Cambio de opinión que no debería aplicarse.',
    });
    expect(segundaVez.status).toBe(400);

    const inexistente = await moderar('gestor', 99999, { decision: 'aprobar' });
    expect(inexistente.status).toBe(404);
  });
});
