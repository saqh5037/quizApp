/**
 * ai-quiz.controller.ts — thin HTTP adapter for the Fase 5 AI quiz endpoints.
 *
 * Delegates all logic to ai-quiz.service.ts. The legacy handlers in
 * ai-gemini.controller.ts are kept for backwards compatibility with the
 * existing "generate from manual" page — these new endpoints are the
 * preferred path going forward.
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';
import * as aiQuizService from '../services/ai-quiz.service';
import { AIQuizServiceError } from '../services/ai-quiz.service';

const requireUser = (req: Request): aiQuizService.UserContext | null => {
  const u = (req as any).user;
  if (!u || !u.id || !u.tenant_id) return null;
  return { id: u.id, tenant_id: u.tenant_id };
};

const handleError = (res: Response, error: unknown, logContext: string): void => {
  if (error instanceof AIQuizServiceError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }
  logger.error(logContext, { error });
  res.status(500).json({ success: false, error: 'Internal server error' });
};

/**
 * POST /api/v1/ai/generate-quiz-from-text
 *
 * Body:
 *   title: string
 *   sourceText: string           (200..60000 chars)
 *   numberOfQuestions: number    (3..30)
 *   difficulty?: 'easy'|'medium'|'hard'
 *   questionTypes?: QuestionType[]
 *   language?: 'es'|'en'
 */
export const generateFromText = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const record = await aiQuizService.generateQuizFromText(
      {
        title: req.body.title,
        sourceText: req.body.sourceText,
        numberOfQuestions: req.body.numberOfQuestions,
        difficulty: req.body.difficulty,
        questionTypes: req.body.questionTypes,
        language: req.body.language,
      },
      user
    );

    res.status(201).json({
      success: true,
      data: {
        id: record.id,
        title: record.title,
        description: record.description,
        difficulty: record.difficulty,
        questionCount: record.question_count,
        questions: (record.questions as any)?.questions || [],
        status: record.status,
        createdAt: record.created_at,
      },
    });
  } catch (error) {
    handleError(res, error, 'generateFromText failed');
  }
};

/**
 * POST /api/v1/ai/generate-quiz-from-manual
 *
 * Body:
 *   manualId: number
 *   title?: string
 *   numberOfQuestions: number
 *   difficulty?, questionTypes?, language? (as above)
 */
export const generateFromManual = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const record = await aiQuizService.generateQuizFromManual(
      {
        manualId: req.body.manualId,
        title: req.body.title,
        numberOfQuestions: req.body.numberOfQuestions,
        difficulty: req.body.difficulty,
        questionTypes: req.body.questionTypes,
        language: req.body.language,
      },
      user
    );

    res.status(201).json({
      success: true,
      data: {
        id: record.id,
        title: record.title,
        description: record.description,
        difficulty: record.difficulty,
        questionCount: record.question_count,
        questions: (record.questions as any)?.questions || [],
        status: record.status,
        createdAt: record.created_at,
      },
    });
  } catch (error) {
    handleError(res, error, 'generateFromManual failed');
  }
};

/**
 * GET /api/v1/ai/generated-quiz/:id
 */
export const getGenerated = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const record = await aiQuizService.getGeneratedQuiz(id, user);
    res.json({
      success: true,
      data: {
        id: record.id,
        title: record.title,
        description: record.description,
        difficulty: record.difficulty,
        questionCount: record.question_count,
        questions: (record.questions as any)?.questions || [],
        status: record.status,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      },
    });
  } catch (error) {
    handleError(res, error, 'getGenerated failed');
  }
};
