import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.utils';
import { AuthenticationError, AuthorizationError } from '../utils/errorHandler';
import { User } from '../models';
import { UserRole } from '../config/constants';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      currentUser?: User;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('No authorization header provided');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const payload = verifyAccessToken(token);
    
    // Optionally load full user data
    // console.log('Looking for user with ID:', payload.id);
    const user = await User.findByPk(payload.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'tenant_id', 'isActive', 'isVerified']
    });
    console.log('User found:', user ? `${user.email} (active: ${user.get('isActive')})` : 'null');
    
    if (!user || !user.get('isActive')) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Update payload with tenant_id from database if not in token
    req.user = {
      ...payload,
      tenant_id: payload.tenant_id || user.get('tenant_id')
    };
    req.currentUser = user;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new AuthenticationError('Invalid or expired token'));
    }
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return next();
    }

    try {
      const payload = verifyAccessToken(token);
      req.user = payload;

      const user = await User.findByPk(payload.id);
      if (user && user.get('isActive')) {
        req.currentUser = user;
      }
    } catch {
      // Token is invalid, but we continue anyway (optional auth)
    }

    next();
  } catch (error) {
    next(error);
  }
};