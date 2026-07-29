import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Inicialización perezosa del Admin SDK: solo cuando se necesita verificar
 * el primer token. Así los comandos que no tocan Firebase (migraciones,
 * pruebas con verificador falso) no exigen credenciales configuradas.
 */
function obtenerAuth() {
  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
  }
  return getAuth();
}

/** Verifica un ID token de Firebase y devuelve { uid, email }. */
export async function verificarIdTokenFirebase(idToken) {
  const decodificado = await obtenerAuth().verifyIdToken(idToken);
  return { uid: decodificado.uid, email: decodificado.email ?? null };
}
