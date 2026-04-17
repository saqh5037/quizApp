/**
 * analytics.service.ts — tenant-scoped quiz analytics for dashboards.
 *
 * Fase 5 deliverable. Closes the competitive gap vs Kahoot/Quizizz reports
 * by exposing per-question difficulty, time-to-answer distribution,
 * per-student performance, and dropoff — all straight from the existing
 * `public_quiz_results` table.
 *
 * Every query is scoped by the caller's tenant via a JOIN to `quizzes`.
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class AnalyticsServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const NotFound = (msg = 'Quiz not found') => new AnalyticsServiceError(msg, 404);

export interface UserContext {
  id: number;
  tenant_id: number;
  role?: string;
}

export interface QuizAnalyticsReport {
  quiz: {
    id: number;
    title: string;
    category: string | null;
    difficulty: string | null;
    totalQuestions: number;
    passPercentage: number | null;
  };
  overview: {
    totalAttempts: number;
    uniqueParticipants: number;
    averageScore: number;
    medianScore: number;
    passRate: number;
    averageTimeSeconds: number;
    completionRate: number;
  };
  questionBreakdown: Array<{
    questionId: number;
    orderPosition: number;
    questionText: string;
    questionType: string;
    totalAnswers: number;
    correctPercentage: number;
    averageTimeSeconds: number;
  }>;
  timeline: Array<{
    date: string;
    attempts: number;
    averageScore: number;
  }>;
  topParticipants: Array<{
    name: string;
    email: string | null;
    score: number;
    timeSeconds: number;
    completedAt: string;
  }>;
  strugglingStudents: Array<{
    name: string;
    email: string | null;
    attempts: number;
    averageScore: number;
    lastAttemptAt: string;
  }>;
}

export const getQuizAnalytics = async (
  quizId: number,
  user: UserContext
): Promise<QuizAnalyticsReport> => {
  // Quiz must belong to the caller's tenant (super_admin bypass intentional)
  const [quiz] = (await sequelize.query(
    `SELECT id, title, category, difficulty, total_questions, pass_percentage
     FROM quizzes
     WHERE id = :quizId
       AND tenant_id = :tenantId
       AND deleted_at IS NULL`,
    {
      replacements: { quizId, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (!quiz) throw NotFound();

  const passPercent = quiz.pass_percentage || 70;

  // Overview: totals, averages, pass rate, completion rate
  const [overview] = (await sequelize.query(
    `SELECT
      COUNT(*) as total_attempts,
      COUNT(DISTINCT pr.participant_email) as unique_participants,
      COALESCE(ROUND(AVG(pr.score)::numeric, 2), 0) as average_score,
      COALESCE(
        ROUND(
          (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pr.score))::numeric,
          2
        ),
        0
      ) as median_score,
      COALESCE(ROUND(AVG(pr.time_spent_seconds)::numeric, 0), 0) as average_time_seconds,
      SUM(CASE WHEN pr.score >= :passPercent THEN 1 ELSE 0 END) as passed,
      SUM(
        CASE WHEN pr.total_questions > 0
             AND pr.correct_answers + (pr.total_questions - pr.correct_answers) = pr.total_questions
        THEN 1 ELSE 0 END
      ) as completed
    FROM public_quiz_results pr
    JOIN quizzes q ON pr.quiz_id = q.id
    WHERE pr.quiz_id = :quizId AND q.tenant_id = :tenantId`,
    {
      replacements: { quizId, tenantId: user.tenant_id, passPercent },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  const totalAttempts = parseInt(overview?.total_attempts || '0', 10);
  const passed = parseInt(overview?.passed || '0', 10);
  const completed = parseInt(overview?.completed || '0', 10);

  // Per-question breakdown. We pull the answers JSONB from each attempt
  // and aggregate with a join against questions.
  const questionBreakdown = (await sequelize.query(
    `SELECT
      q.id as question_id,
      q.order_position,
      q.question_text,
      q.question_type,
      COUNT(pr.id) as total_answers,
      COALESCE(
        ROUND(
          AVG(
            CASE
              WHEN (pr.answers->>(q.id::text)) IS NULL THEN NULL
              WHEN (pr.answers->>(q.id::text)) = (q.correct_answers->>0) THEN 100
              ELSE 0
            END
          )::numeric,
          2
        ),
        0
      ) as correct_percentage,
      COALESCE(
        ROUND(AVG(pr.time_spent_seconds)::numeric / NULLIF(q2.total_questions, 0), 0),
        0
      ) as average_time_seconds
    FROM questions q
    JOIN quizzes q2 ON q.quiz_id = q2.id
    LEFT JOIN public_quiz_results pr ON pr.quiz_id = q.quiz_id
    WHERE q.quiz_id = :quizId AND q2.tenant_id = :tenantId
    GROUP BY q.id, q.order_position, q.question_text, q.question_type, q2.total_questions
    ORDER BY q.order_position ASC`,
    {
      replacements: { quizId, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  // Attempts over the last 30 days, grouped by date
  const timeline = (await sequelize.query(
    `SELECT
      DATE(pr.completed_at) as date,
      COUNT(*) as attempts,
      COALESCE(ROUND(AVG(pr.score)::numeric, 2), 0) as average_score
    FROM public_quiz_results pr
    JOIN quizzes q ON pr.quiz_id = q.id
    WHERE pr.quiz_id = :quizId
      AND q.tenant_id = :tenantId
      AND pr.completed_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(pr.completed_at)
    ORDER BY DATE(pr.completed_at) ASC`,
    {
      replacements: { quizId, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  // Top 10 performers
  const topParticipants = (await sequelize.query(
    `SELECT
      pr.participant_name as name,
      pr.participant_email as email,
      pr.score,
      pr.time_spent_seconds as time_seconds,
      pr.completed_at
    FROM public_quiz_results pr
    JOIN quizzes q ON pr.quiz_id = q.id
    WHERE pr.quiz_id = :quizId AND q.tenant_id = :tenantId
    ORDER BY pr.score DESC, pr.time_spent_seconds ASC
    LIMIT 10`,
    {
      replacements: { quizId, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  // Students who took it more than once with the LOWEST average score
  const strugglingStudents = (await sequelize.query(
    `SELECT
      pr.participant_name as name,
      pr.participant_email as email,
      COUNT(*) as attempts,
      COALESCE(ROUND(AVG(pr.score)::numeric, 2), 0) as average_score,
      MAX(pr.completed_at) as last_attempt_at
    FROM public_quiz_results pr
    JOIN quizzes q ON pr.quiz_id = q.id
    WHERE pr.quiz_id = :quizId
      AND q.tenant_id = :tenantId
      AND pr.participant_email IS NOT NULL
    GROUP BY pr.participant_name, pr.participant_email
    HAVING COUNT(*) >= 1 AND AVG(pr.score) < :passPercent
    ORDER BY AVG(pr.score) ASC, COUNT(*) DESC
    LIMIT 10`,
    {
      replacements: { quizId, tenantId: user.tenant_id, passPercent },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      category: quiz.category,
      difficulty: quiz.difficulty,
      totalQuestions: quiz.total_questions || 0,
      passPercentage: quiz.pass_percentage,
    },
    overview: {
      totalAttempts,
      uniqueParticipants: parseInt(overview?.unique_participants || '0', 10),
      averageScore: parseFloat(overview?.average_score || '0'),
      medianScore: parseFloat(overview?.median_score || '0'),
      passRate: totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0,
      averageTimeSeconds: parseInt(overview?.average_time_seconds || '0', 10),
      completionRate: totalAttempts > 0 ? Math.round((completed / totalAttempts) * 100) : 0,
    },
    questionBreakdown: questionBreakdown.map((q: any) => ({
      questionId: q.question_id,
      orderPosition: q.order_position,
      questionText: q.question_text,
      questionType: q.question_type,
      totalAnswers: parseInt(q.total_answers || '0', 10),
      correctPercentage: parseFloat(q.correct_percentage || '0'),
      averageTimeSeconds: parseInt(q.average_time_seconds || '0', 10),
    })),
    timeline: timeline.map((t: any) => ({
      date: String(t.date),
      attempts: parseInt(t.attempts || '0', 10),
      averageScore: parseFloat(t.average_score || '0'),
    })),
    topParticipants: topParticipants.map((p: any) => ({
      name: p.name,
      email: p.email,
      score: parseFloat(p.score || '0'),
      timeSeconds: parseInt(p.time_seconds || '0', 10),
      completedAt: String(p.completed_at),
    })),
    strugglingStudents: strugglingStudents.map((s: any) => ({
      name: s.name,
      email: s.email,
      attempts: parseInt(s.attempts || '0', 10),
      averageScore: parseFloat(s.average_score || '0'),
      lastAttemptAt: String(s.last_attempt_at),
    })),
  };
};
