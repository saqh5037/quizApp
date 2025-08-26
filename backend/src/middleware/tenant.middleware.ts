import { Request, Response, NextFunction } from 'express';
import { Tenant } from '@models/index';
import jwt from 'jsonwebtoken';

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
    // Extract user from JWT token (should already be done by auth middleware)
    const user = (req as any).user;
    
    console.log('TenantMiddleware - User from token:', user);
    
    if (!user || !user.tenant_id) {
      // For public endpoints, we might not have a tenant
      if (req.path.startsWith('/public') || req.path.startsWith('/auth')) {
        return next();
      }
      
      console.log('TenantMiddleware - No tenant_id found. User:', user);
      
      return res.status(403).json({ 
        error: 'Tenant not identified',
        message: 'User must belong to a tenant to access this resource'
      });
    }
    
    // Attach tenant_id to request
    req.tenantId = user.tenant_id;
    req.userRole = user.role;
    
    // Load tenant details (optional, for branding/settings)
    try {
      const tenant = await Tenant.findByPk(user.tenant_id);
      console.log('TenantMiddleware - Looking for tenant ID:', user.tenant_id);
      console.log('TenantMiddleware - Tenant found:', tenant ? 'Yes' : 'No');
      
      // Use .get() to access Sequelize model properties properly
      const isActive = tenant ? tenant.get('is_active') : false;
      console.log('TenantMiddleware - Tenant is_active (using .get()):', isActive);
      console.log('TenantMiddleware - Tenant data:', tenant?.toJSON ? tenant.toJSON() : tenant);
      
      if (!tenant || !isActive) {
        return res.status(403).json({ 
          error: 'Tenant inactive',
          message: 'Your organization account is not active'
        });
      }
      req.tenant = tenant;
    } catch (error) {
      console.error('Error loading tenant:', error);
    }
    
    // Set tenant context for Sequelize hooks
    // This will be used by models to auto-filter queries
    if (req.app && req.app.locals) {
      req.app.locals.currentTenantId = user.tenant_id;
      req.app.locals.currentUserId = user.id;
      req.app.locals.currentUserRole = user.role;
    }
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ 
      error: 'Tenant isolation failed',
      message: 'Failed to establish tenant context'
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
        message: 'This action requires super admin privileges'
      });
    }
    
    // Verify tenant is internal (Dynamtek)
    const tenant = await Tenant.findByPk(user.tenant_id);
    if (!tenant || tenant.type !== 'internal') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'This action is restricted to internal users'
      });
    }
    
    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Failed to verify super admin privileges'
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
        message: 'This action requires admin privileges'
      });
    }
    
    next();
  } catch (error) {
    console.error('Tenant admin check error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Failed to verify admin privileges'
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
    
    console.log('InstructorOnly - User:', user);
    console.log('InstructorOnly - User role:', user?.role);
    console.log('InstructorOnly - Allowed roles:', allowedRoles);
    console.log('InstructorOnly - Role included?:', user?.role ? allowedRoles.includes(user.role) : false);
    
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'This action requires instructor privileges'
      });
    }
    
    next();
  } catch (error) {
    console.error('Instructor check error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Failed to verify instructor privileges'
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
    
    // Only super admins can perform cross-tenant operations
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Cross-tenant operations require super admin privileges'
      });
    }
    
    // Check if a specific tenant is requested
    const requestedTenantId = req.body.tenant_id || req.query.tenant_id || req.params.tenant_id;
    
    if (requestedTenantId) {
      // Verify the tenant exists and is active
      const tenant = await Tenant.findByPk(requestedTenantId);
      if (!tenant || !tenant.is_active) {
        return res.status(404).json({ 
          error: 'Tenant not found',
          message: 'The specified tenant does not exist or is inactive'
        });
      }
      
      // Override the tenant context
      req.tenantId = parseInt(requestedTenantId);
      req.tenant = tenant;
      
      if (req.app && req.app.locals) {
        req.app.locals.currentTenantId = parseInt(requestedTenantId);
      }
    }
    
    next();
  } catch (error) {
    console.error('Cross-tenant access error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Failed to establish cross-tenant context'
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
    userRole: req.userRole || req.app?.locals?.currentUserRole
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
          message: 'Missing required parameters'
        });
      }
      
      // Dynamically get the model
      const models = require('@models/index');
      const Model = models[modelName];
      
      if (!Model) {
        return res.status(500).json({ 
          error: 'Configuration error',
          message: 'Invalid model specified'
        });
      }
      
      // Check if the resource belongs to the current tenant
      const resource = await Model.findOne({
        where: {
          id: resourceId,
          tenant_id: tenantId
        }
      });
      
      if (!resource) {
        return res.status(404).json({ 
          error: 'Resource not found',
          message: 'The requested resource does not exist or you do not have access to it'
        });
      }
      
      // Attach the resource to the request for use in the controller
      (req as any).resource = resource;
      
      next();
    } catch (error) {
      console.error('Tenant ownership validation error:', error);
      res.status(500).json({ 
        error: 'Validation failed',
        message: 'Failed to validate resource ownership'
      });
    }
  };
};