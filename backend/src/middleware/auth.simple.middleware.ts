import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const simpleAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Continue without auth for now
      (req as any).user = { id: 2, email: 'teacher@demo.com', role: 'teacher' };
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key') as any;
      (req as any).user = decoded;
      next();
    } catch (err) {
      // Use default user if token is invalid
      (req as any).user = { id: 2, email: 'teacher@demo.com', role: 'teacher' };
      next();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};