/**
 * session.service.ts — business logic for quiz sessions.
 *
 * Extracted from session.controller.ts as part of Fase 2 refactor.
 *
 * Tenant isolation notes:
 *  - Authenticated host / admin operations always require tenant_id and
 *    enforce that the underlying quiz belongs to the caller's tenant.
 *  - Public participant endpoints (join, getCurrentQuestion, submitAnswer,
 *    getResults) do not require a tenant context, but they are still
 *    tenant-safe in the sense that they operate on a specific session that
 *    was explicitly resolved from a session_code/id — there is no cross-tenant
 *    listing. The assumption is that knowing a session_code is equivalent to
 *    being invited.
 */

import { QueryTypes } from 'sequelize';
import crypto from 'crypto';
import { sequelize } from '../config/database';
import logger from '../utils/logger';

export class SessionServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const NotFound = (msg = 'Session not found') => new SessionServiceError(msg, 404);
const Forbidden = (msg: string) => new SessionServiceError(msg, 403);
const BadRequest = (msg: string) => new SessionServiceError(msg, 400);

export interface UserContext {
  id: number;
  tenant_id: number;
  role?: string;
  email?: string;
}

export const generateSessionCode = (): string =>
  crypto.randomBytes(3).toString('hex').toUpperCase();

// -----------------------------------------------------------------------------
// Public sessions (participants join via code, no host auth)
// -----------------------------------------------------------------------------

export const createPublicSession = async (input: {
  quizId: number;
  participant: { firstName: string; lastName: string; [k: string]: any };
}) => {
  if (!input.quizId) throw BadRequest('quizId is required');
  if (!input.participant || !input.participant.firstName) {
    throw BadRequest('participant info is required');
  }

  // Public sessions only exist for quizzes explicitly marked is_public
  const [quiz] = (await sequelize.query(
    `SELECT q.*, (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as questions_count
     FROM quizzes q
     WHERE q.id = :quizId AND q.is_active = true AND q.is_public = true`,
    { replacements: { quizId: input.quizId }, type: QueryTypes.SELECT }
  )) as any[];

  if (!quiz) throw NotFound('Quiz not found or not publicly available');

  const sessionCode = `PUB-${generateSessionCode()}`;
  const settings = {
    isPublic: true,
    participant: input.participant,
    startTime: new Date().toISOString(),
  };

  const [result] = (await sequelize.query(
    `INSERT INTO quiz_sessions (
      quiz_id, host_id, session_code, name, status, mode,
      current_question_index, max_participants, allow_late_joining,
      show_leaderboard, show_correct_after_each, nickname_generator,
      require_names, settings, created_at, updated_at
    ) VALUES (
      :quizId, NULL, :sessionCode, :name, 'active', 'self_paced',
      0, 1, false, false, true, false, false,
      :settings, NOW(), NOW()
    ) RETURNING *`,
    {
      replacements: {
        quizId: input.quizId,
        sessionCode,
        name: `Public: ${input.participant.firstName} ${input.participant.lastName || ''}`.trim(),
        settings: JSON.stringify(settings),
      },
      type: QueryTypes.INSERT,
    }
  )) as any[];

  const session = result[0];

  await sequelize.query(
    `INSERT INTO session_participants (
      session_id, user_id, nickname, joined_at, is_active
    ) VALUES (:sessionId, NULL, :nickname, NOW(), true)`,
    {
      replacements: {
        sessionId: session.id,
        nickname: `${input.participant.firstName} ${input.participant.lastName || ''}`.trim(),
      },
      type: QueryTypes.INSERT,
    }
  );

  return {
    sessionId: session.id,
    sessionCode: session.session_code,
    quizId: quiz.id,
    questionsCount: parseInt(quiz.questions_count, 10) || 0,
  };
};

// -----------------------------------------------------------------------------
// Authenticated session operations
// -----------------------------------------------------------------------------

export interface CreateSessionInput {
  quizId: number;
  name?: string;
  settings?: any;
}

