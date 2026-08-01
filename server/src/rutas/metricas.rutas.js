import { Router } from 'express';
import { cargarPerfil, requerirRol } from '../middleware/autenticacion.js';
import { metricasLaboratorio, metricasGlobales } from '../controladores/metricas.controlador.js';

/**
 * Fase 10 — métricas y reportes. Todo exige sesión: los reportes son
 * material de gestión, no parte de la vitrina pública. La autorización
 * fina (gestor solo sobre su laboratorio asignado) vive en el servicio.
 */
export default function crearMetricasRutas(verificarToken) {
  const router = Router();

  // La ruta literal va antes que la paramétrica.
  router.get(
    '/globales',
    verificarToken,
    cargarPerfil,
    requerirRol('administrador'),
    metricasGlobales
  );

  router.get(
    '/laboratorios/:id',
    verificarToken,
    cargarPerfil,
    requerirRol('gestor', 'administrador'),
    metricasLaboratorio
  );

  return router;
}
