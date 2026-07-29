/**
 * Script de operación (una sola vez por entorno): sube las imágenes de los
 * laboratorios a Firebase Storage y muestra las URLs públicas resultantes.
 *
 * Uso:
 *   node scripts/subir-imagenes-laboratorios.js <carpeta-con-imagenes>
 *
 * Requiere en .env:
 *   GOOGLE_APPLICATION_CREDENTIALS  ruta al JSON de cuenta de servicio (fuera del repo)
 *   FIREBASE_STORAGE_BUCKET         nombre del bucket (p. ej. proyecto.firebasestorage.app)
 *
 * Las URLs usan tokens de descarga de Firebase, por lo que funcionan sin
 * abrir las reglas de seguridad del bucket.
 */
import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const carpeta = process.argv[2];

if (!carpeta) {
  console.error('Uso: node scripts/subir-imagenes-laboratorios.js <carpeta-con-imagenes>');
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !process.env.FIREBASE_STORAGE_BUCKET) {
  console.error(
    'Faltan GOOGLE_APPLICATION_CREDENTIALS y/o FIREBASE_STORAGE_BUCKET en el .env'
  );
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = getStorage().bucket();
const archivos = (await readdir(carpeta)).filter((a) => /\.(jpe?g|png|webp)$/i.test(a));

if (archivos.length === 0) {
  console.error(`No hay imágenes en ${carpeta}`);
  process.exit(1);
}

for (const archivo of archivos) {
  const token = randomUUID();
  const destino = `laboratorios/${archivo}`;

  await bucket.upload(path.join(carpeta, archivo), {
    destination: destino,
    metadata: {
      contentType: `image/${path.extname(archivo).slice(1).replace('jpg', 'jpeg')}`,
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destino)}?alt=media&token=${token}`;
  console.log(`${archivo}\n   ${url}\n`);
}

console.log('Subida completada.');
