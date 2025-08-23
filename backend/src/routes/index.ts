import { Router } from 'express';
import authRoutes from './auth.routes';
import quizRoutes from './quiz.routes';
import sessionRoutes from './session.routes';
import userRoutes from './user.routes';
import dashboardRoutes from './dashboard.routes';
import gradingRoutes from './grading.routes';
import resultsRoutes from './results.routes';

const router = Router();

// Welcome route
router.get('/', (req, res) => {
  res.json({
    message: 'AristoTest API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    endpoints: {
      auth: '/api/v1/auth',
      quizzes: '/api/v1/quizzes',
      sessions: '/api/v1/sessions',
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/quizzes', quizRoutes);
router.use('/sessions', sessionRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/grading', gradingRoutes);
router.use('/results', resultsRoutes);

export default router;