import { Router } from 'express';
import {
  startChatSession,
  sendChatMessage,
  getChatHistory,
  generateQuiz,
  getGeneratedQuiz,
  generateSummary,
  getGeneratedSummary,
  exportQuiz,
  importQuizToEvaluations
} from '../controllers/ai-gemini.controller';
import {
  importAIQuizToEvaluations,
  createQuizFromManual
} from '../controllers/ai-quiz-import.controller';
import {
  generateFromText,
  generateFromManual,
  getGenerated as getGeneratedV2,
} from '../controllers/ai-quiz.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// ---- Fase 5: tenant-isolated, persisted AI quiz generation ----------------
// These endpoints require auth and persist results to ai_generated_quizzes.
router.post('/generate-quiz-from-text', authenticate, generateFromText);
router.post('/generate-quiz-from-manual', authenticate, generateFromManual);
router.get('/generated-quiz/:id', authenticate, getGeneratedV2);

// ---- Legacy AI endpoints (kept for backwards compatibility) ---------------
// Chat routes
router.post('/manuals/:manualId/chat/start', startChatSession);
router.post('/manuals/:manualId/chat/:sessionId/message', sendChatMessage);
router.get('/manuals/:manualId/chat/:sessionId/history', getChatHistory);

// Quiz generation routes
router.post('/manuals/:manualId/generate-quiz', generateQuiz);
router.get('/manuals/:manualId/quizzes/:quizId', getGeneratedQuiz);

// Summary generation routes
router.post('/manuals/:manualId/generate-summary', generateSummary);
router.get('/manuals/:manualId/summaries/:summaryId', getGeneratedSummary);

// Quiz export route
router.get('/quiz/:quizId/export', exportQuiz);

// Import quiz to evaluations
router.post('/quiz/:quizId/import', importQuizToEvaluations);

// New improved import routes
router.post('/ai-quiz/:aiQuizId/import-to-evaluations', importAIQuizToEvaluations);
router.post('/manuals/:manualId/create-quiz', createQuizFromManual);

export default router;