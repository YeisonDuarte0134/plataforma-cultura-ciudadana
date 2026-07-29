/**
 * Verificación de extremo a extremo contra Firebase REAL (uso puntual en
 * desarrollo): crea una cuenta de prueba en Firebase Auth vía la API REST,
 * completa el registro en la API local, lee y edita el perfil, y al final
 * elimina la cuenta de Firebase y el perfil local.
 *
 * Uso: node scripts/verificar-flujo-autenticacion.js <apiKeyWebDeFirebase>
 */
import 'dotenv/config';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import pg from 'pg';

const API_KEY = process.argv[2];
const API_LOCAL = 'http://localhost:3001';

if (!API_KEY) {
  console.error('Uso: node scripts/verificar-flujo-autenticacion.js <apiKey>');
  process.exit(1);
}

const correo = `prueba.e2e.${Date.now()}@ejemplo.com`;
const contrasena = 'Prueba-1234';
let uid = null;

function verificar(nombre, condicion, detalle = '') {
  console.log(`${condicion ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) process.exitCode = 1;
}

try {
  // 1. Cuenta real en Firebase Auth (API REST de Identity Toolkit).
  const resAlta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo, password: contrasena, returnSecureToken: true }),
    }
  );
  const alta = await resAlta.json();
  uid = alta.localId;
  const idToken = alta.idToken;
  verificar('Cuenta creada en Firebase Auth', Boolean(idToken), correo);

  // 2. Sin token la API rechaza.
  const sinToken = await fetch(`${API_LOCAL}/api/v1/usuarios/me`);
  verificar('GET /me sin token responde 401', sinToken.status === 401);

  // 3. Registro sin consentimiento → 400.
  const sinConsentimiento = await fetch(`${API_LOCAL}/api/v1/usuarios/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ alias: 'Prueba E2E', aceptaConsentimiento: false }),
  });
  verificar('Registro sin consentimiento responde 400', sinConsentimiento.status === 400);

  // 4. Registro válido → 201 (token real verificado por firebase-admin).
  const registro = await fetch(`${API_LOCAL}/api/v1/usuarios/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ alias: 'Prueba E2E', avatar: '🌳', aceptaConsentimiento: true }),
  });
  const perfil = await registro.json();
  verificar(
    'Registro con token real responde 201',
    registro.status === 201,
    `rol=${perfil.rol}, consentimiento=${perfil.consentimiento_version}`
  );

  // 5. GET /me → 200.
  const me = await fetch(`${API_LOCAL}/api/v1/usuarios/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const datosMe = await me.json();
  verificar('GET /me responde 200 con el perfil', me.status === 200 && datosMe.alias === 'Prueba E2E');

  // 6. PATCH /me → 200.
  const cambio = await fetch(`${API_LOCAL}/api/v1/usuarios/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ alias: 'Prueba E2E Editada' }),
  });
  const editado = await cambio.json();
  verificar('PATCH /me actualiza el alias', cambio.status === 200 && editado.alias === 'Prueba E2E Editada');

  // 7. Token manipulado → 401.
  const tokenMalo = await fetch(`${API_LOCAL}/api/v1/usuarios/me`, {
    headers: { Authorization: `Bearer ${idToken.slice(0, -4)}xxxx` },
  });
  verificar('Token manipulado responde 401', tokenMalo.status === 401);
} finally {
  // Limpieza: cuenta de Firebase y fila local.
  if (uid) {
    initializeApp({ credential: applicationDefault() });
    await getAuth().deleteUser(uid);
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('DELETE FROM usuarios WHERE firebase_uid = $1', [uid]);
    await pool.end();
    console.log('Limpieza completada (cuenta y perfil de prueba eliminados).');
  }
}
