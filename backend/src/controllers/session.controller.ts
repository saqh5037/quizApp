/**
 * session.controller.ts — thin HTTP adapter around session.service.ts.
 *
 * All business logic (tenant isolation, permission checks, raw SQL, scoring)
 * lives in src/services/session.service.ts. This file only parses requests,
 * maps SessionServiceError → HTTP, and formats responses.
 *
 * The 11 exports are preserved so src/routes/session.routes.ts does not
 * need to change.
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';
import * as sessionService from '../services/session.service';
import { SessionServiceError } from '../services/session.service';

const requireUser = (req: Request): sessionService.UserContext | null => {
  const u = (req as any).user;
  if (!u || !u.id || !u.tenant_id) return null;
  return {
    id: u.id,
    tenant_id: u.tenant_id,
    role: u.role,
    email: u.email,
  };
};

const optionalUser = (req: Request): sessionService.UserContext | null => {
  const u = (req as any).user;
  if (!u || !u.id || !u.tenant_id) return null;
  return {
    id: u.id,
    tenant_id: u.tenant_id,
    role: u.role,
    email: u.email,
  };
};

const handleError = (res: Response, error: unknown, logContext: string): void => {
  if (error instanceof SessionServiceError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }
  logger.error(logContext, { error });
  res.status(500).json({ success: false, error: 'Internal server error' });
};

// -----------------------------------------------------------------------------
// Public endpoints
// -----------------------------------------------------------------------------

export const createPublicSession = async (req: Request, res: Response) => {
  try {
    const result = await sessionService.createPublicSession({
      quizId: req.body.quizId,
      participant: req.body.participant,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'createPublicSession failed');
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const session = await sessionService.getSession(req.params.id, optionalUser(req));
    res.json({
      success: true,
      data: {
        id: session.id,
        code: session.session_code,
        name: session.name,
        status: session.status,
        currentQuestionIndex: session.current_question_index,
        quiz: {
          id: session.quiz_id,
          title: session.quiz_title,
          questionsCount: session.total_questions || 0,
        },
        participantsCount: parseInt(session.participants_count, 10) || 0,
        settings: session.settings,
        startedAt: session.started_at,
        endedAt: session.ended_at,
      },
    });
  } catch (error) {
    handleError(res, error, 'getSession failed');
  }
};

export const getCurrentQuestion = async (req: Request, res: Response) => {
  try {
    const result = await sessionService.getCurrentQuestion(req.params.id);
    if (!result) {
      return res.json({ success: true, data: null, message: 'No more questions' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'getCurrentQuestion failed');
  }
};

export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { sessionId, participantId, questionId, answer, timeSpent } = req.body;
    if (!sessionId || !participantId || !questionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, participantId, and questionId are required',
      });
    }
    const result = await sessionService.submitAnswer({
      sessionId,
      participantId,
      questionId,
      answer,
      timeSpent,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'submitAnswer failed');
  }
};

export const getSessionResults = async (req: Request, res: Response) => {
  try {
    const result = await sessionService.getSessionResults(req.params.id, optionalUser(req));
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'getSessionResults failed');
  }
};

export const joinSession = async (req: Request, res: Response) => {
  try {
    const result = await sessionService.joinSession(
      req.params.id,
      req.body.nickname,
      optionalUser(req)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'joinSession failed');
  }
};

// -----------------------------------------------------------------------------
// Authenticated endpoints
// -----------------------------------------------------------------------------

export const createSession = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    const data = await sessionService.createSession(
      {
        quizId: req.body.quizId,
        name: req.body.name,
        settings: req.body.settings,
      },
      user
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'createSession failed');
  }
};

export const updateSessionStatus = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    await sessionService.updateSessionStatus(
      req.params.id,
      {
        status: req.body.status,
        currentQuestionIndex: req.body.currentQuestionIndex,
      },
      user
    );
    res.json({ success: true, message: 'Session updated successfully' });
  } catch (error) {
    handleError(res, error, 'updateSessionStatus failed');
  }
};

export const getAllSessions = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const status = req.query.status as string | undefined;

    const { sessions, total } = await sessionService.listAllSessions(user, {
      page,
      limit,
      status,
    });

    res.json({
      success: true,
      data: (sessions as any[]).map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        mode: s.mode,
        currentQuestionIndex: s.current_question_index,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        createdAt: s.created_at,
        hostName: s.host_name,
        quiz: {
          id: s.quiz_id,
          title: s.quiz_title,
          questionsCount: s.questions_count || 0,
          timeLimit: s.time_limit_minutes,
        },
        participantsCount: parseInt(s.participants_count, 10) || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleError(res, error, 'getAllSessions failed');
  }
};

export const getActiveSessions = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    const sessions = await sessionService.listActiveSessions(user);
    res.json({
      success: true,
      data: (sessions as any[]).map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        currentQuestionIndex: s.current_question_index,
        startedAt: s.started_at,
        quiz: {
          id: s.quiz_id,
          title: s.quiz_title,
          questionsCount: s.questions_count || 0,
          timeLimit: s.time_limit_minutes,
        },
        participantsCount: parseInt(s.participants_count, 10) || 0,
      })),
    });
  } catch (error) {
    handleError(res, error, 'getActiveSessions failed');
  }
};

export const getMySessions = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    const sessions = await sessionService.listMySessions(user);
    res.json({
      success: true,
      data: (sessions as any[]).map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        currentQuestionIndex: s.current_question_index,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        quiz: {
          id: s.quiz_id,
          title: s.quiz_title,
          questionsCount: s.questions_count || 0,
          timeLimit: s.time_limit_minutes,
        },
        participantsCount: parseInt(s.participants_count, 10) || 0,
        isHost: true,
      })),
    });
  } catch (error) {
    handleError(res, error, 'getMySessions failed');
  }
};

export default {
  createSession,
  createPublicSession,
  getSession,
  updateSessionStatus,
  getCurrentQuestion,
  submitAnswer,
  getSessionResults,
  getAllSessions,
  getActiveSessions,
  getMySessions,
  joinSession,
};
