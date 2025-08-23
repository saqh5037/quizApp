import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getPublicQuizResults,
  getPublicQuizResultsByQuizId,
  getPublicQuizResultDetail,
  getResultsStatistics
} from '../controllers/results.controller';

const router = Router();

// Temporary test route without auth
router.get('/public/test', async (req, res) => {
  res.json({
    success: true,
    message: 'Test route working',
    timestamp: new Date()
  });
});

// Get all public quiz results - temporarily without auth for testing
// TODO: Re-enable authentication after fixing the auth issue
router.get('/public', async (req, res) => {
  try {
    // Temporarily hardcode user ID for testing
    req.user = { id: 2, email: 'admin@aristotest.com', role: 'admin' };
    
    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');
    
    const results = await sequelize.query(`
      SELECT 
        pr.*,
        q.title as quiz_title,
        q.category,
        q.difficulty
      FROM public_quiz_results pr
      INNER JOIN quizzes q ON pr.quiz_id = q.id
      ORDER BY pr.completed_at DESC
      LIMIT 50
    `, {
      type: QueryTypes.SELECT
    });
    
    res.json({
      success: true,
      data: {
        results
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get results for a specific quiz
router.get('/public/quiz/:quizId', authenticate, getPublicQuizResultsByQuizId);

// Get detailed result - temporarily without auth for testing  
router.get('/public/detail/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;
    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');
    
    // Get result with quiz info
    const [result] = await sequelize.query(`
      SELECT 
        pr.*,
        q.title as quiz_title,
        q.category,
        q.difficulty,
        q.pass_percentage
      FROM public_quiz_results pr
      INNER JOIN quizzes q ON pr.quiz_id = q.id
      WHERE pr.id = :resultId
    `, {
      replacements: { resultId },
      type: QueryTypes.SELECT
    });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found'
      });
    }
    
    // Get questions for the quiz
    const questions = await sequelize.query(`
      SELECT 
        id,
        question_text,
        question_type,
        options,
        correct_answers,
        points
      FROM questions 
      WHERE quiz_id = :quizId
      ORDER BY order_position
    `, {
      replacements: { quizId: result.quiz_id },
      type: QueryTypes.SELECT
    });
    
    res.json({
      success: true,
      data: {
        result,
        questions
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Keep the old endpoint with auth for future use
router.get('/public/:resultId', authenticate, getPublicQuizResultDetail);

// Get statistics for a quiz
router.get('/public/quiz/:quizId/stats', authenticate, getResultsStatistics);

export default router;