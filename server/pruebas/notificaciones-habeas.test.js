/**
 * Pruebas de integración de la Fase 11 — notificaciones internas,
 * temáticas de interés y Habeas Data:
 *
 * - Los intereses del perfil se reemplazan como conjunto y solo admiten
 *   temáticas activas.
 * - Publicar una actividad notifica únicamente a las personas activas
 *   interesadas en su temática; moderar una evidencia notifica al dueño;
 *   una insignia recién otorgada también notifica — todo dentro de la
 *   transacción del hecho que lo produce.
 * - La baja voluntaria desactiva la cuenta; la eliminación definitiva
 *   anonimiza el perfil, borra el contenido personal (incluidas la cuenta
 *   de Firebase y las fotos del almacén, vía dobles) y conserva la
 *   bitácora: las métricas agregadas no cambian.
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

// Dobles de los sistemas externos: registran las llamadas para que las
// pruebas verifiquen que la eliminación realmente los invoca.
const cuentasEliminadas = [];
const fotosEliminadas = [];

const app = crearApp({
  verificadorTokens: async (token) => {
    if (CUENTAS[token]) return CUENTAS[token];
    throw new Error('token inválido');
  },
  almacenArchivos: {
    async subirFotoEvidencia({ ruta }) {
      return `https://almacen.pruebas/o/${encodeURIComponent(ruta)}?alt=media&token=falso`;
    },
    async eliminarFotoPorUrl(url) {
      fotosEliminadas.push(url);
    },
  },
  cuentasAuth: {
    async eliminarCuenta(uid) {
      cuentasEliminadas.push(uid);
    },
  },
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
let idCiudadano = null;
let idCiudadano2 = null;
let tematicas = [];
let eventoA = null; // labA, temática 1, dentro de la ventana de asistencia
let retoFoto = null; // labA, temática 2, evidencia de foto

beforeEach(async () => {
  cuentasEliminadas.length = 0;
  fotosEliminadas.length = 0;

  await pool.query(
    'TRUNCATE notificaciones, intereses_usuario, insignias_otorgadas, puntos_otorgados, evidencias, eventos_participacion, asistencias, inscripciones, actividades, asignaciones_gestor, usuarios RESTART IDENTITY CASCADE'
  );
  await pool.query('DELETE FROM laboratorios');
  await pool.query('DELETE FROM tematicas');
  // Catálogos del motor: se restauran los valores que otras suites cambian.
  await pool.query('UPDATE insignias SET activa = true');
  await pool.query("UPDATE reglas_puntos SET puntos = 10 WHERE accion = 'asistencia'");
  await pool.query("DELETE FROM insignias WHERE codigo NOT IN ('primera_asistencia', 'primer_reto', 'constancia', 'racha_de_retos', 'exploracion_ciudadana')");

  const { rows: usuarios } = await pool.query(`
    INSERT INTO usuarios (firebase_uid, correo, alias, rol, consentimiento_version, consentimiento_fecha) VALUES
      ('uid-ciudadano', 'ciudadano@ejemplo.com', 'Ciudadano Uno', 'ciudadano', 'v1', now()),
      ('uid-ciudadano2', 'ciudadano2@ejemplo.com', 'Ciudadana Dos', 'ciudadano', 'v1', now()),
      ('uid-gestor', 'gestor@ejemplo.com', 'Gestor Prueba', 'gestor', 'v1', now()),
      ('uid-admin', 'admin@ejemplo.com', 'Admin Prueba', 'administrador', 'v1', now())
    RETURNING id
  `);
  [idCiudadano, idCiudadano2] = usuarios.slice(0, 2).map((u) => u.id);
  const idGestor = usuarios[2].id;

  const { rows: labs } = await pool.query(`
    INSERT INTO laboratorios (nombre, descripcion, ubicacion)
    VALUES ('Laboratorio A', 'Descripción A', 'Ubicación A') RETURNING id
  `);
  labA = labs[0].id;

  await pool.query(
    'INSERT INTO asignaciones_gestor (usuario_id, laboratorio_id) VALUES ($1, $2)',
    [idGestor, labA]
  );

  const { rows: filasTematicas } = await pool.query(`
    INSERT INTO tematicas (nombre) VALUES ('Temática uno'), ('Temática dos'), ('Temática tres')
    RETURNING id
  `);
  tematicas = filasTematicas.map((t) => t.id);

  const { rows: [evento] } = await pool.query(
    `INSERT INTO actividades
       (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, fecha_inicio, lugar)
     VALUES ($1, $2, 'evento', 'Evento de prueba', 'Descripción del evento', 'publicada', now(), 'Lugar')
     RETURNING id`,
    [labA, tematicas[0]]
  );
  eventoA = evento.id;

  const { rows: [reto] } = await pool.query(
    `INSERT INTO actividades
       (laboratorio_id, tematica_id, tipo, titulo, descripcion, estado, puntos, fecha_limite, tipo_evidencia)
     VALUES ($1, $2, 'reto', 'Reto con foto', 'Descripción del reto de prueba', 'publicada',
             40, current_timestamp + interval '30 days', 'foto')
     RETURNING id`,
    [labA, tematicas[1]]
  );
  retoFoto = reto.id;
});

afterAll(async () => {
  await pool.end();
});

/** Define los intereses de una persona vía API. */
function elegirIntereses(quien, ids) {
  return request(app).put('/api/v1/usuarios/me/intereses').set(...como(quien)).send({ tematicas: ids });
}

