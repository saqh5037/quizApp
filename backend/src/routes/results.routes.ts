import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger';
import {
  getPublicQuizResults,
  getPublicQuizResultsByQuizId,
  getPublicQuizResultDetail,
  getResultsStatistics,
  getResultsByQuizId,
} from '../controllers/results.controller';

const router = Router();

// All results endpoints require real authentication.

// Get all public quiz and video results for the authenticated user
router.get('/public', authenticate, getPublicQuizResults);

// Get results for a specific quiz (owner only)
router.get('/public/quiz/:quizId', authenticate, getPublicQuizResultsByQuizId);

// Get results for a quiz by ID (admin/teacher access)
router.get('/quiz/:quizId', authenticate, getResultsByQuizId);

// Get detailed result
router.get('/public/detail/:resultType/:resultId', authenticate, async (req: Request, res: Response) => {
  try {
    const { resultId, resultType } = req.params;
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id;

    if (!userId || !tenantId) {
      return res.status(403).json({ success: false, error: 'Missing auth context' });
    }

    let result: any = null;
    let questions: any[] = [];

    if (resultType === 'quiz') {
      const [quizResult] = (await sequelize.query(
        `
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
          AND q.tenant_id = :tenantId
          AND (q.creator_id = :userId OR :role = 'super_admin')
      `,
        {
          replacements: {
            resultId,
            userId,
            tenantId,
            role: req.user?.role || '',
          },
          type: QueryTypes.SELECT,
        }
      )) as any[];

      if (quizResult) {
        if (typeof quizResult.answers === 'string') {
          try {
            quizResult.answers = JSON.parse(quizResult.answers);
          } catch (e) {
            quizResult.answers = {};
          }
        }
        result = quizResult;

        questions = (await sequelize.query(
          `
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
        `,
          {
            replacements: { quizId: result.quiz_id },
            type: QueryTypes.SELECT,
          }
        )) as any[];

        // Remap answers by position if quiz has been re-edited and question IDs no longer match
        if (questions && questions.length > 0 && result.answers) {
          const answerKeys = Object.keys(result.answers);
          const questionIds = questions.map((q: any) => String(q.id));
          const hasMatch = answerKeys.some((k: string) => questionIds.includes(k));

          if (!hasMatch && answerKeys.length > 0) {
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
      const [videoResult] = (await sequelize.query(
        `
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
          AND v.tenant_id = :tenantId
          AND (v.creator_id = :userId OR :role = 'super_admin')
      `,
        {
          replacements: {
            resultId,
            userId,
            tenantId,
            role: req.user?.role || '',
          },
          type: QueryTypes.SELECT,
        }
      )) as any[];

      if (videoResult) {
        result = videoResult;
        questions = [];
      }
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found',
      });
    }

    res.json({
      success: true,
      data: {
        result,
        questions,
        resultType,
      },
    });
  } catch (error: any) {
    logger.error('Error loading result detail', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to load result detail',
    });
  }
});

// Keep the old endpoint with auth
router.get('/public/:resultId', authenticate, getPublicQuizResultDetail);

// Get statistics for a quiz
router.get('/public/quiz/:quizId/stats', authenticate, getResultsStatistics);

export default router;
