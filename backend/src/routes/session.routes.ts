import { Router } from 'express';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import * as sessionController from '../controllers/session.controller';

const router = Router();

// Create a new session
router.post('/', simpleAuth, sessionController.createSession);

// Get session by ID or code
router.get('/:id', sessionController.getSession);

// Update session status (start, next question, end)
router.put('/:id/status', simpleAuth, sessionController.updateSessionStatus);

// Get current question for session
router.get('/:id/current-question', sessionController.getCurrentQuestion);

// Submit answer
router.post('/answer', sessionController.submitAnswer);

// Get session results
router.get('/:id/results', sessionController.getSessionResults);

export default router;