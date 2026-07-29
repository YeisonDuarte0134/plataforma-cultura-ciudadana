/**
 * Asigna a cada laboratorio semilla su imagen alojada en Firebase Storage
 * (bucket plataforma-cultura-ciudadana.firebasestorage.app, carpeta
 * laboratorios/, subidas con scripts/subir-imagenes-laboratorios.js).
 *
 * Las fotografías provienen de Wikimedia Commons con licencias libres;
 * los créditos de autor están documentados en el README (sección
 * "Créditos de imágenes").
 */

const IMAGENES = {
  'Laboratorio Ciudadano Parque de los Niños':
    'https://firebasestorage.googleapis.com/v0/b/plataforma-cultura-ciudadana.firebasestorage.app/o/laboratorios%2Fparque-de-los-ninos.jpg?alt=media&token=3641437a-776a-4a79-a33c-2cc9bfc5adf9',
  'Laboratorio de Cultura Ciudadana Café Madrid':
    'https://firebasestorage.googleapis.com/v0/b/plataforma-cultura-ciudadana.firebasestorage.app/o/laboratorios%2Fcafe-madrid.jpg?alt=media&token=a6c995cc-77df-4a37-8a9c-373e1000e617',
  'Laboratorio Vivo Parque García Rovira':
    'https://firebasestorage.googleapis.com/v0/b/plataforma-cultura-ciudadana.firebasestorage.app/o/laboratorios%2Fparque-garcia-rovira.jpg?alt=media&token=9371a2cd-8dc2-480e-846f-a77b726c2e0e',
  'Laboratorio Ambiental Cerro del Santísimo':
    'https://firebasestorage.googleapis.com/v0/b/plataforma-cultura-ciudadana.firebasestorage.app/o/laboratorios%2Fcerro-del-santisimo.jpg?alt=media&token=5d7c3ccd-fc55-4586-b8de-a65ed5c7dc84',
};

export const up = (pgm) => {
  for (const [nombre, url] of Object.entries(IMAGENES)) {
    pgm.sql(
      `UPDATE laboratorios
         SET imagen_url = '${url}', updated_at = current_timestamp
       WHERE nombre = '${nombre.replace(/'/g, "''")}'`
    );
  }
};

export const down = (pgm) => {
  for (const nombre of Object.keys(IMAGENES)) {
    pgm.sql(
      `UPDATE laboratorios
         SET imagen_url = NULL, updated_at = current_timestamp
       WHERE nombre = '${nombre.replace(/'/g, "''")}'`
    );
  }
};