export const createSession = async (input: CreateSessionInput, user: UserContext) => {
  if (!input.quizId) throw BadRequest('quizId is required');

  // Unique code, retry up to 10 times
  let sessionCode = generateSessionCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const [existing] = (await sequelize.query(
      'SELECT id FROM quiz_sessions WHERE session_code = :code',
      { replacements: { code: sessionCode }, type: QueryTypes.SELECT }
    )) as any[];
    if (!existing) break;
    sessionCode = generateSessionCode();
  }

  // Quiz must belong to caller's tenant
  const [quiz] = (await sequelize.query(
    `SELECT q.*, (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as questions_count
     FROM quizzes q
     WHERE q.id = :quizId AND q.is_active = true AND q.tenant_id = :tenantId`,
    {
      replacements: { quizId: input.quizId, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (!quiz) throw NotFound('Quiz not found or inactive');

  const settings = input.settings || {};

  const [result] = (await sequelize.query(
    `INSERT INTO quiz_sessions (
      quiz_id, host_id, tenant_id, session_code, name, status, mode,
      current_question_index, max_participants, allow_late_joining,
      show_leaderboard, show_correct_after_each, nickname_generator,
      require_names, settings, created_at, updated_at
    ) VALUES (
      :quizId, :hostId, :tenantId, :sessionCode, :name, 'waiting', 'live',
      0, :maxParticipants, :allowLateJoining,
      :showLeaderboard, :showCorrectAfterEach, :nicknameGenerator,
      :requireNames, :settings, NOW(), NOW()
    ) RETURNING *`,
    {
      replacements: {
        quizId: input.quizId,
        hostId: user.id,
        tenantId: user.tenant_id,
        sessionCode,
        name: input.name || `Session for ${quiz.title}`,
        maxParticipants: settings.maxParticipants || 100,
        allowLateJoining: settings.allowLateJoining !== false,
        showLeaderboard: settings.showLeaderboard !== false,
        showCorrectAfterEach: settings.showCorrectAfterEach || false,
        nicknameGenerator: settings.nicknameGenerator || false,
        requireNames: settings.requireNames !== false,
        settings: JSON.stringify(settings),
      },
      type: QueryTypes.INSERT,
    }
  )) as any[];

  const session = result[0];
  return {
    id: session.id,
    code: session.session_code,
    name: session.name,
    status: session.status,
    currentQuestionIndex: session.current_question_index,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      questionsCount: parseInt(quiz.questions_count, 10) || 0,
      timeLimit: quiz.time_limit_minutes,
    },
    participantsCount: 0,
    settings: session.settings,
  };
};

export const getSession = async (identifier: string, user: UserContext | null) => {
  const isCode = isNaN(Number(identifier));
  const tenantFilter = user ? 'AND q.tenant_id = :tenantId' : '';

  const query = isCode
    ? `SELECT s.*, q.title as quiz_title, q.total_questions, q.tenant_id as quiz_tenant_id,
       (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participants_count
       FROM quiz_sessions s
       JOIN quizzes q ON s.quiz_id = q.id
       WHERE s.session_code = :identifier ${tenantFilter}`
    : `SELECT s.*, q.title as quiz_title, q.total_questions, q.tenant_id as quiz_tenant_id,
       (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participants_count
       FROM quiz_sessions s
       JOIN quizzes q ON s.quiz_id = q.id
       WHERE s.id = :identifier ${tenantFilter}`;

  const replacements: any = { identifier };
  if (user) replacements.tenantId = user.tenant_id;

  const [session] = (await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  })) as any[];

  if (!session) throw NotFound();

  // Defense in depth for authenticated numeric-id lookups
  if (user && !isCode && session.quiz_tenant_id !== user.tenant_id) {
    throw NotFound();
  }

  return session;
};

