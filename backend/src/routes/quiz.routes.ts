import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import * as quizController from '../controllers/quiz.simple.controller';
import { CONSTANTS } from '../config/constants';

const router = Router();

// Get all quizzes (public and user's private)
router.get('/', simpleAuth, quizController.getQuizzes);

// Get public quizzes (no auth required)
router.get('/public', quizController.getPublicQuizzes);

// Get public quiz by ID (no auth required)
router.get('/:id/public', quizController.getPublicQuizById);

// Get quiz by ID
router.get('/:id', simpleAuth, quizController.getQuizById);

// Create new quiz
router.post(
  '/',
  simpleAuth,
  validate([
    body('title').notEmpty().trim(),
    body('description').optional().trim(),
    body('category').optional().trim(),
  ]),
  quizController.createQuiz
);

// Update quiz
router.put(
  '/:id',
  simpleAuth,
  quizController.updateQuiz
);

// Delete quiz
router.delete(
  '/:id',
  simpleAuth,
  quizController.deleteQuiz
);

// Quiz questions endpoint
router.get('/:id/questions', simpleAuth, quizController.getQuizQuestions);

// Clone quiz
router.post('/:id/clone', simpleAuth, quizController.cloneQuiz);

export default router;