/**
 * analytics.controller.ts — thin HTTP adapter for /api/v1/analytics endpoints.
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';
import * as analyticsService from '../services/analytics.service';
import { AnalyticsServiceError } from '../services/analytics.service';

const requireUser = (req: Request): analyticsService.UserContext | null => {
  const u = (req as any).user;
  if (!u || !u.id || !u.tenant_id) return null;
  return { id: u.id, tenant_id: u.tenant_id, role: u.role };
};

const handleError = (res: Response, error: unknown, logContext: string): void => {
  if (error instanceof AnalyticsServiceError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }
  logger.error(logContext, { error });
  res.status(500).json({ success: false, error: 'Internal server error' });
};

export const getQuizAnalytics = async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const quizId = parseInt(req.params.quizId, 10);
    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ success: false, error: 'Invalid quiz id' });
    }
    const report = await analyticsService.getQuizAnalytics(quizId, user);
    res.json({ success: true, data: report });
  } catch (error) {
    handleError(res, error, 'getQuizAnalytics failed');
  }
};
