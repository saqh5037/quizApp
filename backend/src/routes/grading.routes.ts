import { Router } from 'express';
import * as gradingController from '../controllers/grading.controller';

const router = Router();

// Submit and grade public quiz (no auth required)
router.post('/submit-public', gradingController.submitPublicQuiz);

// Get public quiz result (no auth required)
router.get('/result/:id', gradingController.getPublicQuizResult);

export default router;