import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { interactiveVideoController } from '../controllers/interactive-video.controller';

const router = Router();

// Crear capa interactiva para un video
router.post(
  '/videos/:videoId/interactive-layer',
  authenticate,
  (req, res) => interactiveVideoController.createInteractiveLayer(req, res)
);

// Actualizar configuración de capa interactiva
router.put(
  '/interactive-layers/:layerId',
  authenticate,
  (req, res) => interactiveVideoController.updateInteractiveLayer(req, res)
);

// Obtener capa interactiva de un video
router.get(
  '/videos/:videoId/interactive-layer',
  authenticate,
  (req, res) => interactiveVideoController.getInteractiveLayer(req, res)
);

// Procesar video con IA
router.post(
  '/interactive-layers/:layerId/process',
  authenticate,
  (req, res) => interactiveVideoController.processVideoWithAI(req, res)
);

// Iniciar sesión interactiva
router.post(
  '/interactive-layers/:layerId/start-session',
  authenticate,
  (req, res) => interactiveVideoController.startInteractiveSession(req, res)
);

// Enviar respuesta a pregunta
router.post(
  '/interactive-sessions/:sessionId/answer',
  authenticate,
  (req, res) => interactiveVideoController.submitAnswer(req, res)
);

// Completar sesión
router.post(
  '/interactive-sessions/:sessionId/complete',
  authenticate,
  (req, res) => interactiveVideoController.completeSession(req, res)
);

// Obtener resultados de sesión
router.get(
  '/interactive-sessions/:sessionId/results',
  authenticate,
  (req, res) => interactiveVideoController.getSessionResults(req, res)
);

// Obtener historial de videos del usuario
router.get(
  '/users/:userId/interactive-video-history',
  authenticate,
  (req, res) => interactiveVideoController.getUserVideoHistory(req, res)
);

// Obtener mi historial (usuario actual)
router.get(
  '/my-interactive-video-history',
  authenticate,
  (req, res) => interactiveVideoController.getUserVideoHistory(req, res)
);

// Obtener analíticas de video
router.get(
  '/interactive-layers/:layerId/analytics',
  authenticate,
  (req, res) => interactiveVideoController.getVideoAnalytics(req, res)
);

// Eliminar capa interactiva
router.delete(
  '/interactive-layers/:layerId',
  authenticate,
  (req, res) => interactiveVideoController.deleteInteractiveLayer(req, res)
);

// Generar contenido interactivo con IA
router.post(
  '/interactive-layers/:layerId/generate',
  authenticate,
  (req, res) => interactiveVideoController.generateInteractiveContent(req, res)
);

// Obtener estado del procesamiento
router.get(
  '/interactive-layers/:layerId/status',
  authenticate,
  (req, res) => interactiveVideoController.getProcessingStatus(req, res)
);

export default router;