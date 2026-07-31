import { randomUUID } from 'node:crypto';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import config from './config.js';

/**
 * Inicialización perezosa del Admin SDK: solo cuando se necesita verificar
 * el primer token o subir el primer archivo. Así los comandos que no tocan
 * Firebase (migraciones, pruebas con dobles falsos) no exigen credenciales
 * configuradas.
 */
function obtenerApp() {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      ...(config.bucketStorage && { storageBucket: config.bucketStorage }),
    });
  }
}

/** Verifica un ID token de Firebase y devuelve { uid, email }. */
export async function verificarIdTokenFirebase(idToken) {
  obtenerApp();
  const decodificado = await getAuth().verifyIdToken(idToken);
  return { uid: decodificado.uid, email: decodificado.email ?? null };
}

/**
 * Almacén de archivos de producción (inyectable en crearApp; en pruebas se
 * usa un doble que no toca la red). Sube el archivo a Firebase Storage y
 * devuelve una URL de descarga con token, el mismo esquema de las imágenes
 * de laboratorios: funciona sin abrir las reglas del bucket.
 */
export const almacenFirebase = {
  async subirFotoEvidencia({ buffer, tipoContenido, ruta }) {
    obtenerApp();
    const bucket = getStorage().bucket();
    const token = randomUUID();

    await bucket.file(ruta).save(buffer, {
      metadata: {
        contentType: tipoContenido,
        cacheControl: 'private, max-age=3600',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(ruta)}?alt=media&token=${token}`;
  },
};