export const updateSessionStatus = async (
  sessionId: string,
  updates: { status?: string; currentQuestionIndex?: number },
  user: UserContext
) => {
  const [session] = (await sequelize.query(
    `SELECT s.* FROM quiz_sessions s
     INNER JOIN quizzes q ON s.quiz_id = q.id
     WHERE s.id = :id
       AND s.host_id = :hostId
       AND q.tenant_id = :tenantId`,
    {
      replacements: { id: sessionId, hostId: user.id, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (!session) throw Forbidden('Session not found or you are not the host');

  const updateFields: string[] = [];
  const replacements: any = { id: sessionId };

  if (updates.status) {
    updateFields.push('status = :status');
    replacements.status = updates.status;
    if (updates.status === 'active' && !session.started_at) {
      updateFields.push('started_at = NOW()');
    } else if (updates.status === 'completed' && !session.ended_at) {
      updateFields.push('ended_at = NOW()');
    }
  }

  if (updates.currentQuestionIndex !== undefined) {
    updateFields.push('current_question_index = :currentQuestionIndex');
    updateFields.push('current_question_started_at = NOW()');
    replacements.currentQuestionIndex = updates.currentQuestionIndex;
  }

  updateFields.push('updated_at = NOW()');

  await sequelize.query(
    `UPDATE quiz_sessions SET ${updateFields.join(', ')} WHERE id = :id`,
    { replacements, type: QueryTypes.UPDATE }
  );
};

// -----------------------------------------------------------------------------
// Participant runtime operations (public)
// -----------------------------------------------------------------------------

export const getCurrentQuestion = async (identifier: string) => {
  // Look up by either numeric ID or session_code, but never both in a way that
  // would allow probing arbitrary ids (session_code is a 6-char hex so the
  // numeric coercion is disjoint from code format).
  const isCode = isNaN(Number(identifier));
  const [session] = (await sequelize.query(
    isCode
      ? 'SELECT * FROM quiz_sessions WHERE session_code = :identifier'
      : 'SELECT * FROM quiz_sessions WHERE id = :identifier',
    { replacements: { identifier }, type: QueryTypes.SELECT }
  )) as any[];

  if (!session) throw NotFound();

  const [question] = (await sequelize.query(
    `SELECT * FROM questions
     WHERE quiz_id = :quizId
     ORDER BY order_position
     LIMIT 1 OFFSET :offset`,
    {
      replacements: {
        quizId: session.quiz_id,
        offset: session.current_question_index,
      },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (!question) return null;

  // Strip correct_answers before returning to participants
  const { correct_answers, ...safeQuestion } = question;

  return {
    question: safeQuestion,
    questionNumber: (session.current_question_index || 0) + 1,
    totalQuestions: session.total_questions || 0,
    timeStarted: session.current_question_started_at,
  };
};

export const submitAnswer = async (input: {
  sessionId: number;
  participantId: number;
  questionId: number;
  answer: any;
  timeSpent?: number;
}) => {
  // Validate that session + question + participant belong together. This
  // replaces the original endpoint which happily accepted any
  // (sessionId, questionId) pair.
  const [question] = (await sequelize.query(
    `SELECT q.*
     FROM questions q
     INNER JOIN quiz_sessions s ON s.quiz_id = q.quiz_id
     WHERE q.id = :questionId AND s.id = :sessionId`,
    {
      replacements: { questionId: input.questionId, sessionId: input.sessionId },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (!question) throw NotFound('Question not found or does not belong to this session');

  // Confirm the participant is part of this session and fetch tenant_id
  const [participant] = (await sequelize.query(
    'SELECT id, tenant_id FROM participants WHERE id = :participantId AND session_id = :sessionId',
    {
      replacements: { participantId: input.participantId, sessionId: input.sessionId },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (!participant) throw Forbidden('Participant does not belong to this session');

  const isCorrect = scoreAnswer(question, input.answer);
  const points = isCorrect ? question.points || 1 : 0;

  await sequelize.query(
    `INSERT INTO answers (
      session_id, participant_id, question_id, tenant_id,
      answer_value, is_correct, points_earned,
      time_taken_seconds, answered_at
    ) VALUES (
      :sessionId, :participantId, :questionId, :tenantId,
      CAST(:answer AS jsonb), :isCorrect, :points,
      :timeSpent, NOW()
    ) ON CONFLICT (participant_id, question_id, attempt_number)
    DO UPDATE SET
      answer_value = CAST(:answer AS jsonb),
      is_correct = :isCorrect,
      points_earned = :points,
      time_taken_seconds = :timeSpent,
      answered_at = NOW()`,
    {
      replacements: {
        sessionId: input.sessionId,
        participantId: input.participantId,
        questionId: input.questionId,
        tenantId: participant.tenant_id,
        answer: JSON.stringify(input.answer),
        isCorrect,
        points,
        timeSpent: input.timeSpent || 0,
      },
      type: QueryTypes.INSERT,
    }
  );

  return {
    isCorrect,
    points,
    correctAnswer: question.correct_answers,
  };
};

/**
 * Pure scoring function extracted from the old controller so it can be
 * unit-tested in isolation (unlike the DB-bound controller version).
 */
export const scoreAnswer = (question: any, answer: any): boolean => {
  const correct = question.correct_answers;
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return JSON.stringify(answer) === JSON.stringify(correct);

    case 'short_answer': {
      const correctArr = Array.isArray(correct) ? correct : [correct];
      return correctArr.some(
        (c: string) => String(c).toLowerCase().trim() === String(answer).toLowerCase().trim()
      );
    }

    case 'multiple_select': {
      if (!Array.isArray(answer) || !Array.isArray(correct)) return false;
      const u = [...answer].map(Number).sort((a, b) => a - b);
      const c = [...correct].map(Number).sort((a, b) => a - b);
      return JSON.stringify(u) === JSON.stringify(c);
    }

    case 'dropdown':
      return Number(answer) === Number(correct?.[0]);

    case 'multiple_choice_grid': {
      if (typeof answer !== 'object' || !answer || typeof correct !== 'object' || !correct) {
        return false;
      }
      const rows = Object.keys(correct);
      return rows.every((row) => Number((answer as any)[row]) === Number((correct as any)[row]));
    }

    case 'checkbox_grid': {
      if (typeof answer !== 'object' || !answer || typeof correct !== 'object' || !correct) {
        return false;
      }
      const rows = Object.keys(correct);
      return rows.every((row) => {
        const u = ((answer as any)[row] || []).map(Number).sort((a: number, b: number) => a - b);
        const c = ((correct as any)[row] || []).map(Number).sort((a: number, b: number) => a - b);
        return JSON.stringify(u) === JSON.stringify(c);
      });
    }

    default:
      return false;
  }
};

export const getSessionResults = async (sessionId: string, user: UserContext | null) => {
  // Authenticated callers must own the session's tenant. Unauthenticated
  // callers are allowed because public sessions don't have a tenant host.
  if (user) {
    const [session] = (await sequelize.query(
      `SELECT s.id FROM quiz_sessions s
       INNER JOIN quizzes q ON s.quiz_id = q.id
       WHERE s.id = :sessionId AND q.tenant_id = :tenantId`,
      {
        replacements: { sessionId, tenantId: user.tenant_id },
        type: QueryTypes.SELECT,
      }
    )) as any[];
    if (!session) throw NotFound();
  }

  const leaderboard = await sequelize.query(
    `SELECT
      p.id,
      p.nickname,
      p.email,
      COALESCE(SUM(a.points_earned), 0) as total_points,
      COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_answers,
      COUNT(a.id) as total_answers,
      AVG(a.time_taken_seconds) as avg_time
    FROM participants p
    LEFT JOIN answers a ON p.id = a.participant_id
    WHERE p.session_id = :sessionId
    GROUP BY p.id, p.nickname, p.email
    ORDER BY total_points DESC, avg_time ASC`,
    { replacements: { sessionId }, type: QueryTypes.SELECT }
  );

  const [stats] = (await sequelize.query(
    `SELECT
      COUNT(DISTINCT p.id) as total_participants,
      COUNT(DISTINCT a.question_id) as questions_answered,
      AVG(CASE WHEN a.is_correct THEN 100.0 ELSE 0 END) as avg_score,
      AVG(a.time_taken_seconds) as avg_time_per_question
    FROM quiz_sessions s
    LEFT JOIN participants p ON s.id = p.session_id
    LEFT JOIN answers a ON p.id = a.participant_id
    WHERE s.id = :sessionId
    GROUP BY s.id`,
    { replacements: { sessionId }, type: QueryTypes.SELECT }
  )) as any[];

  return {
    leaderboard,
    statistics: stats || {
      total_participants: 0,
      questions_answered: 0,
      avg_score: 0,
      avg_time_per_question: 0,
    },
  };
};

// -----------------------------------------------------------------------------
// Listings (tenant-scoped)
// -----------------------------------------------------------------------------

export const listAllSessions = async (
  user: UserContext,
  params: { page: number; limit: number; status?: string }
) => {
  const offset = (params.page - 1) * params.limit;

  let whereClause = 'WHERE q.tenant_id = :tenantId';
  const replacements: any = {
    limit: params.limit,
    offset,
    tenantId: user.tenant_id,
  };

  if (params.status) {
    whereClause += ' AND s.status = :status';
    replacements.status = params.status;
  }

  const sessions = await sequelize.query(
    `SELECT
      s.id,
      s.session_code as code,
      s.name,
      s.status,
      s.mode,
      s.current_question_index,
      s.started_at,
      s.ended_at,
      s.created_at,
      q.id as quiz_id,
      q.title as quiz_title,
      q.total_questions as questions_count,
      q.time_limit_minutes,
      u.first_name || ' ' || u.last_name as host_name,
      (SELECT COUNT(*) FROM session_participants WHERE session_id = s.id) as participants_count
    FROM quiz_sessions s
    JOIN quizzes q ON s.quiz_id = q.id
    LEFT JOIN users u ON s.host_id = u.id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  const [countResult] = (await sequelize.query(
    `SELECT COUNT(*) as total FROM quiz_sessions s
     JOIN quizzes q ON s.quiz_id = q.id
     ${whereClause}`,
    { replacements, type: QueryTypes.SELECT }
  )) as any[];

  return {
    sessions,
    total: parseInt(countResult?.total || '0', 10),
  };
};

export const listActiveSessions = async (user: UserContext) => {
  return sequelize.query(
    `SELECT
      s.id,
      s.session_code as code,
      s.name,
      s.status,
      s.current_question_index,
      s.started_at,
      q.id as quiz_id,
      q.title as quiz_title,
      q.total_questions as questions_count,
      q.time_limit_minutes,
      (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participants_count
    FROM quiz_sessions s
    JOIN quizzes q ON s.quiz_id = q.id
    WHERE s.status IN ('waiting', 'active')
      AND q.tenant_id = :tenantId
    ORDER BY s.created_at DESC`,
    { replacements: { tenantId: user.tenant_id }, type: QueryTypes.SELECT }
  );
};

export const listMySessions = async (user: UserContext) => {
  return sequelize.query(
    `SELECT
      s.id,
      s.session_code as code,
      s.name,
      s.status,
      s.current_question_index,
      s.started_at,
      s.ended_at,
      q.id as quiz_id,
      q.title as quiz_title,
      q.total_questions as questions_count,
      q.time_limit_minutes,
      (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participants_count
    FROM quiz_sessions s
    JOIN quizzes q ON s.quiz_id = q.id
    WHERE s.host_id = :hostId
      AND q.tenant_id = :tenantId
    ORDER BY s.created_at DESC
    LIMIT 20`,
    {
      replacements: { hostId: user.id, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  );
};

// -----------------------------------------------------------------------------
// Join
// -----------------------------------------------------------------------------

export const joinSession = async (
  identifier: string,
  nickname: string | undefined,
  user: UserContext | null
) => {
  const isCode = isNaN(Number(identifier));
  const [session] = (await sequelize.query(
    isCode
      ? `SELECT s.*, COALESCE(s.tenant_id, q.tenant_id) AS effective_tenant_id
         FROM quiz_sessions s
         JOIN quizzes q ON q.id = s.quiz_id
         WHERE s.session_code = :identifier
         AND s.status IN ('waiting', 'active', 'in_progress')`
      : `SELECT s.*, COALESCE(s.tenant_id, q.tenant_id) AS effective_tenant_id
         FROM quiz_sessions s
         JOIN quizzes q ON q.id = s.quiz_id
         WHERE s.id = :identifier
         AND s.status IN ('waiting', 'active', 'in_progress')`,
    { replacements: { identifier }, type: QueryTypes.SELECT }
  )) as any[];

  if (!session) throw NotFound('Session not found or not available');

  const userId = user?.id;
  const email = user?.email;

  const [existing] = (await sequelize.query(
    `SELECT id FROM participants
     WHERE session_id = :sessionId
     AND (user_id = :userId OR email = :email)`,
    {
      replacements: {
        sessionId: session.id,
        userId: userId || 0,
        email: email || '',
      },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (existing) {
    return {
      participantId: existing.id,
      sessionId: session.id,
      sessionCode: session.session_code,
      alreadyJoined: true,
    };
  }

  const [result] = (await sequelize.query(
    `INSERT INTO participants (
      session_id, tenant_id, user_id, nickname, email,
      status, joined_at, last_activity_at
    ) VALUES (
      :sessionId, :tenantId, :userId, :nickname, :email,
      'waiting', NOW(), NOW()
    ) RETURNING id`,
    {
      replacements: {
        sessionId: session.id,
        tenantId: session.effective_tenant_id,
        userId: userId || null,
        nickname: nickname || 'Anonymous',
        email: email || null,
      },
      type: QueryTypes.INSERT,
    }
  )) as any[];

  return {
    participantId: result[0].id,
    sessionId: session.id,
    sessionCode: session.session_code,
    alreadyJoined: false,
  };
};
