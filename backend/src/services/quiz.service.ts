/**
 * quiz.service.ts — business logic for quiz CRUD.
 *
 * Extracted from quiz.simple.controller.ts as part of Fase 2 refactor.
 * Controllers should only deal with HTTP concerns (parsing input, choosing
 * status codes, formatting responses). All DB access, tenant isolation,
 * permission checks, and AI-quiz vs regular-quiz branching live here.
 *
 * Two intentional design choices:
 *  1. Raw SQL is preserved. Migrating every query to Sequelize ORM is a
 *     separate, bigger refactor. The service layer still gives us a single
 *     place to enforce tenant filtering and permission checks.
 *  2. AI-generated quizzes use an ID offset (+100000) convention that is
 *     baked into the frontend. We keep it, but hide it behind helpers
 *     (isAiQuizId / toAiQuizId / toClientAiQuizId) so the controller never
 *     has to know.
 */

import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import logger from '../utils/logger';

export const AI_QUIZ_ID_OFFSET = 100_000;

export const isAiQuizId = (id: number): boolean => id > AI_QUIZ_ID_OFFSET;
export const toAiQuizId = (clientId: number): number => clientId - AI_QUIZ_ID_OFFSET;
export const toClientAiQuizId = (aiId: number): number => aiId + AI_QUIZ_ID_OFFSET;

export class QuizServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const NotFound = (msg = 'Quiz not found') => new QuizServiceError(msg, 404);
export const Forbidden = (msg = 'You do not have permission for this quiz') =>
  new QuizServiceError(msg, 403);
export const BadRequest = (msg: string) => new QuizServiceError(msg, 400);
export const ServerError = (msg = 'Internal server error') => new QuizServiceError(msg, 500);

export interface UserContext {
  id: number;
  tenant_id: number;
  role?: string;
  organizationId?: number;
}

const isPrivileged = (role?: string) =>
  role === 'admin' || role === 'super_admin' || role === 'tenant_admin';

// -----------------------------------------------------------------------------
// Public (anonymous) lookups
// -----------------------------------------------------------------------------

export const findPublicQuizById = async (id: string | number) => {
  const [quiz] = (await sequelize.query(
    `SELECT
      q.id,
      q.title,
      q.description,
      q.category,
      q.cover_image_url,
      q.difficulty,
      q.time_limit_minutes,
      q.pass_percentage,
      q.is_public,
      q.is_active,
      q.total_questions,
      q.times_taken,
      q.created_at,
      q.updated_at,
      q.tenant_id,
      u.id as creator_id,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name
    FROM quizzes q
    LEFT JOIN users u ON q.creator_id = u.id
    WHERE q.id = :id AND q.is_public = true AND q.is_active = true`,
    { replacements: { id }, type: QueryTypes.SELECT }
  )) as any[];

  if (!quiz) throw NotFound('Quiz not found or not publicly available');
  return quiz;
};

