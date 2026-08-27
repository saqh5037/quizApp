import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

/**
 * Lightweight auth middleware. Verifies a real JWT and attaches the decoded
 * payload to req.user. No default-user fallback — missing/invalid tokens are
 * rejected with 401. This middleware is kept as a drop-in replacement for
 * routes that still use it; new routes should use `authenticate` from
 * auth.middleware.ts which also loads the full User row.
 */
export const simpleAuth = (req: Request, res: Response, next: NextFunction) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('JWT_SECRET is not configured');
    return res.status(500).json({
      success: false,
      error: 'Server misconfiguration',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded || typeof decoded !== 'object' || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
      });
    }

    // Tenant is mandatory for every authenticated request — no silent default.
    if (!decoded.tenant_id) {
      return res.status(403).json({
        success: false,
        error: 'Token does not contain a tenant context',
      });
    }

    (req as any).user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};
