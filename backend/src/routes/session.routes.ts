import { Router } from 'express';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import * as sessionController from '../controllers/session.controller';
import * as resultsController from '../controllers/results.controller';

const router = Router();

// Get active sessions
router.get('/active', simpleAuth, sessionController.getActiveSessions);

// Get user's hosted sessions
router.get('/my', simpleAuth, sessionController.getMySessions);

// Create a new session
router.post('/', simpleAuth, sessionController.createSession);

// Create a public session (no auth required)
router.post('/public', sessionController.createPublicSession);

// Get session by ID or code
router.get('/:id', sessionController.getSession);

// Join session
router.post('/:id/join', simpleAuth, sessionController.joinSession);

// Update session status (start, next question, end)
router.put('/:id/status', simpleAuth, sessionController.updateSessionStatus);

// Get current question for session
router.get('/:id/current-question', sessionController.getCurrentQuestion);

// Submit answer
router.post('/answer', sessionController.submitAnswer);

// Get session results
// router.get('/:id/results', simpleAuth, resultsController.getSessionResults);

// Export results as PDF
// router.get('/:id/export/pdf', simpleAuth, resultsController.exportSessionResultsPDF);

// Export results as Excel
// router.get('/:id/export/excel', simpleAuth, resultsController.exportSessionResultsExcel);

// Email results to participants
// router.post('/:id/email-results', simpleAuth, resultsController.emailSessionResults);

export default router;