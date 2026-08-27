import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import * as sessionController from '../controllers/session.controller';

const router = Router();

// Authenticated endpoints (host / admin operations)
router.get('/', authenticate, sessionController.getAllSessions);
router.get('/active', authenticate, sessionController.getActiveSessions);
router.get('/my', authenticate, sessionController.getMySessions);
router.post('/', authenticate, sessionController.createSession);
router.post('/:id/join', authenticate, sessionController.joinSession);
router.put('/:id/status', authenticate, sessionController.updateSessionStatus);

// Public participant endpoints (anonymous players). optionalAuth lets hosts
// that do pass a token get tenant-scoped lookup while still allowing anonymous
// players joining by session code.
router.post('/public', sessionController.createPublicSession);
router.get('/:id', optionalAuth, sessionController.getSession);
router.get('/:id/current-question', optionalAuth, sessionController.getCurrentQuestion);
router.get('/:id/results', optionalAuth, sessionController.getSessionResults);
router.post('/answer', optionalAuth, sessionController.submitAnswer);

export default router;