/** Crea (como gestor) una actividad en borrador y la publica. */
async function crearYPublicarActividad(tematicaId, titulo) {
  const creada = await request(app)
    .post('/api/v1/actividades')
    .set(...como('gestor'))
    .send({
      laboratorioId: labA,
      tematicaId,
      tipo: 'evento',
      titulo,
      descripcion: 'Descripción suficiente para la actividad de prueba.',
      fechaInicio: new Date().toISOString(),
      lugar: 'Lugar de prueba',
    });
  expect(creada.status).toBe(201);
  const publicada = await request(app)
    .patch(`/api/v1/actividades/${creada.body.id}/estado`)
    .set(...como('gestor'))
    .send({ estado: 'publicada' });
  expect(publicada.status).toBe(200);
  return creada.body.id;
}

/** Flujo completo de asistencia con QR. */
async function asistir(quien, eventoId) {
  await request(app).post('/api/v1/inscripciones').set(...como(quien)).send({ actividadId: eventoId });
  const { body } = await request(app).get(`/api/v1/actividades/${eventoId}/qr`).set(...como('gestor'));
  return request(app).post('/api/v1/asistencias').set(...como(quien)).send({ token: body.token });
}

/** Envía evidencia con foto y la modera. */
async function enviarYModerar(quien, retoId, decision, comentario) {
  const envio = await request(app)
    .post('/api/v1/evidencias')
    .set(...como(quien))
    .field('actividadId', String(retoId))
    .attach('foto', FOTO_PNG, 'evidencia.png');
  expect(envio.status).toBe(201);
  return request(app)
    .patch(`/api/v1/evidencias/${envio.body.id}`)
    .set(...como('gestor'))
    .send({ decision, ...(comentario && { comentario }) });
}

describe('temáticas de interés', () => {
  test('el conjunto se reemplaza completo y se consulta', async () => {
    const primera = await elegirIntereses('ciudadano', [tematicas[0], tematicas[1]]);
    expect(primera.status).toBe(200);
    expect(primera.body.map((t) => t.nombre).sort()).toEqual(['Temática dos', 'Temática uno']);

    // La segunda selección reemplaza, no acumula.
    await elegirIntereses('ciudadano', [tematicas[2]]);
    const consulta = await request(app).get('/api/v1/usuarios/me/intereses').set(...como('ciudadano'));
    expect(consulta.body).toHaveLength(1);
    expect(consulta.body[0].nombre).toBe('Temática tres');
  });

  test('rechaza temáticas inexistentes o cuerpo inválido', async () => {
    const inexistente = await elegirIntereses('ciudadano', [99999]);
    expect(inexistente.status).toBe(400);

    const invalido = await request(app)
      .put('/api/v1/usuarios/me/intereses')
      .set(...como('ciudadano'))
      .send({ tematicas: 'no-es-arreglo' });
    expect(invalido.status).toBe(400);
  });

  test('los intereses exigen sesión', async () => {
    const res = await request(app).get('/api/v1/usuarios/me/intereses');
    expect(res.status).toBe(401);
  });
});

