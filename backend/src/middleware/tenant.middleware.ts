import { Request, Response, NextFunction } from 'express';
import { Tenant } from '@models/index';
import logger from '../utils/logger';

// Extend Request type to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      tenant?: any;
      userRole?: string;
    }
  }
}

/**
 * Middleware to enforce tenant isolation
 * Automatically filters all database queries by tenant_id
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user || !user.tenant_id) {
      // Public endpoints are allowed through without a tenant
      if (req.path.startsWith('/public') || req.path.startsWith('/auth')) {
        return next();
      }

      return res.status(403).json({
        error: 'Tenant not identified',
        message: 'User must belong to a tenant to access this resource',
      });
    }

    req.tenantId = user.tenant_id;
    req.userRole = user.role;

    try {
      const tenant = await Tenant.findByPk(user.tenant_id);
      const isActive = tenant ? tenant.get('is_active') : false;

      if (!tenant || !isActive) {
        return res.status(403).json({
          error: 'Tenant inactive',
          message: 'Your organization account is not active',
        });
      }
      req.tenant = tenant;
    } catch (error) {
      logger.error('Error loading tenant', { error, tenantId: user.tenant_id });
    }

    if (req.app && req.app.locals) {
      req.app.locals.currentTenantId = user.tenant_id;
      req.app.locals.currentUserId = user.id;
      req.app.locals.currentUserRole = user.role;
    }

    next();
  } catch (error) {
    logger.error('Tenant middleware error', { error });
    res.status(500).json({
      error: 'Tenant isolation failed',
      message: 'Failed to establish tenant context',
    });
  }
};

/**
 * Middleware to check if user is a Super Admin (Dynamtek internal)
 */
export const superAdminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This action requires super admin privileges',
      });
    }

    const tenant = await Tenant.findByPk(user.tenant_id);

    if (!tenant || tenant.get('type') !== 'internal') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This action is restricted to internal users',
      });
    }

    next();
  } catch (error) {
    logger.error('Super admin check error', { error });
    res.status(500).json({
      error: 'Authorization failed',
      message: 'Failed to verify super admin privileges',
    });
  }
};

/**
 * Middleware to check if user is at least a Tenant Admin
 */
export const tenantAdminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const allowedRoles = ['super_admin', 'tenant_admin', 'admin'];

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This action requires admin privileges',
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant admin check error', { error });
    res.status(500).json({
      error: 'Authorization failed',
      message: 'Failed to verify admin privileges',
    });
  }
};

/**
 * Middleware to check if user is at least an Instructor
 */
export const instructorOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const allowedRoles = ['super_admin', 'tenant_admin', 'admin', 'instructor', 'teacher'];

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This action requires instructor privileges',
      });
    }

    next();
  } catch (error) {
    logger.error('Instructor check error', { error });
    res.status(500).json({
      error: 'Authorization failed',
      message: 'Failed to verify instructor privileges',
    });
  }
};

/**
 * Middleware for cross-tenant operations (Super Admin only)
 * Allows specifying a different tenant_id in the request
 */
export const crossTenantAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cross-tenant operations require super admin privileges',
      });
    }

    const requestedTenantId = req.body.tenant_id || req.query.tenant_id || req.params.tenant_id;

    if (requestedTenantId) {
      const tenant = await Tenant.findByPk(requestedTenantId);
      if (!tenant || !tenant.get('is_active')) {
        return res.status(404).json({
          error: 'Tenant not found',
          message: 'The specified tenant does not exist or is inactive',
        });
      }

      req.tenantId = parseInt(requestedTenantId);
      req.tenant = tenant;

      if (req.app && req.app.locals) {
        req.app.locals.currentTenantId = parseInt(requestedTenantId);
      }
    }

    next();
  } catch (error) {
    logger.error('Cross-tenant access error', { error });
    res.status(500).json({
      error: 'Authorization failed',
      message: 'Failed to establish cross-tenant context',
    });
  }
};

/**
 * Helper function to get tenant context from request
 */
export const getTenantContext = (req: Request): {
  tenantId: number | undefined;
  userId: number | undefined;
  userRole: string | undefined;
} => {
  return {
    tenantId: req.tenantId || req.app?.locals?.currentTenantId,
    userId: (req as any).user?.id || req.app?.locals?.currentUserId,
    userRole: req.userRole || req.app?.locals?.currentUserRole,
  };
};

/**
 * Middleware to validate tenant ownership of a resource
 * Use this when accessing specific resources by ID
 */
export const validateTenantOwnership = (modelName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getTenantContext(req);
      const resourceId = req.params.id;

      if (!tenantId || !resourceId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Missing required parameters',
        });
      }

      const models = require('@models/index');
      const Model = models[modelName];

      if (!Model) {
        return res.status(500).json({
          error: 'Configuration error',
          message: 'Invalid model specified',
        });
      }

      const resource = await Model.findOne({
        where: {
          id: resourceId,
          tenant_id: tenantId,
        },
      });

      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found',
          message: 'The requested resource does not exist or you do not have access to it',
        });
      }

      (req as any).resource = resource;

      next();
    } catch (error) {
      logger.error('Tenant ownership validation error', { error });
      res.status(500).json({
        error: 'Validation failed',
        message: 'Failed to validate resource ownership',
      });
    }
  };
};
