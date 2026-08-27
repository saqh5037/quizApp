/**
 * quiz.simple.controller.ts — thin HTTP adapter around quiz.service.ts.
 *
 * All business logic (CRUD, tenant isolation, permission checks, AI-quiz
 * branching, raw SQL) lives in src/services/quiz.service.ts. This file only
 * parses requests, maps QuizServiceError → HTTP, and formats responses.
 *
 * Exports preserved 1:1 so src/routes/quiz.routes.ts does not need to change.
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';
import * as quizService from '../services/quiz.service';
import { QuizServiceError } from '../services/quiz.service';

const requireUser = (req: Request): quizService.UserContext | null => {
  const u = (req as any).user;
  if (!u || !u.id || !u.tenant_id) return null;
  return {
    id: u.id,
    tenant_id: u.tenant_id,
    role: u.role,
    organizationId: u.organizationId,
  };
};

const handleServiceError = (res: Response, error: unknown, logContext: string): void => {
  if (error instanceof QuizServiceError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }
  logger.error(logContext, { error });
  res.status(500).json({ success: false, error: 'Internal server error' });
};

// -----------------------------------------------------------------------------
// Public endpoints
// -----------------------------------------------------------------------------

export const getPublicQuizById = async (req: Request, res: Response) => {
  try {
    const quiz = await quizService.findPublicQuizById(req.params.id);
    res.json({
      success: true,
      data: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        coverImageUrl: quiz.cover_image_url,
        difficulty: quiz.difficulty,
        questionsCount: quiz.total_questions || 0,
        timeLimit: (quiz.time_limit_minutes || 10) * 60,
        passPercentage: quiz.pass_percentage || 70,
        createdBy: {
          firstName: quiz.creator_first_name,
          lastName: quiz.creator_last_name,
        },
      },
    });
  } catch (error) {
    handleServiceError(res, error, 'getPublicQuizById failed');
  }
};

export const getPublicQuizzes = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const { quizzes, total } = await quizService.listPublicQuizzes({
      page,
      limit,
      category,
      search,
    });

    res.json({
      success: true,
      data: quizzes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleServiceError(res, error, 'getPublicQuizzes failed');
  }
};

export const getPublicQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { quiz, questions } = await quizService.getPublicQuizQuestions(req.params.id);
    res.json({
      success: true,
      data: {
        quizId: quiz.id,
        title: quiz.title,
        timeLimit: quiz.time_limit_minutes || 10,
        passPercentage: quiz.pass_percentage || 70,
        totalQuestions: quiz.total_questions || questions.length,
        questions,
      },
    });
  } catch (error) {
    handleServiceError(res, error, 'getPublicQuizQuestions failed');
  }
};

// -----------------------------------------------------------------------------
// Authenticated endpoints
// -----------------------------------------------------------------------------

export const getQuizzes = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const { quizzes, total } = await quizService.listQuizzesForUser(user, {
      page,
      limit,
      category,
      search,
    });

    res.json({
      success: true,
      data: quizzes.map((q: any) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category,
        coverImageUrl: q.cover_image_url,
        difficulty: q.difficulty,
        timeLimitMinutes: q.time_limit_minutes,
        estimatedTimeMinutes: q.estimated_time_minutes,
        passPercentage: q.pass_percentage,
        isPublic: q.is_public,
        isActive: q.is_active,
        totalQuestions: q.total_questions || 0,
        timesTaken: q.times_taken || 0,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        creator: q.creator_id
          ? {
              id: q.creator_id,
              firstName: q.creator_first_name,
              lastName: q.creator_last_name,
              email: q.creator_email,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleServiceError(res, error, 'getQuizzes failed');
  }
};

export const getQuizById = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const clientId = parseInt(req.params.id, 10);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid quiz id' });
    }
    const quiz = await quizService.getQuizDetail(clientId, user);
    res.json({ success: true, data: quiz });
  } catch (error) {
    handleServiceError(res, error, 'getQuizById failed');
  }
};

export const createQuiz = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const quiz = await quizService.createQuiz(req.body, user);
    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    handleServiceError(res, error, 'createQuiz failed');
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const clientId = parseInt(req.params.id, 10);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid quiz id' });
    }
    const result = await quizService.updateQuiz(clientId, req.body, user);
    res.json({ success: true, data: result });
  } catch (error) {
    handleServiceError(res, error, 'updateQuiz failed');
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const clientId = parseInt(req.params.id, 10);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid quiz id' });
    }
    const result = await quizService.deleteQuiz(clientId, user);
    res.json({ success: true, ...result });
  } catch (error) {
    handleServiceError(res, error, 'deleteQuiz failed');
  }
};

export const cloneQuiz = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const clientId = parseInt(req.params.id, 10);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: 'Invalid quiz id' });
    }
    const quiz = await quizService.cloneQuiz(clientId, user);
    res.status(201).json({
      success: true,
      data: quiz,
      message: 'Quiz cloned successfully',
    });
  } catch (error) {
    handleServiceError(res, error, 'cloneQuiz failed');
  }
};

export const getQuizQuestions = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const questions = await quizService.getQuizQuestions(req.params.id, user);
    res.json({ success: true, data: questions });
  } catch (error) {
    handleServiceError(res, error, 'getQuizQuestions failed');
  }
};

export default {
  getQuizzes,
  getQuizById,
  getPublicQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  cloneQuiz,
  getPublicQuizzes,
  getQuizQuestions,
  getPublicQuizQuestions,
};