describe('notificaciones por nueva actividad', () => {
  test('publicar notifica solo a las personas interesadas en la temática', async () => {
    await elegirIntereses('ciudadano', [tematicas[2]]); // interesado en T3
    await elegirIntereses('ciudadano2', [tematicas[0]]); // interesada en T1

    await crearYPublicarActividad(tematicas[2], 'Actividad de la temática tres');

    const deInteresado = await request(app).get('/api/v1/notificaciones').set(...como('ciudadano'));
    expect(deInteresado.body.noLeidas).toBe(1);
    expect(deInteresado.body.notificaciones[0].tipo).toBe('nueva_actividad');
    expect(deInteresado.body.notificaciones[0].mensaje).toContain('Actividad de la temática tres');

    const deNoInteresada = await request(app).get('/api/v1/notificaciones').set(...como('ciudadano2'));
    expect(deNoInteresada.body.noLeidas).toBe(0);
    expect(deNoInteresada.body.notificaciones).toHaveLength(0);
  });

  test('una cuenta desactivada no recibe notificaciones nuevas', async () => {
    await elegirIntereses('ciudadano', [tematicas[2]]);
    await pool.query("UPDATE usuarios SET estado = 'desactivado' WHERE id = $1", [idCiudadano]);

    await crearYPublicarActividad(tematicas[2], 'Actividad que no debe avisar');

    const { rows } = await pool.query(
      "SELECT * FROM notificaciones WHERE usuario_id = $1 AND tipo = 'nueva_actividad'",
      [idCiudadano]
    );
    expect(rows).toHaveLength(0);
  });
});

describe('notificaciones por moderación e insignias', () => {
  test('la aprobación notifica el resultado y la insignia obtenida', async () => {
    const res = await enviarYModerar('ciudadano', retoFoto, 'aprobar');
    expect(res.status).toBe(200);

    const bandeja = await request(app).get('/api/v1/notificaciones').set(...como('ciudadano'));
    const tipos = bandeja.body.notificaciones.map((n) => n.tipo).sort();
    expect(tipos).toEqual(['evidencia_aprobada', 'insignia_otorgada']);
    const aprobacion = bandeja.body.notificaciones.find((n) => n.tipo === 'evidencia_aprobada');
    expect(aprobacion.mensaje).toContain('Reto con foto');
    const insignia = bandeja.body.notificaciones.find((n) => n.tipo === 'insignia_otorgada');
    expect(insignia.mensaje).toContain('«');
  });

  test('el rechazo notifica sin otorgar insignias', async () => {
    const res = await enviarYModerar('ciudadano', retoFoto, 'rechazar', 'Falta detalle en la foto.');
    expect(res.status).toBe(200);

    const bandeja = await request(app).get('/api/v1/notificaciones').set(...como('ciudadano'));
    expect(bandeja.body.notificaciones.map((n) => n.tipo)).toEqual(['evidencia_rechazada']);
  });

  test('marcar leídas deja la bandeja en cero sin borrarla', async () => {
    await enviarYModerar('ciudadano', retoFoto, 'aprobar');

    const marcado = await request(app).patch('/api/v1/notificaciones/leidas').set(...como('ciudadano'));
    expect(marcado.status).toBe(200);
    expect(marcado.body.marcadas).toBe(2);

    const bandeja = await request(app).get('/api/v1/notificaciones').set(...como('ciudadano'));
    expect(bandeja.body.noLeidas).toBe(0);
    expect(bandeja.body.notificaciones).toHaveLength(2);
    expect(bandeja.body.notificaciones.every((n) => n.leida)).toBe(true);
  });

  test('la bandeja exige sesión', async () => {
    const res = await request(app).get('/api/v1/notificaciones');
    expect(res.status).toBe(401);
  });
});

