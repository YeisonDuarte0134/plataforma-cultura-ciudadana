import { Router } from 'express';
import multer from 'multer';
import ErrorHttp from '../errores/ErrorHttp.js';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import { limitadorEvidencias } from '../middleware/limitadores.js';
import crearEvidenciasControlador from '../controladores/evidencias.controlador.js';

const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024; // 5 MB

// La foto viaja como multipart/form-data y se retiene en memoria: nunca toca
// el disco (efímero en Render) y el servicio la reenvía al almacén.
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_FOTO, files: 1 },
  fileFilter: (req, archivo, aceptar) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(archivo.mimetype)) {
      return aceptar(null, true);
    }
    aceptar(new ErrorHttp(400, 'La foto debe ser JPG, PNG o WebP'));
  },
});

/** Traduce los errores propios de multer a errores de dominio (400). */
function recibirFoto(req, res, next) {
  subida.single('foto')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const mensaje =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'La foto no puede superar los 5 MB'
          : 'El archivo adjunto no es válido';
      return next(new ErrorHttp(400, mensaje));
    }
    next(error);
  });
}

export default function crearEvidenciasRutas(verificarToken, almacenArchivos) {
  const router = Router();
  const controlador = crearEvidenciasControlador(almacenArchivos);

  // Todo el recurso exige sesión; la moderación exige además rol de panel.
  router.use(verificarToken, cargarPerfil);

  // Rutas literales antes que la paramétrica /:id.
  router.get('/mias', controlador.mias);
  router.get('/pendientes', requerirRol('gestor', 'administrador'), controlador.pendientes);
  router.post('/', limitadorEvidencias, recibirFoto, controlador.enviar);
  router.patch('/:id', requerirRol('gestor', 'administrador'), controlador.moderar);

  return router;
}
