import {
  enviarEvidencia,
  consultarMisEvidencias,
  consultarCola,
  decidirSobreEvidencia,
} from '../servicios/evidencias.servicio.js';

/**
 * Controlador construido con fábrica porque el envío necesita el almacén de
 * archivos inyectado en crearApp (Firebase Storage en producción, un doble
 * en pruebas), igual que el verificador de tokens.
 */
export default function crearEvidenciasControlador(almacenArchivos) {
  return {
    async enviar(req, res, next) {
      try {
        res
          .status(201)
          .json(await enviarEvidencia(req.perfil, req.body, req.file, almacenArchivos));
      } catch (error) {
        next(error);
      }
    },

    async mias(req, res, next) {
      try {
        res.json(await consultarMisEvidencias(req.perfil));
      } catch (error) {
        next(error);
      }
    },

    async pendientes(req, res, next) {
      try {
        res.json(await consultarCola(req.perfil, req.query.laboratorio));
      } catch (error) {
        next(error);
      }
    },

    async moderar(req, res, next) {
      try {
        res.json(await decidirSobreEvidencia(req.perfil, req.params.id, req.body));
      } catch (error) {
        next(error);
      }
    },
  };
}