export const listPublicQuizzes = async (params: {
  page: number;
  limit: number;
  category?: string;
  search?: string;
}) => {
  const offset = (params.page - 1) * params.limit;
  const whereConditions = [
    'q.is_public = true AND q.is_active = true',
    'q.deleted_at IS NULL',
  ];
  const replacements: any = { limit: params.limit, offset };

  if (params.category) {
    whereConditions.push('q.category = :category');
    replacements.category = params.category;
  }
  if (params.search) {
    whereConditions.push('(q.title ILIKE :search OR q.description ILIKE :search)');
    replacements.search = `%${params.search}%`;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const quizzes = await sequelize.query(
    `SELECT
      q.id,
      q.title,
      q.description,
      q.category,
      q.cover_image_url,
      q.difficulty,
      q.estimated_time_minutes,
      q.total_questions,
      q.times_taken,
      q.average_score,
      q.created_at,
      q.tenant_id,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name
    FROM quizzes q
    LEFT JOIN users u ON q.creator_id = u.id
    ${whereClause}
    ORDER BY q.times_taken DESC, q.created_at DESC
    LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  const [countResult] = (await sequelize.query(
    `SELECT COUNT(*) as total FROM quizzes q ${whereClause}`,
    { replacements, type: QueryTypes.SELECT }
  )) as any[];

  return { quizzes, total: parseInt(countResult?.total || '0', 10) };
};

export const getPublicQuizQuestions = async (id: string | number) => {
  const [quiz] = (await sequelize.query(
    `SELECT id, title, time_limit_minutes, pass_percentage, total_questions, tenant_id
     FROM quizzes
     WHERE id = :id AND is_public = true AND is_active = true`,
    { replacements: { id }, type: QueryTypes.SELECT }
  )) as any[];

  if (!quiz) throw NotFound('Quiz not found or not publicly available');

  const questions = (await sequelize.query(
    `SELECT
      id,
      question_text,
      question_type,
      question_image_url,
      difficulty,
      points,
      time_limit_seconds,
      order_position,
      options
    FROM questions
    WHERE quiz_id = :quizId
    ORDER BY order_position ASC, id ASC`,
    { replacements: { quizId: id }, type: QueryTypes.SELECT }
  )) as any[];

  // Strip is_correct from choices before returning to anonymous clients
  const sanitized = questions.map((q: any) => {
    if (q.options && q.options.choices) {
      q.options.choices = q.options.choices.map((choice: any) => ({
        id: choice.id,
        text: choice.text,
      }));
    }
    return q;
  });

  return { quiz, questions: sanitized };
};

// -----------------------------------------------------------------------------
// Authenticated lookups (tenant-scoped)
// -----------------------------------------------------------------------------

export const listQuizzesForUser = async (
  user: UserContext,
  params: { page: number; limit: number; category?: string; search?: string }
) => {
  const offset = (params.page - 1) * params.limit;
  const whereConditions = [
    '(q.tenant_id = :tenantId OR q.tenant_id IS NULL)',
    '(q.is_public = true OR q.creator_id = :userId)',
    'q.deleted_at IS NULL',
  ];
  const replacements: any = {
    userId: user.id,
    tenantId: user.tenant_id,
    limit: params.limit,
    offset,
  };

  if (params.category) {
    whereConditions.push('q.category = :category');
    replacements.category = params.category;
  }
  if (params.search) {
    whereConditions.push('(q.title ILIKE :search OR q.description ILIKE :search)');
    replacements.search = `%${params.search}%`;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const quizzes = await sequelize.query(
    `SELECT
      q.id,
      q.title,
      q.description,
      q.category,
      q.cover_image_url,
      q.difficulty,
      q.time_limit_minutes,
      q.estimated_time_minutes,
      q.pass_percentage,
      q.is_public,
      q.is_active,
      q.total_questions,
      q.times_taken,
      q.created_at,
      q.updated_at,
      q.tenant_id,
      u.id as creator_id,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      u.email as creator_email
    FROM quizzes q
    LEFT JOIN users u ON q.creator_id = u.id
    ${whereClause}
    ORDER BY q.created_at DESC
    LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  const [countResult] = (await sequelize.query(
    `SELECT COUNT(*) as total FROM quizzes q ${whereClause}`,
    { replacements, type: QueryTypes.SELECT }
  )) as any[];

  const regularTotal = parseInt(countResult?.total || '0', 10);

  // Merge in AI-generated quizzes unless the caller filtered to a non-AI category
  let aiQuizzes: any[] = [];
  let aiTotal = 0;

  if (!params.category || params.category === 'AI Generated') {
    const aiSearchClause = params.search
      ? 'AND (title ILIKE :aiSearch OR description ILIKE :aiSearch)'
      : '';

    const aiQuizResults = (await sequelize.query(
      `SELECT
        id,
        title,
        description,
        difficulty,
        question_count,
        status,
        created_at,
        updated_at,
        user_id,
        tenant_id
      FROM ai_generated_quizzes
      WHERE status = 'ready' AND tenant_id = :aiTenantId ${aiSearchClause}
      ORDER BY created_at DESC
      LIMIT :aiLimit OFFSET :aiOffset`,
      {
        replacements: {
          aiTenantId: user.tenant_id,
          aiLimit:
            params.category === 'AI Generated'
              ? params.limit
              : Math.max(0, params.limit - quizzes.length),
          aiOffset: params.category === 'AI Generated' ? offset : 0,
          aiSearch: params.search ? `%${params.search}%` : '',
        },
        type: QueryTypes.SELECT,
      }
    )) as any[];

    const [aiCountResult] = (await sequelize.query(
      `SELECT COUNT(*) as total FROM ai_generated_quizzes
       WHERE status = 'ready' AND tenant_id = :aiTenantId ${aiSearchClause}`,
      {
        replacements: {
          aiTenantId: user.tenant_id,
          aiSearch: params.search ? `%${params.search}%` : '',
        },
        type: QueryTypes.SELECT,
      }
    )) as any[];

    aiTotal = parseInt(aiCountResult?.total || '0', 10);

    aiQuizzes = aiQuizResults.map((q: any) => ({
      id: toClientAiQuizId(q.id),
      title: q.title,
      description: q.description || 'Quiz generado por IA',
      category: 'AI Generated',
      cover_image_url: null,
      difficulty: q.difficulty || 'medium',
      // AI-generated quizzes have no configured time limit; the client falls
      // back to estimated_time_minutes when this is null (see A9 fix).
      time_limit_minutes: null,
      estimated_time_minutes: 10,
      pass_percentage: 70,
      is_public: true,
      is_active: true,
      total_questions: q.question_count || 0,
      times_taken: 0,
      created_at: q.created_at,
      updated_at: q.updated_at,
      creator_id: q.user_id || 1,
      creator_first_name: 'IA',
      creator_last_name: 'Gemini',
      creator_email: 'ai@aristotest.com',
      tenant_id: q.tenant_id,
    }));
  }

  const combined =
    params.category === 'AI Generated' ? aiQuizzes : [...(quizzes as any[]), ...aiQuizzes];
  const total = params.category === 'AI Generated' ? aiTotal : regularTotal + aiTotal;

  return { quizzes: combined, total };
};

export const getQuizDetail = async (clientId: number, user: UserContext) => {
  if (isAiQuizId(clientId)) {
    return getAiQuizDetail(clientId, user);
  }
  return getRegularQuizDetail(clientId, user);
};

const getAiQuizDetail = async (clientId: number, user: UserContext) => {
  const aiId = toAiQuizId(clientId);

  const [aiQuiz] = (await sequelize.query(
    `SELECT
      aq.*,
      u.id as creator_id,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      u.email as creator_email
    FROM ai_generated_quizzes aq
    LEFT JOIN users u ON aq.user_id = u.id
    WHERE aq.id = :id AND aq.status = 'ready' AND aq.tenant_id = :tenantId`,
    {
      replacements: { id: aiId, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (!aiQuiz) throw NotFound('AI Quiz not found');

  let questions: any[] = [];
  try {
    let raw = typeof aiQuiz.questions === 'string' ? JSON.parse(aiQuiz.questions || '[]') : aiQuiz.questions || [];
    if (raw && !Array.isArray(raw) && Array.isArray(raw.questions)) raw = raw.questions;
    questions = Array.isArray(raw) ? raw : [];
  } catch (e) {
    logger.warn('Failed to parse AI quiz questions', { quizId: clientId, error: e });
  }

  return {
    id: clientId,
    title: aiQuiz.title,
    description: aiQuiz.description || 'Quiz generado por IA',
    category: 'AI Generated',
    difficulty: aiQuiz.difficulty || 'medium',
    is_public: true,
    is_active: true,
    creator_id: aiQuiz.user_id,
    pass_percentage: 70,
    estimated_time_minutes: 10,
    created_at: aiQuiz.created_at,
    updated_at: aiQuiz.updated_at,
    tenant_id: aiQuiz.tenant_id,
    creator: aiQuiz.creator_id
      ? {
          id: aiQuiz.creator_id,
          firstName: aiQuiz.creator_first_name,
          lastName: aiQuiz.creator_last_name,
          email: aiQuiz.creator_email,
        }
      : null,
    questions: questions.map((q: any, index: number) => ({
      id: index + 1,
      quiz_id: clientId,
      type: q.type || 'multiple_choice',
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      points: q.points || 1,
      order_position: index,
    })),
  };
};

const getRegularQuizDetail = async (id: number, user: UserContext) => {
  const replacements: any = { id, userId: user.id, tenantId: user.tenant_id };
  const whereClause = isPrivileged(user.role)
    ? 'WHERE q.id = :id AND (q.tenant_id = :tenantId OR q.tenant_id IS NULL) AND q.deleted_at IS NULL'
    : 'WHERE q.id = :id AND (q.tenant_id = :tenantId OR q.tenant_id IS NULL) AND (q.is_public = true OR q.creator_id = :userId) AND q.deleted_at IS NULL';

  const [quiz] = (await sequelize.query(
    `SELECT
      q.*,
      u.id as creator_id,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      u.email as creator_email
    FROM quizzes q
    LEFT JOIN users u ON q.creator_id = u.id
    ${whereClause}`,
    { replacements, type: QueryTypes.SELECT }
  )) as any[];

  if (!quiz) throw NotFound('Quiz not found');

  const questions = await sequelize.query(
    `SELECT * FROM questions WHERE quiz_id = :quizId ORDER BY order_position`,
    { replacements: { quizId: id }, type: QueryTypes.SELECT }
  );

  return {
    ...quiz,
    creator: quiz.creator_id
      ? {
          id: quiz.creator_id,
          firstName: quiz.creator_first_name,
          lastName: quiz.creator_last_name,
          email: quiz.creator_email,
        }
      : null,
    questions,
  };
};

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

export interface CreateQuizInput {
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  questions?: any[];
  settings?: any;
  isPublic?: boolean;
  timeLimitMinutes?: number;
  timeLimit?: number;
  passPercentage?: number;
  passingScore?: number;
}

export const createQuiz = async (input: CreateQuizInput, user: UserContext) => {
  if (!input.title || !input.title.trim()) {
    throw BadRequest('Title is required');
  }

  const questions = Array.isArray(input.questions) ? input.questions : [];
  const settings = input.settings || {};
  const organizationId = user.organizationId || 1;

  return sequelize.transaction(async (transaction) => {
    const [quizResult] = (await sequelize.query(
      `INSERT INTO quizzes (
        title, description, creator_id, organization_id, tenant_id, category,
        difficulty, is_public, is_active,
        shuffle_questions, shuffle_options, show_correct_answers,
        show_score, allow_review, time_limit_minutes, pass_percentage,
        settings, metadata, created_at, updated_at
      ) VALUES (
        :title, :description, :creatorId, :organizationId, :tenantId, :category,
        :difficulty, :isPublic, true,
        :shuffleQuestions, :shuffleOptions, :showCorrectAnswers,
        :showScore, :allowReview, :timeLimitMinutes, :passPercentage,
        :settings, :metadata, NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          title: input.title,
          description: input.description || null,
          creatorId: user.id,
          organizationId,
          tenantId: user.tenant_id,
          category: input.category || 'General',
          difficulty: input.difficulty || 'medium',
          isPublic: input.isPublic || false,
          shuffleQuestions: settings.shuffleQuestions || false,
          shuffleOptions: settings.shuffleOptions || false,
          showCorrectAnswers: settings.showCorrectAnswers !== false,
          showScore: settings.showScore !== false,
          allowReview: settings.allowReview !== false,
          timeLimitMinutes: input.timeLimitMinutes ?? input.timeLimit ?? null,
          passPercentage: input.passPercentage ?? input.passingScore ?? 60,
          settings: JSON.stringify(settings),
          metadata: JSON.stringify({}),
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    )) as any[];

    const quiz = quizResult[0];
    if (questions.length > 0) {
      await insertQuestions(quiz.id, questions, transaction);
    }
    return quiz;
  });
};

const insertQuestions = async (
  quizId: number,
  questions: any[],
  transaction: Transaction
) => {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await sequelize.query(
      `INSERT INTO questions (
        quiz_id, question_text, question_type, options,
        correct_answers, explanation, points, order_position,
        difficulty, metadata, created_at, updated_at
      ) VALUES (
        :quizId, :questionText, :questionType, :options,
        :correctAnswers, :explanation, :points, :orderPosition,
        :difficulty, :metadata, NOW(), NOW()
      )`,
      {
        replacements: {
          quizId,
          questionText: q.questionText || q.question,
          questionType: q.questionType || q.type || 'multiple_choice',
          options: JSON.stringify(q.options || []),
          correctAnswers: JSON.stringify(q.correctAnswers || q.correctAnswer),
          explanation: q.explanation || null,
          points: q.points || 1,
          orderPosition: i,
          difficulty: q.difficulty || 'medium',
          metadata: JSON.stringify({}),
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
  }
};

/**
 * Fetch a quiz (regular or AI) enforcing tenant isolation AND permission
 * (owner or admin/super_admin/tenant_admin). Throws the appropriate
 * QuizServiceError on failure.
 */
const assertCanModify = async (
  clientId: number,
  user: UserContext,
  transaction?: Transaction
): Promise<{ kind: 'ai'; row: any; internalId: number } | { kind: 'regular'; row: any }> => {
  if (isAiQuizId(clientId)) {
    const aiId = toAiQuizId(clientId);
    const [aiQuiz] = (await sequelize.query(
      'SELECT * FROM ai_generated_quizzes WHERE id = :id AND tenant_id = :tenantId',
      {
        replacements: { id: aiId, tenantId: user.tenant_id },
        type: QueryTypes.SELECT,
        transaction,
      }
    )) as any[];
    if (!aiQuiz) throw NotFound('AI Quiz not found');
    if (aiQuiz.user_id !== user.id && !isPrivileged(user.role)) {
      throw Forbidden('You do not have permission to modify this AI quiz');
    }
    return { kind: 'ai', row: aiQuiz, internalId: aiId };
  }

  const [quiz] = (await sequelize.query(
    'SELECT * FROM quizzes WHERE id = :id AND tenant_id = :tenantId AND deleted_at IS NULL',
    {
      replacements: { id: clientId, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
      transaction,
    }
  )) as any[];
  if (!quiz) throw NotFound('Quiz not found');
  if (quiz.creator_id !== user.id && !isPrivileged(user.role)) {
    throw Forbidden('You do not have permission to modify this quiz');
  }
  return { kind: 'regular', row: quiz };
};

export const updateQuiz = async (
  clientId: number,
  updates: any,
  user: UserContext
) => {
  return sequelize.transaction(async (transaction) => {
    const target = await assertCanModify(clientId, user, transaction);

    if (target.kind === 'ai') {
      return updateAiQuiz(target.internalId, target.row, updates, transaction, clientId);
    }
    return updateRegularQuiz(clientId, updates, transaction);
  });
};

const updateAiQuiz = async (
  aiId: number,
  existing: any,
  updates: any,
  transaction: Transaction,
  clientId: number
) => {
  const updateFields: string[] = [];
  const replacements: any = { id: aiId };

  if (updates.title !== undefined) {
    updateFields.push('title = :title');
    replacements.title = updates.title;
  }
  if (updates.description !== undefined) {
    updateFields.push('description = :description');
    replacements.description = updates.description;
  }
  if (updates.difficulty !== undefined) {
    updateFields.push('difficulty = :difficulty');
    replacements.difficulty = updates.difficulty;
  }

  if (Array.isArray(updates.questions)) {
    const questionsData = updates.questions.map((q: any) => ({
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      points: q.points || 1,
    }));
    updateFields.push('questions = :questionsData');
    replacements.questionsData = JSON.stringify(questionsData);
    updateFields.push('question_count = :questionCount');
    replacements.questionCount = updates.questions.length;
  }

  updateFields.push('updated_at = NOW()');

  if (updateFields.length > 0) {
    await sequelize.query(
      `UPDATE ai_generated_quizzes SET ${updateFields.join(', ')} WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE, transaction }
    );
  }

  return {
    quiz: {
      id: clientId,
      title: updates.title || existing.title,
      description: updates.description || existing.description,
      category: 'AI Generated',
      questions: updates.questions || [],
    },
  };
};

const updateRegularQuiz = async (id: number, updates: any, transaction: Transaction) => {
  const updateFields: string[] = [];
  const replacements: any = { id };

  if (updates.title !== undefined) {
    updateFields.push('title = :title');
    replacements.title = updates.title;
  }
  if (updates.description !== undefined) {
    updateFields.push('description = :description');
    replacements.description = updates.description;
  }
  if (updates.category !== undefined) {
    updateFields.push('category = :category');
    replacements.category = updates.category;
  }
  if (updates.difficulty !== undefined) {
    updateFields.push('difficulty = :difficulty');
    replacements.difficulty = updates.difficulty;
  }
  if (updates.isPublic !== undefined) {
    updateFields.push('is_public = :isPublic');
    replacements.isPublic = updates.isPublic;
  }
  if (updates.settings !== undefined) {
    updateFields.push('settings = :settings');
    replacements.settings = JSON.stringify(updates.settings);
  }
  if (updates.timeLimitMinutes !== undefined || updates.timeLimit !== undefined) {
    updateFields.push('time_limit_minutes = :timeLimitMinutes');
    replacements.timeLimitMinutes = updates.timeLimitMinutes ?? updates.timeLimit;
  }
  if (updates.passPercentage !== undefined || updates.passingScore !== undefined) {
    updateFields.push('pass_percentage = :passPercentage');
    replacements.passPercentage = updates.passPercentage ?? updates.passingScore;
  }

  updateFields.push('updated_at = NOW()');

  await sequelize.query(
    `UPDATE quizzes SET ${updateFields.join(', ')} WHERE id = :id`,
    { replacements, type: QueryTypes.UPDATE, transaction }
  );

  if (Array.isArray(updates.questions)) {
    await sequelize.query('DELETE FROM questions WHERE quiz_id = :quizId', {
      replacements: { quizId: id },
      type: QueryTypes.DELETE,
      transaction,
    });
    await insertQuestions(id, updates.questions, transaction);
    await sequelize.query(
      'UPDATE quizzes SET total_questions = :count WHERE id = :id',
      {
        replacements: { count: updates.questions.length, id },
        type: QueryTypes.UPDATE,
        transaction,
      }
    );
  }

  return { message: 'Quiz updated successfully' };
};

export const deleteQuiz = async (clientId: number, user: UserContext) => {
  const target = await assertCanModify(clientId, user);

  if (target.kind === 'ai') {
    await sequelize.query(
      'DELETE FROM ai_generated_quizzes WHERE id = :id AND tenant_id = :tenantId',
      {
        replacements: { id: target.internalId, tenantId: user.tenant_id },
        type: QueryTypes.DELETE,
      }
    );
    return { message: 'AI Quiz deleted successfully' };
  }

  await sequelize.query(
    'UPDATE quizzes SET deleted_at = NOW() WHERE id = :id AND tenant_id = :tenantId',
    {
      replacements: { id: clientId, tenantId: user.tenant_id },
      type: QueryTypes.UPDATE,
    }
  );
  return { message: 'Quiz deleted successfully' };
};

export const cloneQuiz = async (clientId: number, user: UserContext) => {
  return sequelize.transaction(async (transaction) => {
    // Load the source (tenant-scoped; any tenant member can clone a quiz they
    // can read, matching the previous behavior).
    let originalQuiz: any;
    let questions: any[] = [];

    if (isAiQuizId(clientId)) {
      const aiId = toAiQuizId(clientId);
      const [aiQuiz] = (await sequelize.query(
        'SELECT * FROM ai_generated_quizzes WHERE id = :id AND tenant_id = :tenantId',
        {
          replacements: { id: aiId, tenantId: user.tenant_id },
          type: QueryTypes.SELECT,
          transaction,
        }
      )) as any[];

      if (!aiQuiz) throw NotFound('AI-generated quiz not found');

      originalQuiz = {
        title: aiQuiz.title,
        description: aiQuiz.description || '',
        category: aiQuiz.category || 'General',
        difficulty: aiQuiz.difficulty || 'Intermediate',
        total_questions: aiQuiz.question_count || 0,
        estimated_time_minutes: 10,
        pass_percentage: 70,
        max_attempts: 3,
        instructions: aiQuiz.instructions || '',
        tags: aiQuiz.tags || [],
        shuffle_questions: false,
        shuffle_options: false,
        show_correct_answers: true,
        show_score: true,
        allow_review: true,
        cover_image_url: null,
        settings: {},
        metadata: aiQuiz.metadata || {},
      };

      if (aiQuiz.questions) {
        const parsed =
          typeof aiQuiz.questions === 'string' ? JSON.parse(aiQuiz.questions) : aiQuiz.questions;
        const arr = Array.isArray(parsed) ? parsed : parsed?.questions || [];
        questions = arr.map((q: any, index: number) => ({
          question_text: q.question || q.text || '',
          question_type: q.type || 'multiple_choice',
          options: q.options || [],
          correct_answers:
            q.correctAnswer !== undefined && q.correctAnswer !== null
              ? [q.correctAnswer]
              : q.correct || [0],
          explanation: q.explanation || '',
          points: q.points || 10,
          order_position: index,
          difficulty: q.difficulty || 'medium',
          is_required: true,
          hint: null,
          question_image_url: null,
          negative_points: 0,
          time_limit_seconds: null,
          validation_rules: null,
          metadata: null,
        }));
      }
    } else {
      const [regularQuiz] = (await sequelize.query(
        `SELECT * FROM quizzes
         WHERE id = :id
           AND tenant_id = :tenantId
           AND (is_public = true OR creator_id = :userId)
           AND deleted_at IS NULL`,
        {
          replacements: { id: clientId, userId: user.id, tenantId: user.tenant_id },
          type: QueryTypes.SELECT,
          transaction,
        }
      )) as any[];

      if (!regularQuiz) throw NotFound('Quiz not found or you do not have permission to clone it');
      originalQuiz = regularQuiz;

      questions = (await sequelize.query(
        'SELECT * FROM questions WHERE quiz_id = :quizId ORDER BY order_position',
        {
          replacements: { quizId: clientId },
          type: QueryTypes.SELECT,
          transaction,
        }
      )) as any[];
    }

    const [newQuizResult] = (await sequelize.query(
      `INSERT INTO quizzes (
        title, description, creator_id, organization_id, tenant_id, category,
        difficulty, is_public, is_active,
        shuffle_questions, shuffle_options, show_correct_answers,
        show_score, allow_review, settings, metadata,
        estimated_time_minutes, pass_percentage, max_attempts,
        instructions, tags, cover_image_url,
        created_at, updated_at
      ) VALUES (
        :title, :description, :creatorId, :organizationId, :tenantId, :category,
        :difficulty, false, true,
        :shuffleQuestions, :shuffleOptions, :showCorrectAnswers,
        :showScore, :allowReview, :settings, :metadata,
        :estimatedTimeMinutes, :passPercentage, :maxAttempts,
        :instructions, :tags, :coverImageUrl,
        NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          title: `Copy of ${originalQuiz.title}`,
          description: originalQuiz.description,
          creatorId: user.id,
          organizationId: user.organizationId || 1,
          tenantId: user.tenant_id,
          category: originalQuiz.category,
          difficulty: originalQuiz.difficulty,
          shuffleQuestions: originalQuiz.shuffle_questions,
          shuffleOptions: originalQuiz.shuffle_options,
          showCorrectAnswers: originalQuiz.show_correct_answers,
          showScore: originalQuiz.show_score,
          allowReview: originalQuiz.allow_review,
          settings:
            typeof originalQuiz.settings === 'object'
              ? JSON.stringify(originalQuiz.settings || {})
              : originalQuiz.settings || '{}',
          metadata:
            typeof originalQuiz.metadata === 'object'
              ? JSON.stringify(originalQuiz.metadata || {})
              : originalQuiz.metadata || '{}',
          estimatedTimeMinutes: originalQuiz.estimated_time_minutes,
          passPercentage: originalQuiz.pass_percentage,
          maxAttempts: originalQuiz.max_attempts,
          instructions: originalQuiz.instructions,
          tags: Array.isArray(originalQuiz.tags)
            ? `{${originalQuiz.tags.map((t: string) => `"${t}"`).join(',')}}`
            : originalQuiz.tags || '{}',
          coverImageUrl: originalQuiz.cover_image_url,
        },
        type: QueryTypes.INSERT,
        transaction,
      }
    )) as any[];

    const newQuiz = newQuizResult[0];

    for (const q of questions) {
      await sequelize.query(
        `INSERT INTO questions (
          quiz_id, question_text, question_type, question_image_url,
          explanation, hint, difficulty, points, negative_points,
          time_limit_seconds, order_position, is_required,
          options, correct_answers, validation_rules, metadata,
          created_at, updated_at
        ) VALUES (
          :quizId, :questionText, :questionType, :questionImageUrl,
          :explanation, :hint, :difficulty, :points, :negativePoints,
          :timeLimitSeconds, :orderPosition, :isRequired,
          :options, :correctAnswers, :validationRules, :metadata,
          NOW(), NOW()
        )`,
        {
          replacements: {
            quizId: newQuiz.id,
            questionText: (q as any).question_text,
            questionType: (q as any).question_type,
            questionImageUrl: (q as any).question_image_url,
            explanation: (q as any).explanation,
            hint: (q as any).hint,
            difficulty: (q as any).difficulty,
            points: (q as any).points,
            negativePoints: (q as any).negative_points,
            timeLimitSeconds: (q as any).time_limit_seconds,
            orderPosition: (q as any).order_position,
            isRequired: (q as any).is_required,
            options:
              typeof (q as any).options === 'object'
                ? JSON.stringify((q as any).options || [])
                : (q as any).options || '[]',
            correctAnswers:
              typeof (q as any).correct_answers === 'object'
                ? JSON.stringify((q as any).correct_answers || [])
                : (q as any).correct_answers || '[]',
            validationRules:
              typeof (q as any).validation_rules === 'object'
                ? JSON.stringify((q as any).validation_rules || {})
                : (q as any).validation_rules || '{}',
            metadata:
              typeof (q as any).metadata === 'object'
                ? JSON.stringify((q as any).metadata || {})
                : (q as any).metadata || '{}',
          },
          type: QueryTypes.INSERT,
          transaction,
        }
      );
    }

    await sequelize.query(
      'UPDATE quizzes SET total_questions = :count WHERE id = :id',
      {
        replacements: { count: questions.length, id: newQuiz.id },
        type: QueryTypes.UPDATE,
        transaction,
      }
    );

    const [completeQuiz] = (await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :id',
      { replacements: { id: newQuiz.id }, type: QueryTypes.SELECT, transaction }
    )) as any[];

    return completeQuiz || newQuiz;
  });
};

export const getQuizQuestions = async (id: string | number, user: UserContext) => {
  const [quiz] = (await sequelize.query(
    `SELECT id, title FROM quizzes
     WHERE id = :id
       AND tenant_id = :tenantId
       AND (is_public = true OR creator_id = :userId)`,
    {
      replacements: { id, userId: user.id, tenantId: user.tenant_id },
      type: QueryTypes.SELECT,
    }
  )) as any[];

  if (!quiz) throw NotFound('Quiz not found or access denied');

  const questions = (await sequelize.query(
    `SELECT
      id,
      quiz_id,
      question_text,
      question_type,
      question_image_url,
      explanation,
      hint,
      difficulty,
      points,
      negative_points,
      time_limit_seconds,
      order_position,
      is_required,
      options,
      correct_answers,
      validation_rules,
      metadata,
      created_at,
      updated_at
    FROM questions
    WHERE quiz_id = :quizId
    ORDER BY order_position`,
    { replacements: { quizId: id }, type: QueryTypes.SELECT }
  )) as any[];

  return questions;
};