describe('Habeas Data: baja voluntaria', () => {
  test('la baja desactiva la cuenta y la sesión deja de servir', async () => {
    const baja = await request(app).post('/api/v1/usuarios/me/baja').set(...como('ciudadano'));
    expect(baja.status).toBe(200);

    const { rows: [usuario] } = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [idCiudadano]);
    expect(usuario.estado).toBe('desactivado');

    // El perfil sigue existiendo, pero la API rechaza a la cuenta desactivada.
    const despues = await request(app).get('/api/v1/usuarios/me').set(...como('ciudadano'));
    expect(despues.status).toBe(403);
  });
});

describe('Habeas Data: eliminación definitiva', () => {
  test('sin la confirmación explícita responde 400 y no borra nada', async () => {
    const res = await request(app).delete('/api/v1/usuarios/me').set(...como('ciudadano'));
    expect(res.status).toBe(400);
    const { rows: [usuario] } = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [idCiudadano]);
    expect(usuario.estado).toBe('activo');
  });

  test('anonimiza el perfil, borra lo personal y conserva la bitácora (las métricas no cambian)', async () => {
    // La persona participa de verdad: asiste al evento y completa el reto.
    await asistir('ciudadano', eventoA);
    await enviarYModerar('ciudadano', retoFoto, 'aprobar');
    await elegirIntereses('ciudadano', [tematicas[0]]);

    const metricasAntes = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}`)
      .set(...como('admin'));

    const res = await request(app)
      .delete('/api/v1/usuarios/me')
      .set(...como('ciudadano'))
      .send({ confirmacion: 'ELIMINAR' });
    expect(res.status).toBe(200);

    // El perfil queda anonimizado con estado terminal.
    const { rows: [usuario] } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [idCiudadano]);
    expect(usuario.estado).toBe('eliminado');
    expect(usuario.alias).toBe('[cuenta eliminada]');
    expect(usuario.correo).not.toContain('ciudadano@ejemplo.com');
    expect(usuario.firebase_uid).toBe(`eliminado-${idCiudadano}`);
    expect(usuario.avatar).toBeNull();

    // El contenido personal desaparece; la bitácora y el libro mayor no.
    const conteos = async (tabla) => {
      const { rows: [fila] } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM ${tabla} WHERE usuario_id = $1`,
        [idCiudadano]
      );
      return fila.n;
    };
    expect(await conteos('evidencias')).toBe(0);
    expect(await conteos('intereses_usuario')).toBe(0);
    expect(await conteos('notificaciones')).toBe(0);
    expect(await conteos('inscripciones')).toBe(0);
    expect(await conteos('asistencias')).toBe(0);
    expect(await conteos('eventos_participacion')).toBeGreaterThan(0);
    expect(await conteos('puntos_otorgados')).toBe(2); // asistencia + reto

    // Los sistemas externos recibieron la orden de borrado.
    expect(cuentasEliminadas).toEqual(['uid-ciudadano']);
    expect(fotosEliminadas).toHaveLength(1);

    // Esa sesión ya no encuentra perfil.
    const despues = await request(app).get('/api/v1/usuarios/me').set(...como('ciudadano'));
    expect(despues.status).toBe(404);

    // Criterio de la fase: las métricas agregadas históricas no se corrompen.
    const metricasDespues = await request(app)
      .get(`/api/v1/metricas/laboratorios/${labA}`)
      .set(...como('admin'));
    expect(metricasDespues.body.resumen).toEqual(metricasAntes.body.resumen);
    expect(metricasDespues.body.tematicas).toEqual(metricasAntes.body.tematicas);
  });

  test('la persona eliminada desaparece del ranking y de la administración', async () => {
    await asistir('ciudadano', eventoA);
    await request(app)
      .delete('/api/v1/usuarios/me')
      .set(...como('ciudadano'))
      .send({ confirmacion: 'ELIMINAR' });

    const ranking = await request(app).get('/api/v1/gamificacion/ranking');
    expect(ranking.body).toHaveLength(0);

    const busqueda = await request(app)
      .get('/api/v1/usuarios?buscar=eliminada')
      .set(...como('admin'));
    expect(busqueda.body).toHaveLength(0);

    const reactivacion = await request(app)
      .patch(`/api/v1/usuarios/${idCiudadano}/estado`)
      .set(...como('admin'))
      .send({ estado: 'activo' });
    expect(reactivacion.status).toBe(400);
  });
});
