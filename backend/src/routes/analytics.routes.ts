import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getQuizAnalytics } from '../controllers/analytics.controller';

const router = Router();

// GET /api/v1/analytics/quiz/:quizId — full analytics report for a quiz
router.get('/quiz/:quizId', authenticate, getQuizAnalytics);

export default router;
