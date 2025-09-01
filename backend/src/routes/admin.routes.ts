import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import { superAdminOnly, tenantAdminOnly, verifyAdminToken } from '../middleware/superAdmin.middleware';
import TenantAdminController from '../controllers/admin/tenant.admin.controller';
import UserAdminController from '../controllers/admin/user.admin.controller';
import ClassroomAdminController from '../controllers/admin/classroom.admin.controller';
import DashboardAdminController from '../controllers/admin/dashboard.admin.controller';

const router = Router();

// All admin routes require authentication
router.use(simpleAuth);

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

// ================== DASHBOARD ROUTES ==================
// Dashboard routes (available to tenant admins and super admins)
router.get('/dashboard/overview', 
  tenantAdminOnly,
  DashboardAdminController.getOverview
);

router.get('/dashboard/tenant-metrics',
  tenantAdminOnly,
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  handleValidationErrors,
  DashboardAdminController.getTenantMetrics
);

router.get('/dashboard/usage-trends',
  tenantAdminOnly,
  query('period').optional().isIn(['7d', '30d', '90d']),
  query('tenant_id').optional().isInt(),
  handleValidationErrors,
  DashboardAdminController.getUsageTrends
);

router.get('/dashboard/system-health',
  superAdminOnly,
  DashboardAdminController.getSystemHealth
);

router.get('/dashboard/recent-activity',
  tenantAdminOnly,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('tenant_id').optional().isInt(),
  query('user_id').optional().isInt(),
  handleValidationErrors,
  DashboardAdminController.getRecentActivity
);

router.get('/dashboard/alerts',
  superAdminOnly,
  DashboardAdminController.getAlerts
);

// ================== TENANT ROUTES ==================
// Tenant management (super admin only)
router.get('/tenants',
  superAdminOnly,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('status').optional().isIn(['active', 'inactive']),
  query('plan').optional().isIn(['free', 'basic', 'premium', 'enterprise']),
  handleValidationErrors,
  TenantAdminController.getAllTenants
);

router.get('/tenants/:id',
  superAdminOnly,
  param('id').isInt(),
  handleValidationErrors,
  TenantAdminController.getTenantById
);

router.post('/tenants',
  superAdminOnly,
  body('name').notEmpty().isString(),
  body('subdomain').notEmpty().isString().matches(/^[a-z0-9-]+$/),
  body('owner_email').notEmpty().isEmail(),
  body('owner_password').notEmpty().isString().isLength({ min: 6 }),
  body('owner_first_name').notEmpty().isString(),
  body('owner_last_name').optional().isString(),
  body('subscription_plan').optional().isIn(['free', 'basic', 'premium', 'enterprise']),
  body('subscription_expires_at').optional().isISO8601(),
  body('settings').optional().isObject(),
  handleValidationErrors,
  TenantAdminController.createTenant
);

router.put('/tenants/:id',
  superAdminOnly,
  param('id').isInt(),
  body('name').optional().isString(),
  body('subdomain').optional().isString().matches(/^[a-z0-9-]*$/),
  body('domain').optional().isString(),
  body('subscription_plan').optional().isIn(['free', 'basic', 'premium', 'enterprise']),
  body('subscription_expires_at').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) {
      return true;
    }
    // If value is provided, must be valid ISO8601
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Must be a valid date');
    }
    return true;
  }),
  body('settings').optional().isObject(),
  body('branding').optional().isObject(),
  body('branding.primaryColor').optional().isString(),
  body('branding.secondaryColor').optional().isString(),
  body('type').optional().isIn(['internal', 'client', 'partner']),
  body('is_active').optional().isBoolean(),
  handleValidationErrors,
  TenantAdminController.updateTenant
);

router.delete('/tenants/:id',
  superAdminOnly,
  param('id').isInt(),
  body('delete_data').optional().isBoolean(),
  handleValidationErrors,
  TenantAdminController.deleteTenant
);

// TODO: Implement these methods in TenantAdminController
// router.post('/tenants/:id/activate',
//   superAdminOnly,
//   param('id').isInt(),
//   handleValidationErrors,
//   TenantAdminController.activateTenant
// );

// router.post('/tenants/:id/deactivate',
//   superAdminOnly,
//   param('id').isInt(),
//   body('reason').optional().isString(),
//   handleValidationErrors,
//   TenantAdminController.deactivateTenant
// );

router.get('/tenants/:id/stats',
  superAdminOnly,
  param('id').isInt(),
  handleValidationErrors,
  TenantAdminController.getTenantStats
);

router.get('/tenants/:id/users',
  superAdminOnly,
  param('id').isInt(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  TenantAdminController.getTenantUsers
);

router.post('/tenants/:id/users',
  superAdminOnly,
  param('id').isInt(),
  body('email').notEmpty().isEmail(),
  body('first_name').notEmpty().isString(),
  body('last_name').optional().isString(),
  body('password').notEmpty().isString().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'teacher', 'student']),
  body('send_invite').optional().isBoolean(),
  handleValidationErrors,
  TenantAdminController.addUserToTenant
);

