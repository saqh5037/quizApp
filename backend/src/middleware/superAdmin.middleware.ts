import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import AuditLog from '../models/AuditLog.model';

export interface SuperAdminRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    tenant_id: number;
    impersonated_by?: number;
  };
}

// Middleware to check if user is a super admin
export const superAdminOnly = async (
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has super_admin role
    if (req.user.role !== 'super_admin') {
      // Log unauthorized access attempt
      await AuditLog.create({
        action: 'UNAUTHORIZED_ADMIN_ACCESS',
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        entity_type: 'Admin',
        metadata: {
          attempted_endpoint: req.originalUrl,
          method: req.method,
          role: req.user.role
        },
        ip_address: req.ip || req.connection.remoteAddress || '',
        user_agent: req.get('User-Agent') || ''
      });

      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    // Check if user is impersonating (impersonation not allowed for admin actions)
    if (req.user.impersonated_by) {
      return res.status(403).json({
        success: false,
        error: 'Admin actions not allowed while impersonating'
      });
    }

    // Verify user still exists and is active
    const user = await User.findByPk(req.user.id);
    
    // Access dataValues directly due to Sequelize field shadowing issue
    const isActive = user?.dataValues?.isActive ?? user?.isActive;
    
    if (!user || !isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account inactive or not found'
      });
    }

    // All checks passed
    next();
  } catch (error) {
    console.error('Super admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

// Middleware to check if user is a tenant admin or super admin
export const tenantAdminOnly = async (
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin role
    if (!['super_admin', 'tenant_admin', 'admin'].includes(req.user.role)) {
      // Log unauthorized access attempt
      await AuditLog.create({
        action: 'UNAUTHORIZED_TENANT_ADMIN_ACCESS',
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        entity_type: 'Admin',
        metadata: {
          attempted_endpoint: req.originalUrl,
          method: req.method,
          role: req.user.role
        },
        ip_address: req.ip || req.connection.remoteAddress || '',
        user_agent: req.get('User-Agent') || ''
      });

      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // For tenant admins, ensure they can only access their own tenant's data
    if (req.user.role === 'tenant_admin' && req.query.tenant_id) {
      if (parseInt(req.query.tenant_id as string) !== req.user.tenant_id) {
        return res.status(403).json({
          success: false,
          error: 'Cannot access other tenant data'
        });
      }
    }

    // Verify user still exists and is active
    const user = await User.findByPk(req.user.id);
    
    // Access dataValues directly due to Sequelize field shadowing issue
    const isActive = user?.dataValues?.isActive ?? user?.isActive;
    
    if (!user || !isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account inactive or not found'
      });
    }

    next();
  } catch (error) {
    console.error('Tenant admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

// Middleware to verify admin token (extends regular auth)
export const verifyAdminToken = async (
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Check if it's an admin token
    if (!['super_admin', 'tenant_admin', 'admin'].includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid admin token'
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenant_id: decoded.tenant_id,
      impersonated_by: decoded.impersonated_by
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    console.error('Admin token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
};

// Middleware to log admin actions
export const logAdminAction = (action: string) => {
  return async (req: SuperAdminRequest, res: Response, next: NextFunction) => {
    try {
      // Log the action
      await AuditLog.create({
        action,
        user_id: req.user?.id,
        tenant_id: req.user?.tenant_id,
        entity_type: 'Admin',
        metadata: {
          endpoint: req.originalUrl,
          method: req.method,
          body: req.body,
          params: req.params,
          query: req.query
        },
        ip_address: req.ip || req.connection.remoteAddress || '',
        user_agent: req.get('User-Agent') || ''
      });

      next();
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Continue even if logging fails
      next();
    }
  };
};

export default {
  superAdminOnly,
  tenantAdminOnly,
  verifyAdminToken,
  logAdminAction
};