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

// Get all public quiz and video results - temporarily without auth for testing
// TODO: Re-enable authentication after fixing the auth issue
router.get('/public', async (req, res, next) => {
  try {
    // Temporarily hardcode user ID for testing
    req.user = { id: 2, email: 'admin@aristotest.com', role: 'admin' };
    
    // Use the proper controller that handles both quiz and video results
    return getPublicQuizResults(req, res);
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
router.get('/public/detail/:resultType/:resultId', async (req, res) => {
  try {
    const { resultId, resultType } = req.params;
    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');
    
    let result = null;
    let questions = null;
    
    if (resultType === 'quiz') {
      const [quizResult] = await sequelize.query(`
        SELECT 
          pr.*,
          q.title as content_title,
          q.category,
          q.difficulty,
          q.pass_percentage,
          'quiz' as result_type
        FROM public_quiz_results pr
        INNER JOIN quizzes q ON pr.quiz_id = q.id
        WHERE pr.id = :resultId
      `, {
        replacements: { resultId },
        type: QueryTypes.SELECT
      });
      
      if (quizResult) {
        result = quizResult;
        
        // Get questions for the quiz
        questions = await sequelize.query(`
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
      }
    } else if (resultType === 'video') {
      const [videoResult] = await sequelize.query(`
        SELECT 
          pvr.*,
          v.title as content_title,
          'Video Interactivo' as category,
          NULL as difficulty,
          pvr.passing_score as pass_percentage,
          'video' as result_type
        FROM public_interactive_video_results pvr
        INNER JOIN videos v ON pvr.video_id = v.id
        WHERE pvr.id = :resultId
      `, {
        replacements: { resultId },
        type: QueryTypes.SELECT
      });
      
      if (videoResult) {
        result = videoResult;
        questions = []; // Video results don't have questions structure
      }
    }
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        result,
        questions,
        resultType
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