router.put('/tenants/:id/users/:userId',
  superAdminOnly,
  param('id').isInt(),
  param('userId').isInt(),
  body('email').optional().isEmail(),
  body('first_name').optional().isString(),
  body('last_name').optional().isString(),
  body('role').optional().isIn(['admin', 'teacher', 'student']),
  body('is_active').optional().isBoolean(),
  body('is_verified').optional().isBoolean(),
  handleValidationErrors,
  TenantAdminController.updateTenantUser
);

router.delete('/tenants/:id/users/:userId',
  superAdminOnly,
  param('id').isInt(),
  param('userId').isInt(),
  body('permanent').optional().isBoolean(),
  handleValidationErrors,
  TenantAdminController.removeTenantUser
);

router.post('/tenants/:id/users/:userId/reactivate',
  superAdminOnly,
  param('id').isInt(),
  param('userId').isInt(),
  handleValidationErrors,
  TenantAdminController.reactivateTenantUser
);

// ================== USER ROUTES ==================
// User management (super admin for all users, tenant admin for own tenant)
router.get('/users',
  tenantAdminOnly,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('tenant_id').optional().isInt(),
  query('role').optional().isIn(['super_admin', 'tenant_admin', 'admin', 'instructor', 'student']),
  query('status').optional().isIn(['active', 'inactive']),
  handleValidationErrors,
  UserAdminController.getAllUsers
);

router.get('/users/:id',
  tenantAdminOnly,
  param('id').isInt(),
  handleValidationErrors,
  UserAdminController.getUserById
);

router.post('/users',
  tenantAdminOnly,
  body('email').notEmpty().isEmail(),
  body('password').notEmpty().isString().isLength({ min: 6 }),
  body('first_name').notEmpty().isString(),
  body('last_name').optional().isString(),
  body('role').optional().isIn(['tenant_admin', 'admin', 'instructor', 'student']),
  body('tenant_id').notEmpty().isInt(),
  body('send_welcome_email').optional().isBoolean(),
  handleValidationErrors,
  UserAdminController.createUser
);

router.put('/users/:id',
  tenantAdminOnly,
  param('id').isInt(),
  body('email').optional().isEmail(),
  body('password').optional().isString().isLength({ min: 6 }),
  body('first_name').optional().isString(),
  body('last_name').optional().isString(),
  body('role').optional().isIn(['tenant_admin', 'admin', 'instructor', 'student']),
  body('tenant_id').optional().isInt(),
  body('is_active').optional().isBoolean(),
  body('is_verified').optional().isBoolean(),
  handleValidationErrors,
  UserAdminController.updateUser
);

router.delete('/users/:id',
  tenantAdminOnly,
  param('id').isInt(),
  body('transfer_to').optional().isInt(),
  handleValidationErrors,
  UserAdminController.deleteUser
);

router.post('/users/:id/reset-password',
  tenantAdminOnly,
  param('id').isInt(),
  body('new_password').optional().isString().isLength({ min: 6 }),
  body('send_email').optional().isBoolean(),
  handleValidationErrors,
  UserAdminController.resetUserPassword
);

router.post('/users/:id/impersonate',
  superAdminOnly,
  param('id').isInt(),
  handleValidationErrors,
  UserAdminController.impersonateUser
);

// ================== CLASSROOM ROUTES ==================
// Classroom management
router.get('/classrooms',
  tenantAdminOnly,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('tenant_id').optional().isInt(),
  query('instructor_id').optional().isInt(),
  query('status').optional().isIn(['active', 'inactive']),
  handleValidationErrors,
  ClassroomAdminController.getAllClassrooms
);

router.get('/classrooms/stats',
  tenantAdminOnly,
  query('tenant_id').optional().isInt(),
  handleValidationErrors,
  ClassroomAdminController.getClassroomStats
);

router.get('/classrooms/:id',
  tenantAdminOnly,
  param('id').isInt(),
  handleValidationErrors,
  ClassroomAdminController.getClassroomById
);

router.post('/classrooms',
  tenantAdminOnly,
  body('name').notEmpty().isString(),
  body('description').optional().isString(),
  body('instructor_id').notEmpty().isInt(),
  body('tenant_id').notEmpty().isInt(),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('max_students').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
  body('allow_self_enrollment').optional().isBoolean(),
  handleValidationErrors,
  ClassroomAdminController.createClassroom
);

router.put('/classrooms/:id',
  tenantAdminOnly,
  param('id').isInt(),
  body('name').optional().isString(),
  body('description').optional().isString(),
  body('instructor_id').optional().isInt(),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('max_students').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
  body('allow_self_enrollment').optional().isBoolean(),
  body('settings').optional().isObject(),
  handleValidationErrors,
  ClassroomAdminController.updateClassroom
);

router.delete('/classrooms/:id',
  tenantAdminOnly,
  param('id').isInt(),
  body('force').optional().isBoolean(),
  handleValidationErrors,
  ClassroomAdminController.deleteClassroom
);

router.post('/classrooms/:id/enroll',
  tenantAdminOnly,
  param('id').isInt(),
  body('student_id').notEmpty().isInt(),
  handleValidationErrors,
  ClassroomAdminController.enrollStudent
);

router.delete('/classrooms/:id/enroll/:studentId',
  tenantAdminOnly,
  param('id').isInt(),
  param('studentId').isInt(),
  handleValidationErrors,
  ClassroomAdminController.unenrollStudent
);

export default router;