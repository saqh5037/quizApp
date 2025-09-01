import { Router } from 'express';
import TenantController from '@controllers/tenant.controller';
import { simpleAuth } from '@middleware/auth.simple.middleware';
import { 
  tenantMiddleware, 
  superAdminOnly, 
  tenantAdminOnly 
} from '@middleware/tenant.middleware';

const router = Router();

// All routes require authentication
router.use(simpleAuth);

// Public tenant routes (for authenticated users)
router.get('/dashboard', tenantMiddleware, TenantController.getTenantDashboard);
router.get('/current', tenantMiddleware, (req, res) => {
  TenantController.getTenant({ ...req, params: { id: req.tenantId } } as any, res);
});
router.put('/current', tenantMiddleware, tenantAdminOnly, (req, res) => {
  TenantController.updateTenant({ ...req, params: { id: req.tenantId } } as any, res);
});

// Super admin only routes (NO tenant middleware needed for creation)
router.get('/', superAdminOnly, TenantController.getAllTenants);
router.post('/', superAdminOnly, TenantController.createTenant);
router.delete('/:id', superAdminOnly, TenantController.deleteTenant);

// Admin routes (these need tenant context)
// Get single tenant (own tenant or super admin can see others)
router.get('/:id', tenantMiddleware, TenantController.getTenant);

// Update tenant (own tenant admin or super admin)
router.put('/:id', tenantMiddleware, tenantAdminOnly, TenantController.updateTenant);

export default router;