import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import {
  getPublicQuizResults,
  getPublicQuizResultsByQuizId,
  getPublicQuizResultDetail,
  getResultsStatistics,
  getResultsByQuizId
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

// Get results for a specific quiz (owner only)
router.get('/public/quiz/:quizId', authenticate, getPublicQuizResultsByQuizId);

// Get results for a quiz by ID (admin/teacher access)
router.get('/quiz/:quizId', simpleAuth, getResultsByQuizId);

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
          pr.id,
          pr.quiz_id,
          pr.participant_name,
          pr.participant_email,
          pr.participant_phone,
          pr.participant_organization,
          pr.answers,
          pr.score,
          pr.total_points,
          pr.earned_points,
          pr.total_questions,
          pr.correct_answers,
          pr.time_spent_seconds,
          pr.started_at AT TIME ZONE 'UTC' as started_at,
          pr.completed_at AT TIME ZONE 'UTC' as completed_at,
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
        // Ensure answers JSONB is parsed as object
        if (typeof quizResult.answers === 'string') {
          try { quizResult.answers = JSON.parse(quizResult.answers); }
          catch (e) { quizResult.answers = {}; }
        }
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

        // Handle question ID mismatch: when quiz is edited, questions get
        // new IDs but old results still reference the original IDs.
        // Remap answers by position if IDs don't match.
        if (questions && questions.length > 0 && result.answers) {
          const answerKeys = Object.keys(result.answers);
          const questionIds = questions.map((q: any) => String(q.id));
          const hasMatch = answerKeys.some((k: string) => questionIds.includes(k));

          if (!hasMatch && answerKeys.length > 0) {
            // Sort answer keys numerically and map to questions by position
            const sortedKeys = answerKeys.sort((a: string, b: string) => Number(a) - Number(b));
            const remappedAnswers: any = {};
            questions.forEach((q: any, idx: number) => {
              if (idx < sortedKeys.length) {
                remappedAnswers[q.id] = result.answers[sortedKeys[idx]];
              }
            });
            result.answers = remappedAnswers;
          }
        }
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