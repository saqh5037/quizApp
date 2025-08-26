import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { interactiveVideoController } from '../controllers/interactive-video.controller';

const router = Router();

// Crear capa interactiva para un video
router.post(
  '/videos/:videoId/interactive-layer',
  authenticateToken,
  interactiveVideoController.createInteractiveLayer
);

// Actualizar configuración de capa interactiva
router.put(
  '/interactive-layers/:layerId',
  authenticateToken,
  interactiveVideoController.updateInteractiveLayer
);

// Obtener capa interactiva de un video
router.get(
  '/videos/:videoId/interactive-layer',
  authenticateToken,
  interactiveVideoController.getInteractiveLayer
);

// Procesar video con IA
router.post(
  '/interactive-layers/:layerId/process',
  authenticateToken,
  interactiveVideoController.processVideoWithAI
);

// Iniciar sesión interactiva
router.post(
  '/interactive-layers/:layerId/start-session',
  authenticateToken,
  interactiveVideoController.startInteractiveSession
);

// Enviar respuesta a pregunta
router.post(
  '/interactive-sessions/:sessionId/answer',
  authenticateToken,
  interactiveVideoController.submitAnswer
);

// Completar sesión
router.post(
  '/interactive-sessions/:sessionId/complete',
  authenticateToken,
  interactiveVideoController.completeSession
);

// Obtener resultados de sesión
router.get(
  '/interactive-sessions/:sessionId/results',
  authenticateToken,
  interactiveVideoController.getSessionResults
);

// Obtener historial de videos del usuario
router.get(
  '/users/:userId/interactive-video-history',
  authenticateToken,
  interactiveVideoController.getUserVideoHistory
);

// Obtener mi historial (usuario actual)
router.get(
  '/my-interactive-video-history',
  authenticateToken,
  interactiveVideoController.getUserVideoHistory
);

// Obtener analíticas de video
router.get(
  '/interactive-layers/:layerId/analytics',
  authenticateToken,
  interactiveVideoController.getVideoAnalytics
);

// Eliminar capa interactiva
router.delete(
  '/interactive-layers/:layerId',
  authenticateToken,
  interactiveVideoController.deleteInteractiveLayer
);

export default router;