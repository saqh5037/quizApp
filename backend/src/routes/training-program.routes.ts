import { Router } from 'express';
import TrainingProgramController from '../controllers/training-program.controller';
import { authenticate } from '../middleware/auth.middleware';
import { 
  tenantMiddleware, 
  instructorOnly 
} from '../middleware/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Public program routes (for authenticated users in the tenant)
router.get('/', TrainingProgramController.getPrograms);
router.get('/:id', TrainingProgramController.getProgram);
router.get('/:id/quizzes', TrainingProgramController.getProgramQuizzes);
router.get('/:id/progress', TrainingProgramController.getUserProgress);

// Instructor and admin routes
router.post('/', instructorOnly, TrainingProgramController.createProgram);
router.put('/:id', instructorOnly, TrainingProgramController.updateProgram);
router.delete('/:id', instructorOnly, TrainingProgramController.deleteProgram);

// Quiz management in programs
router.post('/:id/quizzes', instructorOnly, TrainingProgramController.addQuizToProgram);
router.put('/:id/quizzes/:quizId', instructorOnly, TrainingProgramController.updateProgramQuiz);
router.delete('/:id/quizzes/:quizId', instructorOnly, TrainingProgramController.removeQuizFromProgram);

export default router;