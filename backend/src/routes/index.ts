import { Router } from 'express';
import authRoutes from './auth.routes';
import quizRoutes from './quiz.routes';
import sessionRoutes from './session.routes';

const router = Router();

// Welcome route
router.get('/', (req, res) => {
  res.json({
    message: 'Quiz App API',
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

export default router;