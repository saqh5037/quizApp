import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// Get all public quiz and video results for authenticated user's content
export const getPublicQuizResults = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { quizId, videoId, type, startDate, endDate, limit = 50, offset = 0 } = req.query;

    // Combined query for both quiz and video results
    let query = `
      WITH combined_results AS (
        -- Quiz Results
        SELECT 
          'quiz' as result_type,
          pr.id,
          pr.quiz_id as content_id,
          q.title as content_title,
          q.category,
          q.difficulty,
          pr.participant_name as student_name,
          pr.participant_email as student_email,
          pr.participant_phone as student_phone,
          pr.score,
          pr.total_questions,
          pr.correct_answers,
          pr.time_spent_seconds as time_taken,
          CASE WHEN pr.score >= COALESCE(q.pass_percentage, 70) THEN true ELSE false END as passed,
          pr.completed_at,
          pr.ip_address,
          pr.user_agent,
          q.pass_percentage as passing_score
        FROM public_quiz_results pr
        INNER JOIN quizzes q ON pr.quiz_id = q.id
        WHERE q.creator_id = :userId
        
        UNION ALL
        
        -- Interactive Video Results
        SELECT 
          'video' as result_type,
          pvr.id,
          pvr.video_id as content_id,
          v.title as content_title,
          'Video Interactivo' as category,
          NULL as difficulty,
          pvr.student_name,
          pvr.student_email,
          pvr.student_phone,
          pvr.score,
          pvr.total_questions,
          pvr.correct_answers,
          pvr.duration_seconds as time_taken,
          pvr.passed,
          pvr.completed_at,
          pvr.ip_address,
          pvr.user_agent,
          pvr.passing_score
        FROM public_interactive_video_results pvr
        INNER JOIN videos v ON pvr.video_id = v.id
        WHERE v.creator_id = :userId
      )
      SELECT * FROM combined_results
      WHERE 1=1
    `;

    const replacements: any = { userId };

    // Filter by type (quiz or video)
    if (type === 'quiz') {
      query += ` AND result_type = 'quiz'`;
    } else if (type === 'video') {
      query += ` AND result_type = 'video'`;
    }

    if (quizId) {
      query += ' AND result_type = \'quiz\' AND content_id = :quizId';
      replacements.quizId = quizId;
    }

    if (videoId) {
      query += ' AND result_type = \'video\' AND content_id = :videoId';
      replacements.videoId = videoId;
    }

    if (startDate) {
      query += ' AND completed_at >= :startDate';
      replacements.startDate = startDate;
    }

    if (endDate) {
      query += ' AND completed_at <= :endDate';
      replacements.endDate = endDate;
    }

    query += ' ORDER BY completed_at DESC LIMIT :limit OFFSET :offset';
    replacements.limit = parseInt(limit as string);
    replacements.offset = parseInt(offset as string);

    const results = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    // Get total count
    let countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM public_quiz_results pr
         INNER JOIN quizzes q ON pr.quiz_id = q.id
         WHERE q.creator_id = :userId) +
        (SELECT COUNT(*) FROM public_interactive_video_results pvr
         INNER JOIN videos v ON pvr.video_id = v.id
         WHERE v.creator_id = :userId) as total
    `;

    const [{ total }] = await sequelize.query(countQuery, {
      replacements: { userId },
      type: QueryTypes.SELECT
    }) as any;

    res.json({
      success: true,
      data: {
        results,
        pagination: {
          total: parseInt(total),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching public results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch results'
    });
  }
};

// Get results for a specific quiz
export const getPublicQuizResultsByQuizId = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.id;
    const { startDate, endDate, minScore, maxScore } = req.query;

    // Verify the quiz belongs to the user
    const [quiz] = await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :quizId AND creator_id = :userId',
      {
        replacements: { quizId, userId },
        type: QueryTypes.SELECT
      }
    ) as any;

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission'
      });
    }

    let query = `
      SELECT 
        pr.*,
        ROUND(AVG(pr.score) OVER (), 2) as avg_score,
        COUNT(*) OVER () as total_attempts
      FROM public_quiz_results pr
      WHERE pr.quiz_id = :quizId
    `;

    const replacements: any = { quizId };

    if (startDate) {
      query += ' AND pr.completed_at >= :startDate';
      replacements.startDate = startDate;
    }

    if (endDate) {
      query += ' AND pr.completed_at <= :endDate';
      replacements.endDate = endDate;
    }

    if (minScore !== undefined) {
      query += ' AND pr.score >= :minScore';
      replacements.minScore = minScore;
    }

    if (maxScore !== undefined) {
      query += ' AND pr.score <= :maxScore';
      replacements.maxScore = maxScore;
    }

    query += ' ORDER BY pr.completed_at DESC';

    const results = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        quiz,
        results
      }
    });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz results'
    });
  }
};

// Get detailed result
export const getPublicQuizResultDetail = async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params;
    const userId = req.user?.id;

    // Get result with quiz verification
    const [result] = await sequelize.query(`
      SELECT 
        pr.*,
        q.title as quiz_title,
        q.category,
        q.difficulty,
        q.pass_percentage,
        q.creator_id
      FROM public_quiz_results pr
      INNER JOIN quizzes q ON pr.quiz_id = q.id
      WHERE pr.id = :resultId AND q.creator_id = :userId
    `, {
      replacements: { resultId, userId },
      type: QueryTypes.SELECT
    }) as any;

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found or you do not have permission'
      });
    }

    // Get questions to show detailed answers
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
    console.error('Error fetching result detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch result detail'
    });
  }
};

// Get statistics for a quiz
export const getResultsStatistics = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.id;

    // Verify quiz ownership
    const [quiz] = await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :quizId AND creator_id = :userId',
      {
        replacements: { quizId, userId },
        type: QueryTypes.SELECT
      }
    ) as any;

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission'
      });
    }

    // Get statistics
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(DISTINCT participant_email) as unique_participants,
        ROUND(AVG(score), 2) as average_score,
        ROUND(MIN(score), 2) as min_score,
        ROUND(MAX(score), 2) as max_score,
        ROUND(AVG(time_spent_seconds), 0) as avg_time_seconds,
        SUM(CASE WHEN score >= :passingScore THEN 1 ELSE 0 END) as passed_count,
        SUM(CASE WHEN score < :passingScore THEN 1 ELSE 0 END) as failed_count,
        ROUND(AVG(correct_answers), 1) as avg_correct_answers
      FROM public_quiz_results
      WHERE quiz_id = :quizId
    `, {
      replacements: { 
        quizId, 
        passingScore: quiz.pass_percentage || 70 
      },
      type: QueryTypes.SELECT
    }) as any;

    // Get score distribution
    const scoreDistribution = await sequelize.query(`
      SELECT 
        CASE 
          WHEN score >= 90 THEN '90-100'
          WHEN score >= 80 THEN '80-89'
          WHEN score >= 70 THEN '70-79'
          WHEN score >= 60 THEN '60-69'
          WHEN score >= 50 THEN '50-59'
          ELSE '0-49'
        END as range,
        COUNT(*) as count
      FROM public_quiz_results
      WHERE quiz_id = :quizId
      GROUP BY range
      ORDER BY range DESC
    `, {
      replacements: { quizId },
      type: QueryTypes.SELECT
    });

    // Get recent results trend (last 7 days)
    const recentTrend = await sequelize.query(`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as attempts,
        ROUND(AVG(score), 2) as avg_score
      FROM public_quiz_results
      WHERE quiz_id = :quizId 
        AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `, {
      replacements: { quizId },
      type: QueryTypes.SELECT
    });

    // Get top performers
    const topPerformers = await sequelize.query(`
      SELECT 
        participant_name,
        participant_email,
        score,
        time_spent_seconds,
        completed_at
      FROM public_quiz_results
      WHERE quiz_id = :quizId
      ORDER BY score DESC, time_spent_seconds ASC
      LIMIT 10
    `, {
      replacements: { quizId },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        quiz,
        statistics: stats,
        scoreDistribution,
        recentTrend,
        topPerformers
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};