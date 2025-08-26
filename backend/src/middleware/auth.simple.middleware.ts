import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const simpleAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Default user for development
    const defaultUser = { 
      id: 2, 
      email: 'admin@aristotest.com', 
      role: 'admin', 
      tenant_id: 1 
    };
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Continue without auth for now - use admin for testing with tenant_id
      console.log('SimpleAuth: No auth header, using default user');
      (req as any).user = defaultUser;
      return next();
    }

    const token = authHeader.substring(7);
    
    // If token is empty or just "undefined" string, use default
    if (!token || token === 'undefined' || token === 'null') {
      console.log('SimpleAuth: Invalid token, using default user');
      (req as any).user = defaultUser;
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key') as any;
      // Ensure tenant_id is always set
      if (!decoded.tenant_id) {
        decoded.tenant_id = 1;
      }
      (req as any).user = decoded;
      next();
    } catch (err) {
      // Use default admin user if token is invalid with tenant_id
      console.log('SimpleAuth: JWT verification failed, using default user');
      (req as any).user = defaultUser;
      next();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};